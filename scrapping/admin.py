from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html, mark_safe
from django.contrib.postgres.fields import JSONField
from django.http import HttpResponse
from django.forms import PasswordInput
import json
import csv
from datetime import datetime

from .models import ScrapedData, ScrapingSchedule, ScrapingProxy

# Custom widget for JSONField for better readability
class JSONFieldPrettyWidget(admin.widgets.AdminTextareaWidget):
    def format_value(self, value):
        if value and isinstance(value,(dict, list)):
            return json.dumps(value, indent=2, sort_keys=True)
        return super().format_value(value)