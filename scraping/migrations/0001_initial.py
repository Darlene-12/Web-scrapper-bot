# Generated by Django 5.1.6 on 2025-03-16 07:36

import django.core.serializers.json
import django.core.validators
import django.utils.timezone
import taggit.managers
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('taggit', '0006_rename_taggeditem_content_type_object_id_taggit_tagg_content_8fc721_idx'),
    ]

    operations = [
        migrations.CreateModel(
            name='ScrapingProxy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('address', models.CharField(help_text='Proxy server address (IP or hostname)', max_length=100)),
                ('port', models.PositiveIntegerField(help_text='Proxy server port (eg: 8080)')),
                ('proxy_type', models.CharField(choices=[('http', 'HTTP'), ('https', 'HTTPS'), ('socks4', 'SOCKS4'), ('socks5', 'SOCKS5')], default='http', help_text='Type of proxy', max_length=10)),
                ('username', models.CharField(blank=True, help_text='Username for authenticated proxies', max_length=100, null=True)),
                ('password', models.CharField(blank=True, help_text='Password for authenticated proxies', max_length=100, null=True)),
                ('is_active', models.BooleanField(default=True, help_text='Whether this proxy is currently active')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='When this proxy was added')),
                ('last_used', models.DateTimeField(blank=True, help_text='When this proxy was last used', null=True)),
                ('success_count', models.PositiveIntegerField(default=0, help_text='Number of successful uses')),
                ('failure_count', models.PositiveIntegerField(default=0, help_text='Number of failed uses')),
                ('average_response_time', models.FloatField(default=0, help_text='Average response time in seconds')),
                ('country', models.CharField(blank=True, help_text='Name of the country', max_length=100, null=True)),
                ('city', models.CharField(blank=True, help_text='proxy server city', max_length=100, null=True)),
                ('region', models.CharField(blank=True, help_text='proxy server region', max_length=100, null=True)),
                ('isp', models.CharField(blank=True, help_text='proxy server ISP', max_length=100, null=True)),
            ],
            options={
                'verbose_name': 'Scraping proxy',
                'verbose_name_plural': 'Scraping proxies',
                'ordering': ['-success_count'],
                'unique_together': {('address', 'port')},
            },
        ),
        migrations.CreateModel(
            name='ScrapingSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of this scheduled task', max_length=100)),
                ('url', models.URLField(help_text='The URL to scrape', max_length=500, validators=[django.core.validators.URLValidator()])),
                ('keywords', models.TextField(blank=True, help_text='Keywords to use when scraping')),
                ('frequency', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly'), ('once', 'Once'), ('custom', 'Custom')], default='daily', help_text='How often to run this scraping task', max_length=20)),
                ('cron_expression', models.CharField(blank=True, help_text='Crontab expression for the custom scheduling', max_length=100, null=True)),
                ('is_active', models.BooleanField(default=True, help_text='whether this schedue is currently active')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text=' When this schedule was created')),
                ('last_run', models.DateTimeField(blank=True, help_text=' When this schedule was last run', null=True)),
                ('next_run', models.DateTimeField(blank=True, help_text='When this schedule is next due to run', null=True)),
                ('tags', taggit.managers.TaggableManager(help_text='Tags for categorizatoon of the scraping job', through='taggit.TaggedItem', to='taggit.Tag', verbose_name='Tags')),
            ],
        ),
        migrations.CreateModel(
            name='ScrapedData',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(help_text='The URL that was scrapped', max_length=500, validators=[django.core.validators.URLValidator()])),
                ('keywords', models.TextField(blank=True, help_text='Search the keywords associated with this scrape')),
                ('content', models.JSONField(blank=True, default=dict, encoder=django.core.serializers.json.DjangoJSONEncoder, help_text=' Structured data from scrappingg( stored as JSON)')),
                ('selenium_used', models.BooleanField(default=False, help_text='Was Selenium used for scraping?')),
                ('data_type', models.CharField(blank=True, choices=[('html', 'HTML'), ('json', 'JSON')], help_text='Type of data scraped (HTML or JSON)', max_length=50)),
                ('status', models.CharField(choices=[('success', 'Success'), ('failed', 'Failed'), ('pending', 'Pending'), ('processing', 'Processing'), ('partial', 'Partial Success')], default='success', help_text='The status of the scrapping process', max_length=20)),
                ('error_message', models.TextField(blank=True, help_text=' Error message if scrapping failed', null=True)),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now, help_text=' When the data was scrapped')),
                ('last_updated', models.DateTimeField(auto_now=True, help_text=' When this record was last updated')),
                ('tags', taggit.managers.TaggableManager(help_text="Dyanamically assign categories( e.g., 'news', 'tech', 'blog')", through='taggit.TaggedItem', to='taggit.Tag', verbose_name='Tags')),
            ],
            options={
                'verbose_name': 'Scrapped Data',
                'verbose_name_plural': 'Scrapped Data',
                'ordering': ['-timestamp'],
                'indexes': [models.Index(fields=['url'], name='url_index'), models.Index(fields=['status'], name='scrapeddata_status_idx')],
            },
        ),
    ]
