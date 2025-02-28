from django.db import models
from django.utils import timezone
from django.core.validators import URLValidator
from django.core.serializers.json import DjangoJSONEncoder
from taggit.managers import TaggableManager


# Create your models here.
class ScrapedData (models.Model):
    # This is a model for storing the scraped data from the website with a flexible tagging.
    url = models.URLield(
        max_length=500,
        validator=[URLValidator()],
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

    # Status tracking
    status = models.CharField(
        max_length = 20,
        choices = [
            ('success','Success'),
            ('failed','Failed'),
            ('pending','Pending'),
            ('processing', ' Processing')
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
        verbose_name_plural = "Scrapped Date"

        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['url'], name='url_index'),
            models.Index(fields=['status'], name='status_idx'),
        ]