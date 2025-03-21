import csv
import json
import io
import logging
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError
# Removed duplicate import

from .models import ScrapedData, ScrapingSchedule, ScrapingProxy
from .serializers import (
    ScrapedDataSerializer, 
    ScrapingScheduleSerializer, 
    ScrapingProxySerializer,
    ScrapeRequestSerializer
)
from .tasks import scrape_url_task, schedule_scraping_task
from .services.scraper_utility import ScraperUtility

# Initialize the scraper utility
scraper_utility = ScraperUtility()

# Set up logging
logger = logging.getLogger(__name__)

class ScrapedDataViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing scraped data.
    """
    queryset = ScrapedData.objects.all().order_by('-timestamp')
    serializer_class = ScrapedDataSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['data_type', 'status', 'selenium_used']
    
    def get_queryset(self):
        """
        Customize queryset with additional filters from query parameters.
        """
        queryset = super().get_queryset()
        
        # Filter by URL
        url_filter = self.request.query_params.get('url', None)
        if url_filter:
            queryset = queryset.filter(url__icontains=url_filter)
        
        # Filter by keywords
        keywords_filter = self.request.query_params.get('keywords', None)
        if keywords_filter:
            queryset = queryset.filter(keywords__icontains=keywords_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        # Search in content
        content_search = self.request.query_params.get('content_search', None)
        if content_search:
            # This is a simple JSON field search, might need optimization for production
            search_terms = content_search.split()
            q_objects = Q()
            
            for term in search_terms:
                # Create JSON containment queries for each term
                q_objects |= Q(content__icontains=term)
            
            queryset = queryset.filter(q_objects)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def health(self, request):
        """
        Simple health check endpoint to verify API connectivity.
        """
        return Response({
            'status': 'online',
            'timestamp': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['post'])
    def scrape_now(self, request):
        """
        Initiate an immediate scrape operation.
        """
        serializer = ScrapeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        url = validated_data.get('url')
        
        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract parameters for the scraping task
        keywords = validated_data.get('keywords', '')
        data_type = validated_data.get('data_type', 'general')
        use_selenium = validated_data.get('use_selenium')
        custom_headers = validated_data.get('custom_headers')
        timeout = validated_data.get('timeout', 30)
        proxy_id = validated_data.get('proxy_id')
        
        # Auto-detect if Selenium should be used
        if use_selenium is None:
            method = scraper_utility.detect_scraper_type(url)
            use_selenium = method == 'selenium'
        
        # Queue the task
        task = scrape_url_task.delay(
            url=url,
            keywords=keywords,
            data_type=data_type,
            use_selenium=use_selenium,
            custom_headers=custom_headers,
            timeout=timeout,
            proxy_id=proxy_id
        )
        
        return Response({
            'status': 'queued',
            'task_id': task.id,
            'message': f'Scraping task queued for {url}',
            'url': url,
            'data_type': data_type,
            'use_selenium': use_selenium
        })
    
    @action(detail=False, methods=['post'])
    def schedule(self, request):
        """
        Schedule a recurring scrape operation.
        """
        url = request.data.get('url')
        keywords = request.data.get('keywords', '')
        data_type = request.data.get('data_type', 'general')
        schedule_type = request.data.get('schedule_type', 'daily')
        name = request.data.get('name')
        use_selenium = request.data.get('use_selenium')
        custom_headers = request.data.get('custom_headers')
        timeout = request.data.get('timeout', 30)
        
        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate schedule type
        valid_schedule_types = ['hourly', 'daily', 'weekly', 'monthly', 'custom']
        if schedule_type not in valid_schedule_types:
            return Response(
                {'error': f'Invalid schedule_type. Must be one of: {", ".join(valid_schedule_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Auto-detect if Selenium should be used
        if use_selenium is None:
            method = scraper_utility.detect_scraper_type(url)
            use_selenium = method == 'selenium'
        
        # Create the schedule
        try:
            schedule = schedule_scraping_task(
                url=url,
                keywords=keywords,
                data_type=data_type,
                schedule_type=schedule_type,
                name=name,
                use_selenium=use_selenium,
                custom_headers=custom_headers,
                timeout=timeout
            )
            
            return Response({
                'status': 'scheduled',
                'schedule_id': schedule.id,
                'message': f'Scraping task scheduled for {url} ({schedule_type})',
                'url': url,
                'schedule_type': schedule_type,
                'next_run': schedule.next_run.isoformat() if schedule.next_run else None
            })
            
        except (ValidationError, Exception) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def download_csv(self, request):
        """
        Download scraped data as CSV.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Create CSV file
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="scraped_data.csv"'
        
        writer = csv.writer(response)
        
        # Write header row
        writer.writerow([
            'ID', 'URL', 'Data Type', 'Keywords', 'Status', 
            'Timestamp', 'Content', 'Processing Time'
        ])
        
        # Write data rows
        for item in queryset:
            writer.writerow([
                item.id,
                item.url,
                item.data_type,
                item.keywords,
                item.status,
                item.timestamp.isoformat() if item.timestamp else '',
                json.dumps(item.content),
                item.processing_time
            ])
        
        return response
    
    @action(detail=False, methods=['get'])
    def download_json(self, request):
        """
        Download scraped data as JSON.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Create JSON file
        data = []
        for item in queryset:
            data.append({
                'id': item.id,
                'url': item.url,
                'data_type': item.data_type,
                'keywords': item.keywords,
                'status': item.status,
                'timestamp': item.timestamp.isoformat() if item.timestamp else None,
                'content': item.content,
                'processing_time': item.processing_time
            })
        
        response = HttpResponse(json.dumps(data, indent=2), content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="scraped_data.json"'
        
        return response
    
    @action(detail=True, methods=['get'])
    def analyze_sentiment(self, request, pk=None):
        """
        Analyze sentiment of review content.
        """
        try:
            scraped_data = self.get_object()
            
            # Check if this is review data
            if scraped_data.data_type != 'review':
                return Response(
                    {'error': 'Sentiment analysis is only available for review data'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Basic sentiment analysis
            # Note: In a real implementation, you might use a more sophisticated
            # approach like NLTK, TextBlob, or a dedicated ML model
            
            reviews = scraped_data.content.get('reviews', [])
            sentiment_scores = []
            
            # Positive and negative keyword lists
            positive_keywords = [
                'good', 'great', 'excellent', 'awesome', 'amazing', 'love', 'best',
                'perfect', 'fantastic', 'wonderful', 'happy', 'pleased', 'satisfied',
                'recommend', 'positive', 'superb', 'outstanding', 'exceptional'
            ]
            
            negative_keywords = [
                'bad', 'poor', 'terrible', 'awful', 'horrible', 'hate', 'worst',
                'disappointing', 'disappointed', 'useless', 'broken', 'waste',
                'expensive', 'negative', 'complaint', 'problem', 'issue', 'defective'
            ]
            
            for review in reviews:
                review_text = review.get('text', '').lower()
                if not review_text:
                    continue
                    
                # Count positive and negative words
                positive_count = sum(1 for word in positive_keywords if word in review_text)
                negative_count = sum(1 for word in negative_keywords if word in review_text)
                
                # Calculate basic sentiment score (-1 to 1)
                total_count = positive_count + negative_count
                if total_count == 0:
                    score = 0  # Neutral
                else:
                    score = (positive_count - negative_count) / total_count
                
                sentiment_scores.append({
                    'review_id': review.get('review_id', ''),
                    'sentiment_score': score,
                    'sentiment_label': 'positive' if score > 0.2 else ('negative' if score < -0.2 else 'neutral'),
                    'positive_count': positive_count,
                    'negative_count': negative_count
                })
            
            # Calculate overall sentiment
            if sentiment_scores:
                avg_sentiment = sum(item['sentiment_score'] for item in sentiment_scores) / len(sentiment_scores)
                positive_reviews = sum(1 for item in sentiment_scores if item['sentiment_label'] == 'positive')
                negative_reviews = sum(1 for item in sentiment_scores if item['sentiment_label'] == 'negative')
                neutral_reviews = sum(1 for item in sentiment_scores if item['sentiment_label'] == 'neutral')
            else:
                avg_sentiment = 0
                positive_reviews = 0
                negative_reviews = 0
                neutral_reviews = 0
            
            # Prepare the response
            result = {
                'id': scraped_data.id,
                'url': scraped_data.url,
                'overall_sentiment': avg_sentiment,
                'overall_label': 'positive' if avg_sentiment > 0.2 else ('negative' if avg_sentiment < -0.2 else 'neutral'),
                'positive_reviews': positive_reviews,
                'negative_reviews': negative_reviews,
                'neutral_reviews': neutral_reviews,
                'total_reviews': len(sentiment_scores),
                'sentiment_breakdown': {
                    'positive_percentage': (positive_reviews / len(sentiment_scores) * 100) if sentiment_scores else 0,
                    'negative_percentage': (negative_reviews / len(sentiment_scores) * 100) if sentiment_scores else 0,
                    'neutral_percentage': (neutral_reviews / len(sentiment_scores) * 100) if sentiment_scores else 0
                },
                'review_sentiments': sentiment_scores
            }
            
            return Response(result)
            
        except ScrapedData.DoesNotExist:
            return Response(
                {'error': 'Scraped data not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ScrapingScheduleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing scraping schedules.
    """
    queryset = ScrapingSchedule.objects.all().order_by('-created_at')
    serializer_class = ScrapingScheduleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['frequency', 'is_active', 'data_type']
    
    def get_queryset(self):
        """
        Customize queryset with additional filters from query parameters.
        """
        queryset = super().get_queryset()
        
        # Filter by URL
        url_filter = self.request.query_params.get('url', None)
        if url_filter:
            queryset = queryset.filter(url__icontains=url_filter)
        
        # Filter by name
        name_filter = self.request.query_params.get('name', None)
        if name_filter:
            queryset = queryset.filter(name__icontains=name_filter)
        
        # Filter by keywords
        keywords_filter = self.request.query_params.get('keywords', None)
        if keywords_filter:
            queryset = queryset.filter(keywords__icontains=keywords_filter)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """
        Trigger immediate execution of a scheduled scraping task.
        """
        try:
            schedule = self.get_object()
            
            # Queue the task
            task = scrape_url_task.delay(
                url=schedule.url,
                keywords=schedule.keywords,
                data_type=schedule.data_type,
                use_selenium=schedule.use_selenium,
                custom_headers=schedule.custom_headers,
                timeout=schedule.timeout,
                schedule_id=schedule.id
            )
            
            # Update the last run time
            schedule.last_run = timezone.now()
            schedule.save(update_fields=['last_run'])
            
            return Response({
                'status': 'queued',
                'task_id': task.id,
                'message': f'Scheduled scraping task queued for immediate execution: {schedule.name}',
                'url': schedule.url
            })
            
        except ScrapingSchedule.DoesNotExist:
            return Response(
                {'error': 'Scraping schedule not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle the active status of a scraping schedule.
        """
        try:
            schedule = self.get_object()
            
            # Toggle active status
            schedule.is_active = not schedule.is_active
            
            # If activating, ensure next_run is set
            if schedule.is_active and not schedule.next_run:
                schedule.calculate_next_run()
                
            schedule.save()
            
            return Response({
                'status': 'success',
                'is_active': schedule.is_active,
                'message': f'Schedule {schedule.name} {"activated" if schedule.is_active else "deactivated"}',
                'next_run': schedule.next_run.isoformat() if schedule.next_run else None
            })
            
        except ScrapingSchedule.DoesNotExist:
            return Response(
                {'error': 'Scraping schedule not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ScrapingProxyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing scraping proxies.
    """
    queryset = ScrapingProxy.objects.all().order_by('-success_count')
    serializer_class = ScrapingProxySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'proxy_type', 'country']
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """
        Test if a proxy connection works properly.
        """
        try:
            proxy = self.get_object()
            
            # Set up proxy for testing
            proxies = proxy.get_formatted_proxy()
            
            try:
                # Make a test request to check if proxy works
                test_url = "https://httpbin.org/ip"
                
                response = requests.get(
                    test_url, 
                    proxies=proxies, 
                    timeout=10,
                    headers={'User-Agent': scraper_utility.get_next_user_agent()}
                )
                
                if response.status_code == 200:
                    # Update proxy statistics
                    proxy.success_count += 1
                    proxy.last_used = timezone.now()
                    
                    # Try to get the proxy IP from response
                    try:
                        response_data = response.json()
                        apparent_ip = response_data.get('origin', 'Unknown')
                    except json.JSONDecodeError:
                        apparent_ip = 'Unknown'
                        
                    proxy.save()
                    
                    return Response({
                        'status': 'success',
                        'message': 'Proxy connection successful',
                        'response_code': response.status_code,
                        'apparent_ip': apparent_ip
                    })
                else:
                    # Update proxy statistics
                    proxy.failure_count += 1
                    proxy.save()
                    
                    return Response({
                        'status': 'error',
                        'message': f'Proxy connection failed with status {response.status_code}',
                        'response_code': response.status_code
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except requests.RequestException as e:
                # Update proxy statistics
                proxy.failure_count += 1
                proxy.save()
                
                return Response({
                    'status': 'error',
                    'message': f'Proxy connection failed: {str(e)}',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except ScrapingProxy.DoesNotExist:
            return Response(
                {'error': 'Scraping proxy not found'},
                status=status.HTTP_404_NOT_FOUND
            )