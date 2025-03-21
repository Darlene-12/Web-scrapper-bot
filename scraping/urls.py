from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ScrapedDataViewSet, ScrapingScheduleViewSet, ScrapingProxyViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'scraped-data', ScrapedDataViewSet, basename='scraped-data')
router.register(r'schedules', ScrapingScheduleViewSet, basename='schedule')
router.register(r'proxies', ScrapingProxyViewSet, basename='proxy')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),  # Changed from 'api/' to '' since the prefix is already in the main urls.py
    # Add other non-viewset URLs below if needed
]