# Import the celery app to ensure it's initialized when Django starts
from .celery import app as celery_app

__all__ = ['celery_app']