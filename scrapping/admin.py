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

@ admin.register(ScrapedData)
class ScrapedDataAdmin(admin.ModelAdmin): 
    list_dispplay = ['id', 'datatype',' truncated_url','status','timestamp','processed_time_display','selenium_used']
    list_filter = ['data_type','status','selenium_used']
    search_fields = ['url','keywords','content']
    readonly_fields = ['timestamp','last_updated','content_pretty', 'headers_pretty']
    actions = ['export_as_csv','export_as_json','mark_as_successful', 'mark_as_failed']

    fieldset=(
        ('Basic Information', {'fields': ('url', 'data_type', 'keywords', 'status')}),
        ('Content', {'fields': ('content_pretty',), 'classes': ('collapse',)}),
        ('Status Information', {'fields': ('error_message', 'processing_time')}),
        ('Timing Information', {'fields': ('timestamp', 'last_updated')}),
        ('Scheduling', {'fields': ('scheduled_id', 'scheduled_frequency')}),
        ('Technical Details', {'fields': ('source_ip', 'headers_pretty', 'selenium_used'), 'classes': ('collapse',)}),

    )

    def truncated_url (self, obj):
        # Display a shortened version of the URL for better readability
        return obj.url[:47] + "" if len(obj.url) > 50 else obj.url
    truncated_url.short_description = 'URL'

    def processing_time_display(sef,obj):
        # Format the processing time with units
        return f"{obj.processing_time: 2f}s" if obj.processing_time else '-'
    processing_time_display.short_description = 'Process Time'


    def content_pretty(self, obj):
        # Display the formatted headers
        return mark_safe(f'<pre>{json.dumps(obj.headers_used, indent = 4, sort_keys = True)}</pre>') if obj.headers_used else '-'
    content_pretty.short_description = 'Content'


    def headers_pretty(self, obj):
        """Display formatted headers."""
        return mark_safe(f'<pre>{json.dumps(obj.headers_used, indent=4, sort_keys=True)}</pre>') if obj.headers_used else '-'
    headers_pretty.short_description = 'Headers'


    def export_as_csv(self, request, queryset):
        """Export selected records as CSV."""
        meta = self.model._meta
        field_names = [field.name for field in meta.fields if field.name != 'content']

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename={meta}-{datetime.now().strftime("%Y%m%d")}.csv'
        writer = csv.writer(response)

        writer.writerow(field_names + ['content'])
        for obj in queryset:
            row_data = [getattr(obj, field) for field in field_names]
            row_data.append(json.dumps(obj.content, indent=2))
            writer.writerow(row_data)

        return response
    export_as_csv.short_description = "Export selected records as CSV"

    def export_as_json(self, request, queryset):
        #Export selected records as JSON."
        data = [{'id': obj.id, 'url': obj.url, 'data_type': obj.data_type, 'content': obj.content} for obj in queryset]
        response = HttpResponse(content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename={datetime.now().strftime("%Y%m%d")}.json'
        return response
    export_as_json.short_description = "Export selected records as JSON"

    def mark_as_successful(self, request, queryset):
        #Mark selected records as successful."
        queryset.update(status='success')
    mark_as_successful.short_description = "Mark selected records as successful"

    def mark_as_failed(self, request, queryset):
        #Mark selected records as failed."
        queryset.update(status='failed')
    mark_as_failed.short_description = "Mark selected records as failed"

    def get_form(self, request, obj=None, **kwargs):
        if isinstance(db_field, JSONField):
            kwargs['widget'] = JSONFieldPrettyWidget
        return super().get_form(request, obj, **kwargs)

@admin.register(ScrapingSchedule)
class ScrapingScheduleAdmin(admin.ModelAdmin):
    list_display = ['name', 'url_display','data_type' 'frequency', 'last_run', 'next_run', 'is_active']
    list_filter = ['data_type', 'frequency', 'is_active']
    search_fields = ['name', 'url','keywords']
    readonly_fields = ['created_at','last_run', 'next_run']
    actions =['activate_schedules','deactivate_schedules','run_now']

    fieldsets = (
        ('Basic Information', {'fields': ('name', 'url', 'data_type', 'keywords')}),
        ('Scheduling', {'fields': ('frequency', 'is_active', 'cron_expression')}),

    )

    def url_display(self, obj):
        # Shorten the URL for display
        return obj.url[:37] + "..." if len(obj.url) > 40 else obj.url
    url_display.short_description = 'URL'

    def activate_schedules(self, request, queryset):
        queryset.update(is_active = True)
    activate_schedules.short_description = "Activated selected schedules"

    def deactivate_schedules(self, request, queryset):
        queryset.update(is_active = False)
    deactivate_schedules.short_description = "Deactivated selected schedules"

    def run_now(self, request, queryset):
        # Triggger immediated execution of selected schedules
        from .tasks import scrape_url_task
        for schedule in queryset:
            task = scrape_url_task.delay(schedule.url, schedule.keywords, schedule.data_type, schedule.use_selenium, schedule.custom_headers, schedule.timeout )
            schedule.message_user(request, f"Task {task.id} has been scheduled for {schedule.url}, {schedule.name}")
    run_now.short_description = "Run selected schedules now"

    @admin.register(ScrapingProxy)
    class ScrapingProxyAdmin(admin.ModelAdmin):
        list_display = ['address', 'port', 'proxy_type', 'is_active', 'success_rate_display', 'country', 'last_used']
        list_filter = ['proxy_type', 'is_active', 'country']
        search_fields = ['address', 'country', 'city']
        readonly_fields = ['last_used', 'success_count', 'failure_count', 'average_response-time']
        actions = ['activate_proxies', 'deactivate_proxies', 'reset_counters']

        fieldsets =(
            ('Proxy Details', { 'fields': ('address', 'port', 'proxy_type', 'is_active', 'username', 'password')}),
            ('Authentication', {'fields': ('username', 'password'), 'classes': ('collapse',)}),
            ('Performance Metrics', {'fields': ('success_count', 'failure_count', 'average_response_time', 'last_used')}),
            ('Geolocation', {'fields': ('country', 'city')})
        )

        def success_rate_display(self, obj):
            return f"{obj.succcess_rate:.1f}%" if obj.success_rate else "-"
        success_rate_display.short_description = 'Success Rate'

        def formfield_for_dbfield(self, db_field, **kwargs):
            field = super().formfield_for_dbfield(db_field, **kwargs)
            if db_field.name == 'password':
                field.widget = PasswordInput(render_value = True)
            return field