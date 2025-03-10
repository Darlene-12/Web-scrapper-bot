import time
import logging
import requests
import threading
import queue
import asyncio
import aiohttp
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from concurrent.futures import ThreadPoolExecutor

from ..models import ScrapedData, ScrapingProxy

# Set up logging
logger = logging.getLogger(__name__)

class ScraperUtility:
    """
    Utility class that provides different methods used to determine when to use BeautifulSoup of Selenium, handkes proxy rotation
    and provides improved scraping capabilities
    """
    # Javascript indicators that suggest selenium is needed
    JS_INDICATORS = [
        'vue.js', 'vue.min.js', 'react.js', 'react.min.js', 'angular.js', 'angular.min.js',
        'jquery.js', 'jquery.min.js', 'axios', 'fetch(', 'XMLHttpRequest', 'ajax',
        'document.getElementById', 'document.querySelector', 'getElementById',
        'querySelector', 'addEventListener', '.innerHTML', '.innerText',
        'window.onload', 'DOMContentLoaded', 'load()', 'lazy-load',
        'data-src=', 'data-lazy-src', 'lazyload', 'async', 'defer',
        'window.history.pushState', 'window.location', 'document.location',
        'classList.add', 'classList.remove', 'classList.toggle',
        'createElement', 'createAttribute', 'createEvent',
        'nextTick', 'setTimeout', 'setInterval', 'requestAnimationFrame'

    ]

    # Common selectors that might be dyamically loaded
    DYNAMIC_CONTENT_SELECTORS = [
                '.loading', '#loading', '.spinner', '#spinner', '.progress',
                '[data-loaded]', '[data-loading]', '.lazy-load', '.async-content',
                 '.dynamic-content', '.infinite-scroll', '.ajax-content'
    ]

    # Common sites known to require selenium
    SELENIUM_REQUIRED_DOMAINS = [
                'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'linkedin.com',
                'youtube.com', 'tiktok.com', 'amazon.com', 'indeed.com', 'glassdoor.com',
                'zillow.com', 'booking.com', 'airbnb.com', 'target.com', 'walmart.com',
                'bestbuy.com', 'newegg.com', 'ebay.com'
    ]

    def __init__ (self, proxy_manager=None, max_tries=3, timeout=30, user_agent_rotation=True):
        """
        Intializes the scrapper utility.

        args: 
            proxy_manager: Optional manager for proxy rotation
            max_retries: Maximum number of retry attempts for failed requests
            timeout: Request timeout in seconds
            user_agent_rotation: Whether to rotate user agents

        """
        self.proxy_manager = proxy_manager
        self.max_tries = max_tries
        self.timeout = timeout
        self.user_agent_rotation = user_agent_rotation
        self.selenium_driver_pool = queue.Queue()
        self.max_driver_pool_size = 3 # Maximum number of selenium drivers to keep pool in
