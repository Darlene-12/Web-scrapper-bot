import os
from celery import Celery  # Import from celery package, not from the local module
from django.conf import settings
from celery import Celery, shared_task  # Import shared_task too

# Set the default Django settings module for the 'celery' program
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scrapping_bot.settings')

# Create the Celery app
app = Celery('scrapping_bot')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Configure the Celery Beat schedule
app.conf.beat_schedule = {
    'check-pending-tasks-every-minute': {
        'task': 'scraping.tasks.schedule_pending_tasks',
        'schedule': 60.0,  # Every minute
    },
    'update-proxy-statistics-hourly': {
        'task': 'scraping.tasks.update_proxy_statistics',
        'schedule': 3600.0,  # Every hour
    },
    'clean-old-data-daily': {
        'task': 'scraping.tasks.clean_old_data',
        'schedule': 86400.0,  # Every day
        'kwargs': {'days_to_keep': 30},
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')