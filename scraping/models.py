from django.db import models
from django.utils import timezone
from django.core.validators import URLValidator
from django.core.serializers.json import DjangoJSONEncoder
from taggit.managers import TaggableManager



# Create your models here.
class ScrapedData (models.Model):
    # This is a model for storing the scraped data from the website with a flexible tagging.
    url = models.URLField(
        max_length=500,
        validators=[URLValidator()],
        help_text="The URL that was scrapped"
    )
    keywords = models.TextField(
        blank = True,
        help_text="Search the keywords associated with this scrape"
    )
    content = models.JSONField(
        encoder = DjangoJSONEncoder,
        default=dict,
        blank = True,
        help_text=" Structured data from scrappingg( stored as JSON)"
    )

    # Dynamic tagging for categorization
    tags = TaggableManager(help_text = "Dyanamically assign categories( e.g., 'news', 'tech', 'blog')")

    selenium_used = models.BooleanField(default=False, help_text="Was Selenium used for scraping?")
    data_type = models.CharField(
        max_length=50,
        choices=[('html', 'HTML'), ('json', 'JSON')],
        blank=True,
        help_text="Type of data scraped (HTML or JSON)"
    )

    # Status tracking
    status = models.CharField(
        max_length = 20,
        choices = [
            ('success','Success'),
            ('failed','Failed'),
            ('pending','Pending'),
            ('processing','Processing'),
            ('partial', 'Partial Success')
        ],

        default = 'success',
        help_text = "The status of the scrapping process"
    )
    error_message = models.TextField(
        blank = True,
        null= True,
        help_text= " Error message if scrapping failed"
    )

    # Timing the information
    timestamp = models.DateTimeField(
        default = timezone.now,
        help_text = " When the data was scrapped"
    )
    last_updated = models.DateTimeField(
        auto_now = True,
        help_text = " When this record was last updated"
    )

    class Meta:
        # Option for the scrappedData model
        verbose_name = "Scrapped Data"
        verbose_name_plural = "Scrapped Data"

        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['url'], name='url_index'),
            models.Index(fields=['status'], name='scrapeddata_status_idx'),
        ]
    
    def __str__(self):
        """ This is basically a string representation of the scrapped data"""
        return f"Scraped from {self.url[:50]}... ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"
    
    
    def save(self, *args, **kwargs):
        if self.content:
            try:
                # If `content` is valid JSON, set `data_type` as JSON
                json.loads(self.content)
                self.data_type = 'json'
            except (ValueError, TypeError):
                # If JSON parsing fails, assume it's HTML
                self.data_type = 'html'

        super().save(*args, **kwargs)

    def get_content_preview(self, max_length=100):
            # Returns a preview of the content for display
            import json
            content_str = json.dumps(self.content)
            return content_str[:max_length] + "..." if len(content_str) > max_length else content_str

class ScrapingSchedule(models.Model):
    # Model for managing the schedule of the scrapping process
    FREQUENCY_CHOICES = [
        ('daily','Daily'),
        ('weekly','Weekly'),
        ('monthly','Monthly'),
        ('yearly','Yearly'),
        ('once','Once'),
        ('custom','Custom'),
    ]

    name = models.CharField(max_length=100, help_text="Name of this scheduled task")
    url = models.URLField(max_length=500, validators=[URLValidator()], help_text="The URL to scrape")
    keywords= models.TextField(blank = True, help_text="Keywords to use when scraping")

    # Dynamic tagging for categorization
    tags = TaggableManager(help_text="Tags for categorizatoon of the scraping job")

    frequency = models.CharField(
        max_length=20,
        choices = FREQUENCY_CHOICES,
        default='daily',
        help_text="How often to run this scraping task"
    )
    cron_expression = models.CharField(
        max_length = 100,
        blank = True,
        null= True,
        help_text="Crontab expression for the custom scheduling"
    )

    is_active = models.BooleanField(default= True, help_text="whether this schedue is currently active")
    created_at = models.DateTimeField(auto_now_add = True, help_text = " When this schedule was created")
    last_run = models.DateTimeField(null=True, blank = True, help_text = " When this schedule was last run")
    next_run = models.DateTimeField(null = True, blank = True, help_text="When this schedule is next due to run")

    def calculate_next_run(self):
        # Determine when the next srape should run
        now = timezone.now()
        if not self.last_run:
            self.next_run = now
            return
        
        time_deltas = {
            'hourly': timezone.timedelta(hours=1),
            'daily': timezone.timedelta(days=1),
            'weekly': timezone.timedelta(weeks=1),
            'monthly':timezone.timedelta(days=30)
        }

        self.next_run = self.last_run + time_deltas.get(self.frequency, timezone.timedelta(days=1))

        if self.next_run < now:
            self.next_run = now

    def save(self, * args, **kwargs):
        # Ensure that the next run is correctly scheduled
        if self.is_active and (not self.next_run or self.next_run < timezone.now()):
            self.calculate_next_run()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.frequency})"

class ScrapingProxy(models.Model):
    # Models for managing severs used for scraping
    PROXY_TYPE_CHOICES = [
        ('http', 'HTTP'),
        ('https', 'HTTPS'),
        ('socks4', 'SOCKS4'),
        ('socks5', 'SOCKS5'),
    ]

    address = models.CharField(max_length=100, help_text="Proxy server address (IP or hostname)")
    port = models.PositiveIntegerField(help_text="Proxy server port (eg: 8080)")
    proxy_type = models.CharField (max_length= 10, choices= PROXY_TYPE_CHOICES, default = 'http', help_text="Type of proxy")
    username = models.CharField(max_length=100, blank =True, null = True, help_text = "Username for authenticated proxies")
    password = models.CharField(max_length = 100, blank = True, null=True, help_text="Password for authenticated proxies")

    is_active = models.BooleanField(default = True, help_text = "Whether this proxy is currently active")
    created_at = models.DateTimeField(auto_now_add = True, help_text = "When this proxy was added")
    last_used = models.DateTimeField(null = True, blank = True, help_text = "When this proxy was last used")
    success_count = models.PositiveIntegerField(default = 0, help_text = "Number of successful uses")   
    failure_count = models.PositiveIntegerField(default = 0, help_text = "Number of failed uses")
    average_response_time = models.FloatField(default = 0, help_text = "Average response time in seconds")


    country = models.CharField(max_length = 100, blank = True, null = True, help_text = "Name of the country" )
    city = models.CharField(max_length = 100, blank = True, null = True, help_text = "proxy server city")
    region = models.CharField(max_length = 100, blank = True, null = True, help_text = "proxy server region")
    isp = models.CharField(max_length = 100, blank = True, null = True, help_text = "proxy server ISP")

    class Meta:
        # Metadata options
        verbose_name = 'Scraping proxy'
        verbose_name_plural = 'Scraping proxies'
        ordering = ['-success_count']
        unique_together = ('address', 'port')

    def __str__(self):
        # String representation of the proxy
        return f"{self.proxy_type}://{self.address}:{self.port}"
    
    @property
    def success_rate(self):
        # Calculate the success rate of the proxy
        total = self.success_count + self.failure_count
        return(self.success_count / total) * 100 if total else 0

    def get_formatted_proxy(self):
        # Return the proxy formatted for HTTP request.

        proxy_string = f"{self.proxy_type}://"
        if self.username and self.password:
            proxy_string += f"{self.username}:{self.password}@"
        proxy_string += f"{self.address}:{self.port}"
        return {"http": proxy_string, "https": proxy_string}


