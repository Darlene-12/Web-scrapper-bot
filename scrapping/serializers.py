from rest_framework import serializers
from django.utils import timezone
from django.core.validators import URLValidator
import re

from .models import ScrapedData, ScrapingSchedule, ScrapingProxy

class ScrapedDataSerializer(serializers.ModelSerializer):
    """
    Serializer for the ScrapedData model.
    Handles conversion between Django models and JSON for the API.
    """
    url_display = serializers.SerializerMethodField()
    timestamp_display = serializers.SerializerMethodField()
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = ScrapedData
        fields = [
            'id', 'url', 'url_display', 'keywords', 'content', 'content_preview',
            'data_type', 'status', 'error_message', 'timestamp', 'timestamp_display',
            'last_updated', 'processing_time', 'scheduled_id', 'scheduled_frequency',
            'source_ip', 'headers_used', 'selenium_used'
        ]
        read_only_fields = [
            'id', 'timestamp', 'last_updated', 'processing_time',
            'source_ip', 'headers_used', 'selenium_used'
        ]
    
    def get_url_display(self, obj):
        """Return a truncated URL for display purposes."""
        if len(obj.url) > 50:
            return f"{obj.url[:47]}..."
        return obj.url
    
    def get_timestamp_display(self, obj):
        """Format the timestamp in a human-readable way."""
        if not obj.timestamp:
            return None
        return obj.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    
    def get_content_preview(self, obj):
        """Return a short preview of the content."""
        if not obj.content:
            return None
            
        try:
            # For product data type
            if obj.data_type == 'product':
                title = obj.content.get('title', '')
                price = obj.content.get('price', '')
                if title and price:
                    return f"{title} - {price}"
                elif title:
                    return title
            
            # For review data type
            elif obj.data_type == 'review':
                review_count = len(obj.content.get('reviews', []))
                product_name = obj.content.get('product', {}).get('name', '')
                if product_name:
                    return f"{product_name} - {review_count} reviews"
                return f"{review_count} reviews"
            
            # Generic content preview
            import json
            content_str = json.dumps(obj.content)
            if len(content_str) > 100:
                return content_str[:97] + "..."
            return content_str
        except Exception as e:
            return f"Error generating preview: {str(e)}"


class ScrapingScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for the ScrapingSchedule model.
    """
    next_run_display = serializers.SerializerMethodField()
    last_run_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ScrapingSchedule
        fields = [
            'id', 'name', 'url', 'keywords', 'data_type', 'frequency',
            'cron_expression', 'is_active', 'created_at', 'last_run',
            'last_run_display', 'next_run', 'next_run_display', 'use_selenium',
            'custom_headers', 'timeout', 'notify_on_completion', 'notification_email'
        ]
        read_only_fields = ['id', 'created_at', 'last_run', 'next_run']
    
    def get_next_run_display(self, obj):
        """Format the next_run time in a human-readable way."""
        if not obj.next_run:
            return "Not scheduled"
        
        now = timezone.now()
        delta = obj.next_run - now
        
        if delta.total_seconds() < 0:
            return "Overdue"
        elif delta.days > 0:
            return f"In {delta.days} days"
        elif delta.seconds < 3600:
            minutes = delta.seconds // 60
            return f"In {minutes} minutes"
        else:
            hours = delta.seconds // 3600
            return f"In {hours} hours"
    
    def get_last_run_display(self, obj):
        """Format the last_run time in a human-readable way."""
        if not obj.last_run:
            return "Never"
        
        now = timezone.now()
        delta = now - obj.last_run
        
        if delta.days > 0:
            return f"{delta.days} days ago"
        elif delta.seconds < 3600:
            minutes = delta.seconds // 60
            return f"{minutes} minutes ago"
        else:
            hours = delta.seconds // 3600
            return f"{hours} hours ago"
    
    def validate_url(self, value):
        """Validate that the URL is properly formed."""
        validator = URLValidator()
        try:
            validator(value)
        except Exception:
            raise serializers.ValidationError("Invalid URL format")
        return value
    
    def validate_frequency(self, value):
        """Validate that the frequency is one of the allowed values."""
        allowed_frequencies = ['hourly', 'daily', 'weekly', 'monthly', 'custom']
        if value not in allowed_frequencies:
            raise serializers.ValidationError(
                f"Frequency must be one of: {', '.join(allowed_frequencies)}"
            )
        return value
    
    def validate(self, data):
        """Validate the schedule data as a whole."""
        # If frequency is 'custom', cron_expression is required
        if data.get('frequency') == 'custom' and not data.get('cron_expression'):
            raise serializers.ValidationError({
                "cron_expression": "Cron expression is required for custom frequency"
            })
        
        # If notification is enabled, email is required
        if data.get('notify_on_completion') and not data.get('notification_email'):
            raise serializers.ValidationError({
                "notification_email": "Email is required when notifications are enabled"
            })
        
        return data


class ScrapingProxySerializer(serializers.ModelSerializer):
    """
    Serializer for the ScrapingProxy model.
    """
    success_rate = serializers.SerializerMethodField()
    formatted_proxy = serializers.SerializerMethodField()
    last_used_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ScrapingProxy
        fields = [
            'id', 'address', 'port', 'proxy_type', 'username', 'password',
            'is_active', 'last_used', 'last_used_display', 'success_count', 
            'failure_count', 'average_response_time', 'country', 'city',
            'success_rate', 'formatted_proxy'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def get_success_rate(self, obj):
        """Calculate the success rate as a percentage."""
        total = obj.success_count + obj.failure_count
        if total == 0:
            return 0
        return round((obj.success_count / total) * 100, 1)
    
    def get_formatted_proxy(self, obj):
        """Return the proxy string in the format for display."""
        proxy_string = f"{obj.proxy_type}://"
        
        if obj.username and obj.password:
            proxy_string += f"{obj.username}:******@"
        
        proxy_string += f"{obj.address}:{obj.port}"
        return proxy_string
    
    def get_last_used_display(self, obj):
        """Format the last_used time in a human-readable way."""
        if not obj.last_used:
            return "Never"
        
        now = timezone.now()
        delta = now - obj.last_used
        
        if delta.days > 0:
            return f"{delta.days} days ago"
        elif delta.seconds < 3600:
            minutes = delta.seconds // 60
            return f"{minutes} minutes ago"
        else:
            hours = delta.seconds // 3600
            return f"{hours} hours ago"
    
    def validate_address(self, value):
        """Validate the proxy address format."""
        # Basic validation for IP address or hostname
        ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        hostname_pattern = r'^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$'
        
        if not (re.match(ip_pattern, value) or re.match(hostname_pattern, value)):
            raise serializers.ValidationError("Invalid proxy address format")
        return value
    
    def validate_port(self, value):
        """Validate the port number range."""
        if value < 1 or value > 65535:
            raise serializers.ValidationError("Port must be between 1 and 65535")
        return value
    
    def validate_proxy_type(self, value):
        """Validate that the proxy type is one of the allowed values."""
        allowed_types = ['http', 'https', 'socks4', 'socks5']
        if value not in allowed_types:
            raise serializers.ValidationError(
                f"Proxy type must be one of: {', '.join(allowed_types)}"
            )
        return value


class ScrapeRequestSerializer(serializers.Serializer):
    """
    Serializer for validating scrape requests.
    This is not tied to a model but used for validating API inputs.
    """
    url = serializers.URLField(required=True)
    keywords = serializers.CharField(required=False, allow_blank=True, default='')
    data_type = serializers.ChoiceField(
        choices=['general', 'product', 'review', 'price', 'article', 'listing'],
        default='general'
    )
    use_selenium = serializers.BooleanField(required=False, allow_null=True, default=None)
    custom_headers = serializers.JSONField(required=False, allow_null=True, default=None)
    timeout = serializers.IntegerField(required=False, min_value=1, max_value=300, default=30)
    proxy_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    max_retries = serializers.IntegerField(required=False, min_value=0, max_value=5, default=3)
    
    def validate_url(self, value):
        """Additional validation for URL if needed."""
        return value
    
    def validate_custom_headers(self, value):
        """Validate that custom_headers is a valid headers dictionary."""
        if value is None:
            return value
            
        if not isinstance(value, dict):
            raise serializers.ValidationError("Headers must be a dictionary")
            
        # Check for valid header names (basic validation)
        for key in value.keys():
            if not isinstance(key, str):
                raise serializers.ValidationError("Header names must be strings")
            if not re.match(r'^[A-Za-z0-9_-]+$', key):
                raise serializers.ValidationError(f"Invalid header name: {key}")
                
        return value
    
    def validate_proxy_id(self, value):
        """Validate that the proxy exists if an ID is provided."""
        if value is not None:
            try:
                proxy = ScrapingProxy.objects.get(id=value, is_active=True)
            except ScrapingProxy.DoesNotExist:
                raise serializers.ValidationError("Specified proxy does not exist or is not active")
        return value