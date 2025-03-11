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
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-infobars")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-popup-blocking")

        # Add experimental options
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        # Create and return the driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(self.timeout)

        return driver

    def _get_driver_from_pool(self, proxy=None):
        # Get a driver from the pool or create a new one
        try:
            driver = self.selenium_driver_pool.get(block=False)

            # If proxy is different, quite this driver and create a new one
            if proxy:
                driver.quit()
                driver = self._create_selenium_driver(proxy)
            return driver
        except queue.Empty:
            # If the pool is empty create a new driver
            return self._create_selenium_driver(proxy)
    
    def _return_driver_to_pool(self, driver):
        # Return the driver back to the pool or quit if the pool is full.
        try:
            self.selenium_driver_pool.put(driver, block=False)
        except queue.Full:
            #Pool is full, quit this driver
            driver.quit()
    
    def get_next_user_agent(self):
        # Get the enxt user agent in the rotation
        ua = self.user_agent[self.current_ua_index]
        self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents)
        return ua

    def detect_scraper_type(self, url, content=None):
        """
        Determine whether to use beautifulsoup or selenium to scrape the given URL

        Args:
            url: URL to scrape
            content: Optional content of the page to analyze

        Returns:
            str: 'selenium' or 'beautifulsoup'
        """
        # Parse domain from URL
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain=domain[4:]

        # Check if the doman is in known-selenium-required list
        for selenium_domain in self.SELENIUM_REQUIRED_DOMAINS:
            if domain == selenium_domain or domain.endswith('.' + selenium_domain):
                logger.info(f"Domain {domain} is known to require Selenium")
                return 'selenium'
        # If the content is not provided make a quick head request to check some headers
        if not content:
            try:
                headers = {'User-Agent': self.get_next_user_agent()}
                response = requests.head(url, headers=headers, timeout=5)

                # Check the content type
                content_type = response.headers.get('Content-type', '').lower()
                if 'application/json' in content_type:
                    logger.info(f"URL return JSON, likely a SPA or API - using selenium")
                    return 'selenium'
                    
                    # Check for SPA frameworks in headers
                for header, value in response.headers.items():
                    header_lower = header.lower()
                    value_lower = value.lower()
                    if ('x-powered-by' in header_lower and
                    any(fw in value_lower for fw in ['react', 'vue', 'angular','next'])):
                        logger.info(f"SPA framework detected in headers - using Selenium")
                        return 'Selenium'
            except Exception as e:
                logger.warning(f"Erorr while checking headers to {url}: {str(e)}")
                return 'selenium'
        
        # If content is provided analyze it for JS dependencies
        if content:
            soup = BeautifulSoup(content, 'html.parser')

            # Check for SPA meta tags
            meta_tags = soup.find_all('meta')
            for tag in meta_tags:
                if tag.get('name') == 'generator' and any(
                    fw in tag.get('content', '').lower()
                    for fw in ['react', 'vue', 'angular', 'next', 'gatsby']):
                    logger.info(f" SPA meta tag detected - using Selenium")
                    return 'selenium'
            # Check script tags for known JS frameworks
            script_tags = soup.find_all('script')
            for script in script_tags:
                src = script.get('src', '')
                script_content = script.string if script.string else ''

                # check for the src attributes
                if any(indicator in src.lower() for indicator in self.JS_INDICATORS):
                    logger.info(f"JS framework detected in script src - using Selenium")
                    return 'selenium'

                # Check inline for the script content
                if script-content and any(indicator in script_content.lower() for indicator in self.JS_INDICATORS):
                    logger.info(f"JS framework detected in script content - using Selenium")
                    return 'selenium'
            
            # Check for dynamic content selectors
            for selector in self.DYNAMIC_CONTENT_SELECTORS:
                if soup.select(selector):
                    logger.info(f"Dynamic content selector detected - using Selenium")
                    return 'selenium'
            
            #Check for lazy-loaded images
            images = soup.find_all('img')
            for img in images:
                if img.get('data-src') or img.get('data-lazy-src'):
                    logger.info(f"Lazy-loaded images detected - using Selenium")
                    return 'selenium'

        # If nothing suggests Selenium is needed then use BeautifulSoup
        logger.info(f"No indicators of dynamic content detected - using BeautifulSoup")
        return 'bs4'
    
    # Function to scrape the data with beautiful soup
    def scrape_with_bs4(self, url, headers=None, proxy=None, retry_count=0):
         """
        Scrape the given URL using BeautifulSoup

        Args:
            url: URL to scrape
            headers: Optional headers to use
            proxy: Optional proxy to use
            retry_count: Current retry count
        Returns:
            tuple: (content, None) if successful, (None, error) if failed
         """
        start_time = time.time()

        try:
            if not headers:
                headers = self.default_headers.copy()
                if self.user_agent_rotation:
                    headers['User-Agent'] = self.get_next_user_agent()

                    # Set up proxy
                    proxies = None
                    if proxy:
                        if isinstance(proxy, dict):
                            proxies = proxy
                        elif isinstance(proxy, str):
                            proxies = {'http': proxy, 'https': proxy}
                        elif hasattr(proxy, 'get_formatted_proxy'):
                            proxies = proxy.get_formatted_proxy()
                    
                    # Make the request
                    response = requests.get(
                        url,
                        headers=headers,
                        proxies=proxies,
                        timeout=self.timeout
                    )
                    response.raise_for_status()

                    # Update proxy success count if applucable
                    


            











