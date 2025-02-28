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