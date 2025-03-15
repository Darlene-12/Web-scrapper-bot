import logging
from scrapping_bot.celery import shared_task
from django.utils import timezone
from datetime import timedelta
import uuid
from celery import shared_task
import traceback

from .models import ScrapedData, ScrapingSchedule, ScrapingProxy
from .services.base_scraper import BaseScraper
from .services.product_scraper import ProductScraper
from .services.review_scraper import ReviewScraper
from .services.scraper_utility import ScraperUtility

# Set up logging
logger = logging.getLogger(__name__)

# Initialize scraper utility for intelligent scraping
scraper_utility = ScraperUtility()

@shared_task(bind=True, max_retries=3)
def scrape_url_task(self, url, keywords=None, data_type='general', use_selenium=None, 
                   custom_headers=None, timeout=30, proxy_id=None, schedule_id=None):
    """
    Celery task to scrape a URL.
    
    Args:
        url: URL to scrape
        keywords: Optional keywords
        data_type: Type of data to scrape
        use_selenium: Whether to use Selenium (None=auto-detect)
        custom_headers: Custom HTTP headers
        timeout: Request timeout
        proxy_id: ID of proxy to use
        schedule_id: ID of associated schedule
    
    Returns:
        dict: Result information
    """
    start_time = timezone.now()
    logger.info(f"Starting scrape task for {url} (type: {data_type})")
    
    try:
        # Get proxy if specified
        proxy = None
        if proxy_id:
            try:
                proxy = ScrapingProxy.objects.get(id=proxy_id, is_active=True)
            except ScrapingProxy.DoesNotExist:
                logger.warning(f"Proxy with ID {proxy_id} not found, using no proxy")
        
        # If method not specified, auto-detect
        if use_selenium is None:
            # First make a lightweight check to determine method
            scraper_method = scraper_utility.detect_scraper_type(url)
            use_selenium = scraper_method == 'selenium'
        
        # Select appropriate scraper based on data_type
        if data_type == 'product':
            scraper = ProductScraper(
                url=url,
                keywords=keywords,
                use_selenium=use_selenium,
                proxy=proxy,
                timeout=timeout,
                headers=custom_headers
            )
        elif data_type == 'review':
            scraper = ReviewScraper(
                url=url,
                keywords=keywords,
                use_selenium=use_selenium,
                proxy=proxy,
                timeout=timeout,
                headers=custom_headers
            )
        else:
            scraper = BaseScraper(
                url=url,
                keywords=keywords,
                use_selenium=use_selenium,
                proxy=proxy,
                timeout=timeout,
                headers=custom_headers
            )
        
        # Perform the scraping
        scraped_data = scraper.scrape()
        
        # Update schedule if provided
        if schedule_id:
            try:
                schedule = ScrapingSchedule.objects.get(id=schedule_id)
                schedule.last_run = timezone.now()
                schedule.calculate_next_run()
                schedule.save()
            except ScrapingSchedule.DoesNotExist:
                logger.warning(f"Schedule with ID {schedule_id} not found")
        
        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()
        
        return {
            'status': 'success',
            'url': url,
            'data_type': data_type,
            'duration': duration,
            'scraped_data_id': scraped_data.id if scraped_data else None
        }
        
    except Exception as exc:
        # Log the error
        logger.error(f"Error in scrape_url_task for {url}: {str(exc)}")
        logger.error(traceback.format_exc())
        
        # Record the failure
        try:
            ScrapedData.objects.create(
                url=url,
                keywords=keywords or '',
                content={'error': str(exc)},
                data_type=data_type,
                status='failed',
                error_message=str(exc),
                selenium_used=use_selenium or False
            )
        except Exception as e:
            logger.error(f"Failed to record scraping error: {str(e)}")
        
        # Retry with exponential backoff
        retry_count = self.request.retries
        retry_delay = 60 * (2 ** retry_count)  # 60s, 120s, 240s
        
        # Update schedule on final failure
        if retry_count >= self.max_retries and schedule_id:
            try:
                schedule = ScrapingSchedule.objects.get(id=schedule_id)
                schedule.last_run = timezone.now()
                schedule.calculate_next_run()
                schedule.save()
            except ScrapingSchedule.DoesNotExist:
                pass
        
        raise self.retry(exc=exc, countdown=retry_delay)


@shared_task
def schedule_pending_tasks():
    """
    Periodically check for and schedule tasks that are due to run.
    
    This task should be run every minute by Celery beat.
    """
    now = timezone.now()
    logger.info(f"Checking for scheduled tasks due at {now}")
    
    # Get all active schedules that are due to run
    due_schedules = ScrapingSchedule.objects.filter(
        is_active=True,
        next_run__lte=now
    )
    
    scheduled_count = 0
    for schedule in due_schedules:
        # Queue the scraping task
        task = scrape_url_task.delay(
            url=schedule.url,
            keywords=schedule.keywords,
            data_type=schedule.data_type,
            use_selenium=schedule.use_selenium,
            custom_headers=schedule.custom_headers,
            timeout=schedule.timeout,
            schedule_id=schedule.id
        )
        
        # Record the scheduled task
        logger.info(f"Scheduled task {task.id} for {schedule.url} (schedule: {schedule.name})")
        scheduled_count += 1
        
        # Mark that we've started processing this schedule to prevent duplicate runs
        # We'll update last_run and next_run after the task completes
        schedule.next_run = now + timedelta(days=1)  # Temporary update
        schedule.save(update_fields=['next_run'])
    
    return {
        'status': 'success',
        'scheduled_count': scheduled_count,
        'timestamp': now.isoformat()
    }


@shared_task
def clean_old_data(days_to_keep=30):
    """
    Clean up old scraped data to prevent database bloat.
    
    Args:
        days_to_keep: Number of days of data to retain
    """
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    
    # Count before deletion for reporting
    old_data_count = ScrapedData.objects.filter(timestamp__lt=cutoff_date).count()
    
    # Perform deletion
    result = ScrapedData.objects.filter(timestamp__lt=cutoff_date).delete()
    
    logger.info(f"Cleaned up {old_data_count} old scraped data records older than {days_to_keep} days")
    
    return {
        'status': 'success',
        'deleted_count': old_data_count,
        'details': result,
        'cutoff_date': cutoff_date.isoformat()
    }


def schedule_scraping_task(url, keywords, data_type, schedule_type, name=None, 
                          use_selenium=False, custom_headers=None, timeout=30):
    """
    Create a new scraping schedule in the database.
    
    Args:
        url: URL to scrape
        keywords: Search keywords
        data_type: Type of data to scrape
        schedule_type: 'daily', 'weekly', 'monthly', or 'custom'
        name: Optional name for this schedule
        use_selenium: Whether to use Selenium
        custom_headers: Custom HTTP headers
        timeout: Request timeout
        
    Returns:
        ScrapingSchedule: The created schedule
    """
    if not name:
        # Generate a name if not provided
        name = f"Scrape {data_type} from {url[:30]}..." if len(url) > 30 else url
    
    # Create the schedule
    schedule = ScrapingSchedule.objects.create(
        name=name,
        url=url,
        keywords=keywords,
        data_type=data_type,
        frequency=schedule_type,
        use_selenium=use_selenium,
        custom_headers=custom_headers,
        timeout=timeout,
        is_active=True
    )
    
    # Calculate next run time
    schedule.calculate_next_run()
    schedule.save()
    
    logger.info(f"Created new {schedule_type} schedule '{name}' for {url}")
    
    return schedule


@shared_task
def update_proxy_statistics():
    """Update statistics for all proxies."""
    active_proxies = ScrapingProxy.objects.filter(is_active=True)
    
    for proxy in active_proxies:
        # Check if proxy is still working
        test_url = "https://httpbin.org/ip"
        success = False
        
        try:
            # Use the proxy to fetch a test URL
            proxies = proxy.get_formatted_proxy()
            response = requests.get(test_url, proxies=proxies, timeout=10)
            
            if response.status_code == 200:
                success = True
                proxy.success_count += 1
                
                # Check if returned IP matches proxy IP
                try:
                    response_data = response.json()
                    if 'origin' in response_data:
                        # httpbin.org returns the client's IP
                        proxy_ip = response_data['origin']
                        logger.info(f"Proxy {proxy.id} ({proxy.address}) is working, appears as {proxy_ip}")
                except:
                    pass
            else:
                proxy.failure_count += 1
                logger.warning(f"Proxy {proxy.id} ({proxy.address}) returned status {response.status_code}")
                
        except Exception as e:
            proxy.failure_count += 1
            logger.warning(f"Proxy {proxy.id} ({proxy.address}) failed: {str(e)}")
        
        # Update last used time if successful
        if success:
            proxy.last_used = timezone.now()
        
        # Save updates
        proxy.save()
    
    return {
        'status': 'success',
        'proxies_checked': active_proxies.count()
    }