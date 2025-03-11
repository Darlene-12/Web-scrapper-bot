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
""" 
Logging is used for tracking events, debugging issues, and monitoring your scraper’s performance. 
Instead of using print() statements, logging provides structured output, levels of severity, and the ability to save logs to files.
"""

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

        # Initialize the driver pool
        self._initialize_driver_pool()

        # Default headers
        self.default_headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Cache-Control': 'max-age=0',
        }

        # List of common user agents for rotation
        self.user_agents= [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 Edg/96.0.1054.29',
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
                        'Mozilla/5.0 (iPad; CPU OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
                        'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/95.0',

        ]

        # Setting the current user agent index for rotation
        self.current_ua_index = 0

    def _initialize_driver_pool(self):
        # Initializing a pool of selenium WebDriver instances for reuse
        try:
            for _ in range(self.max_driver_pool_size):
                driver = self._create_selenium_driver()
                self.selenium_driver_pool.put(driver)
        except Exception as e:
            logger.warning(f"Failed to initialize selenium driver pool: {str(e)}")

    def _create_selenium_driver(self, proxy = None):
        # Create a new selenium WebDriver instance
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920, 1080")

        # set random user agent if rotation is enabled

        if self.user_agent_rotation:
            ua= self.user_agents[self.current_ua_index]
            chrome_options.add_argument(f"user-agent={ua}")
            self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents) 
        
        # Add proxy if provided
        if proxy:
            proxy_string = None
            if isinstance(proxy, dict) and "http" in proxy:
                proxy_string =proxy["http"]
            elif isinstance(proxy, str):
                proxy_string = proxy
            elif hasattr(proxy, "get_formatted_proxy"):
                proxy_dict = proxy.get_formatted_proxy()
                proxy_string = proxy_dict["http"]

            if proxy_string:
                chrome_options.add_argument(f"--proxy-server={proxy_string}")

        # Add performance improving options
        



