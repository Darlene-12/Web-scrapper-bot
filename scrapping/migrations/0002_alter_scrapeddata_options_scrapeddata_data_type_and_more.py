# Generated by Django 5.1.6 on 2025-03-10 15:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scrapping', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='scrapeddata',
            options={'ordering': ['-timestamp'], 'verbose_name': 'Scrapped Data', 'verbose_name_plural': 'Scrapped Data'},
        ),
        migrations.AddField(
            model_name='scrapeddata',
            name='data_type',
            field=models.CharField(blank=True, choices=[('html', 'HTML'), ('json', 'JSON')], help_text='Type of data scraped (HTML or JSON)', max_length=50),
        ),
        migrations.AddField(
            model_name='scrapeddata',
            name='selenium_used',
            field=models.BooleanField(default=False, help_text='Was Selenium used for scraping?'),
        ),
    ]
