import time
import logging
import requests
import threading
import queue
import asyncio
import aiohttp
import json
import re
import csv
import io
from urllib.parse import urlparse, urljoin
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
from dateutil import parser as date_parser

from ..models import ScrapedData, ScrapingProxy

# Set up logging
logger = logging.getLogger(__name__)

class ScraperUtility:
    """
    Utility class that provides methods for determining when to use BeautifulSoup vs Selenium,
    handles proxy rotation, and provides improved scraping capabilities for any website and any data type.
    """
    
    # JavaScript indicators that suggest Selenium is needed
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
    
    # Common selectors that might be dynamically loaded
    DYNAMIC_CONTENT_SELECTORS = [
        '.loading', '#loading', '.spinner', '#spinner', '.progress',
        '[data-loaded]', '[data-loading]', '.lazy-load', '.async-content',
        '.dynamic-content', '.infinite-scroll', '.ajax-content'
    ]
    
    # Sites known to require Selenium
    SELENIUM_REQUIRED_DOMAINS = [
        'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'linkedin.com',
        'youtube.com', 'tiktok.com', 'amazon.com', 'indeed.com', 'glassdoor.com',
        'zillow.com', 'booking.com', 'airbnb.com', 'target.com', 'walmart.com',
        'bestbuy.com', 'newegg.com', 'ebay.com'
    ]
    
    # Common data patterns to detect
    COMMON_PATTERNS = {
        'product_cards': [
            '.product-card', '.product-item', '.product-container', 
            '[itemtype*="Product"]', '.product-grid-item', '.product-list-item'
        ],
        'article_items': [
            'article', '.article-item', '.blog-post', '.news-item',
            '[itemtype*="Article"]', '.post-item', '.entry'
        ],
        'data_tables': [
            'table', '.data-table', '.table', '.grid', 
            '[role="table"]', '.table-container'
        ],
        'lists': [
            'ul:not(.menu):not(.nav)', 'ol', 'dl', '.list', 
            '[role="list"]', '.item-list'
        ],
        'navigation': [
            'nav', '.navigation', '.menu', '.main-menu', 
            '[role="navigation"]', '.navbar', '.sidebar'
        ],
        'forms': [
            'form', '.form', '.contact-form', '.search-form',
            '[role="form"]', '.input-container'
        ],
        'user_reviews': [
            '.review', '.review-item', '.testimonial', '.comment',
            '[itemtype*="Review"]', '.user-review', '.rating-container'
        ],
        'pagination': [
            '.pagination', '.pager', '.pages', '.nav-links',
            '[role="navigation"][aria-label*="pagination"]'
        ]
    }

    def __init__(self, proxy_manager=None, max_retries=3, timeout=30, user_agent_rotation=True):
        """
        Initialize the scraper utility.
        
        Args:
            proxy_manager: Optional manager for proxy rotation
            max_retries: Maximum number of retry attempts for failed requests
            timeout: Request timeout in seconds
            user_agent_rotation: Whether to rotate user agents
        """
        self.proxy_manager = proxy_manager
        self.max_retries = max_retries
        self.timeout = timeout
        self.user_agent_rotation = user_agent_rotation
        self.selenium_driver_pool = queue.Queue()
        self.max_driver_pool_size = 3  # Maximum number of Selenium drivers to keep in pool
        
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
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 Edg/96.0.1054.29',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/95.0',
        ]
        
        # Current user agent index for rotation
        self.current_ua_index = 0
        
        # Initialize the driver pool
        self._initialize_driver_pool()
    
    
    def _initialize_driver_pool(self):
        """Initialize a pool of Selenium WebDriver instances for reuse."""
        try:
            for _ in range(self.max_driver_pool_size):
                driver = self._create_selenium_driver()
                self.selenium_driver_pool.put(driver)
        except Exception as e:
            logger.warning(f"Failed to initialize driver pool: {str(e)}")
    
    def _create_selenium_driver(self, proxy=None):
        """Create a new Selenium WebDriver instance."""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Set random user agent if rotation is enabled
        if self.user_agent_rotation:
            ua = self.user_agents[self.current_ua_index]
            chrome_options.add_argument(f'user-agent={ua}')
            self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents)
        
        # Add proxy if specified
        if proxy:
            proxy_string = None
            if isinstance(proxy, dict) and 'http' in proxy:
                proxy_string = proxy['http']
            elif isinstance(proxy, str):
                proxy_string = proxy
            elif hasattr(proxy, 'get_formatted_proxy'):
                proxy_dict = proxy.get_formatted_proxy()
                proxy_string = proxy_dict['http']
            
            if proxy_string:
                chrome_options.add_argument(f'--proxy-server={proxy_string}')
        
        # Add performance-improving options
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-infobars")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-popup-blocking")
        
        # Add experimental options
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Create and return the driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(self.timeout)
        
        return driver
    
    def _get_driver_from_pool(self, proxy=None):
        """Get a driver from the pool or create a new one if pool is empty."""
        try:
            driver = self.selenium_driver_pool.get(block=False)
            
            # If proxy is different, quit this driver and create a new one
            if proxy:
                driver.quit()
                driver = self._create_selenium_driver(proxy)
                
            return driver
        except queue.Empty:
            # Pool is empty, create a new driver
            return self._create_selenium_driver(proxy)
    
    def _return_driver_to_pool(self, driver):
        """Return a driver to the pool or quit it if pool is full."""
        try:
            self.selenium_driver_pool.put(driver, block=False)
        except queue.Full:
            # Pool is full, quit this driver
            driver.quit()
    
    def get_next_user_agent(self):
        """Get the next user agent in the rotation."""
        ua = self.user_agents[self.current_ua_index]
        self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents)
        return ua
    
    def detect_scraper_type(self, url, content=None):
        """
        Determine whether to use BeautifulSoup or Selenium for a given URL.
        
        Args:
            url: URL to scrape
            content: Optional pre-fetched page content to analyze
            
        Returns:
            str: 'selenium' or 'bs4'
        """
        # Parse domain from URL
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Check if domain is in known Selenium-required list
        for selenium_domain in self.SELENIUM_REQUIRED_DOMAINS:
            if domain == selenium_domain or domain.endswith(f'.{selenium_domain}'):
                logger.info(f"Domain {domain} is known to require Selenium")
                return 'selenium'
        
        # If content not provided, make a quick head request to check some headers
        if not content:
            try:
                headers = {'User-Agent': self.get_next_user_agent()}
                response = requests.head(url, headers=headers, timeout=5)
                
                # Check content type
                content_type = response.headers.get('Content-Type', '').lower()
                if 'application/json' in content_type:
                    logger.info(f"URL returns JSON, likely a SPA or API - using Selenium")
                    return 'selenium'
                
                # Check for SPA frameworks in headers
                for header, value in response.headers.items():
                    header_lower = header.lower()
                    value_lower = value.lower()
                    if ('x-powered-by' in header_lower and 
                        any(fw in value_lower for fw in ['react', 'vue', 'angular', 'next'])):
                        logger.info(f"SPA framework detected in headers - using Selenium")
                        return 'selenium'
                
            except Exception as e:
                logger.warning(f"Error during head request to {url}: {str(e)}")
                # Fall back to Selenium for safety on errors
                return 'selenium'
        
        # If content provided, analyze it for JS dependencies
        if content:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Check for SPA meta tags
            meta_tags = soup.find_all('meta')
            for tag in meta_tags:
                if tag.get('name') == 'generator' and any(
                    fw in tag.get('content', '').lower() 
                    for fw in ['react', 'vue', 'angular', 'next', 'gatsby']):
                    logger.info(f"SPA meta tag detected - using Selenium")
                    return 'selenium'
            
            # Check script tags for known JavaScript frameworks
            script_tags = soup.find_all('script')
            for script in script_tags:
                src = script.get('src', '')
                script_content = script.string if script.string else ''
                
                # Check src attributes
                if any(indicator in src.lower() for indicator in self.JS_INDICATORS):
                    logger.info(f"JavaScript framework detected in script src - using Selenium")
                    return 'selenium'
                
                # Check inline script content
                if script_content and any(indicator in script_content.lower() for indicator in self.JS_INDICATORS):
                    logger.info(f"JavaScript framework detected in inline script - using Selenium")
                    return 'selenium'
            
            # Check for dynamic content selectors
            for selector in self.DYNAMIC_CONTENT_SELECTORS:
                if soup.select(selector):
                    logger.info(f"Dynamic content selector {selector} found - using Selenium")
                    return 'selenium'
            
            # Check for lazy-loaded images
            images = soup.find_all('img')
            for img in images:
                if img.get('data-src') or img.get('data-lazy-src') or img.get('loading') == 'lazy':
                    logger.info(f"Lazy-loaded images detected - using Selenium")
                    return 'selenium'
        
        # If nothing suggests Selenium is needed, use BeautifulSoup
        logger.info(f"No indicators requiring Selenium found - using BeautifulSoup")
        return 'bs4'
    
    def scrape_with_bs4(self, url, headers=None, proxy=None, retry_count=0):
        """
        Scrape a URL using BeautifulSoup.
        
        Args:
            url: URL to scrape
            headers: Optional headers to use
            proxy: Optional proxy to use
            retry_count: Current retry attempt
            
        Returns:
            tuple: (content, None) if successful, (None, error) if failed
        """
        start_time = time.time()
        
        try:
            # Set up headers
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
            
            # Update proxy success count if applicable
            if hasattr(proxy, 'success_count'):
                proxy.success_count += 1
                proxy.save()
            
            return response.text, None
            
        except requests.RequestException as e:
            # Update proxy failure count if applicable
            if hasattr(proxy, 'failure_count'):
                proxy.failure_count += 1
                proxy.save()
            
            # Retry logic
            if retry_count < self.max_retries:
                logger.warning(f"Request failed for {url}: {str(e)}. Retrying {retry_count + 1}/{self.max_retries}")
                
                # Get a new proxy if available
                new_proxy = proxy
                if self.proxy_manager:
                    new_proxy = self.proxy_manager.get_proxy()
                
                # Wait before retrying
                time.sleep(1 * (retry_count + 1))
                
                return self.scrape_with_bs4(url, headers, new_proxy, retry_count + 1)
            else:
                logger.error(f"All retries failed for {url}: {str(e)}")
                return None, str(e)
    
    def scrape_with_selenium(self, url, proxy=None, retry_count=0, wait_for_selector=None, 
                            wait_time=10, scroll=True, actions=None):
        """
        Scrape a URL using Selenium.
        
        Args:
            url: URL to scrape
            proxy: Optional proxy to use
            retry_count: Current retry attempt
            wait_for_selector: Optional CSS selector to wait for
            wait_time: Time to wait for selector in seconds
            scroll: Whether to scroll to load lazy content
            actions: Optional list of actions to perform
            
        Returns:
            tuple: (content, None) if successful, (None, error) if failed
        """
        start_time = time.time()
        driver = None
        
        try:
            # Get driver from pool
            driver = self._get_driver_from_pool(proxy)
            
            # Navigate to the URL
            driver.get(url)
            
            # Wait for page load
            WebDriverWait(driver, wait_time).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            
            # Wait for specific selector if provided
            if wait_for_selector:
                try:
                    WebDriverWait(driver, wait_time).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, wait_for_selector))
                    )
                except TimeoutException:
                    # Log but continue if selector not found
                    logger.warning(f"Selector '{wait_for_selector}' not found within timeout")
            
            # Execute scroll actions if needed
            if scroll:
                # Scroll to bottom in increments
                total_height = driver.execute_script("return document.body.scrollHeight")
                viewport_height = driver.execute_script("return window.innerHeight")
                scroll_steps = max(1, total_height // viewport_height)
                
                for i in range(scroll_steps):
                    driver.execute_script(f"window.scrollTo(0, {viewport_height * (i+1)});")
                    time.sleep(0.5)  # Short pause to allow content to load
                
                # Scroll back to top
                driver.execute_script("window.scrollTo(0, 0);")
            
            # Perform custom actions if provided
            if actions:
                for action in actions:
                    action_type = action.get('type')
                    
                    if action_type == 'click':
                        selector = action.get('selector')
                        try:
                            element = WebDriverWait(driver, wait_time).until(
                                EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                            )
                            driver.execute_script("arguments[0].click();", element)
                            time.sleep(action.get('wait_after', 1))
                        except (TimeoutException, NoSuchElementException) as e:
                            logger.warning(f"Click action failed on '{selector}': {str(e)}")
                    
                    elif action_type == 'input':
                        selector = action.get('selector')
                        value = action.get('value', '')
                        try:
                            element = WebDriverWait(driver, wait_time).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                            )
                            element.clear()
                            element.send_keys(value)
                            time.sleep(action.get('wait_after', 0.5))
                        except (TimeoutException, NoSuchElementException) as e:
                            logger.warning(f"Input action failed on '{selector}': {str(e)}")
                    
                    elif action_type == 'wait':
                        time.sleep(action.get('seconds', 1))
                    
                    elif action_type == 'execute_script':
                        script = action.get('script', '')
                        if script:
                            driver.execute_script(script)
                            time.sleep(action.get('wait_after', 0.5))
            
            # Give a final wait for any dynamic content
            time.sleep(1)
            
            # Get the page content
            content = driver.page_source
            
            # Update proxy success count if applicable
            if hasattr(proxy, 'success_count'):
                proxy.success_count += 1
                proxy.save()
            
            # Return driver to pool and return content
            self._return_driver_to_pool(driver)
            driver = None  # Clear reference so we don't try to return it again in finally
            
            return content, None
            
        except WebDriverException as e:
            # Update proxy failure count if applicable
            if hasattr(proxy, 'failure_count'):
                proxy.failure_count += 1
                proxy.save()
            
            # Retry logic
            if retry_count < self.max_retries:
                logger.warning(f"Selenium scraping failed for {url}: {str(e)}. Retrying {retry_count + 1}/{self.max_retries}")
                
                # Get a new proxy if available
                new_proxy = proxy
                if self.proxy_manager:
                    new_proxy = self.proxy_manager.get_proxy()
                
                # Wait before retrying
                time.sleep(2 * (retry_count + 1))
                
                # Quit the current driver and don't return it to the pool
                if driver:
                    try:
                        driver.quit()
                    except:
                        pass
                    driver = None
                
                return self.scrape_with_selenium(
                    url, new_proxy, retry_count + 1, 
                    wait_for_selector, wait_time, scroll, actions
                )
            else:
                logger.error(f"All selenium retries failed for {url}: {str(e)}")
                return None, str(e)
                
        finally:
            # Ensure driver is returned to pool or quit if exception occurred
            if driver:
                try:
                    self._return_driver_to_pool(driver)
                except:
                    # If any error occurs while returning to pool, quit the driver
                    try:
                        driver.quit()
                    except:
                        pass
    
    def scrape_url(self, url, force_method=None, **kwargs):
        """
        Scrape a URL using the appropriate method (BeautifulSoup or Selenium).
        
        Args:
            url: URL to scrape
            force_method: Optional 'bs4' or 'selenium' to force a method
            **kwargs: Additional arguments for the scraper
            
        Returns:
            tuple: (content, method, error)
        """
        method = force_method
        
        # Determine method if not forced
        if not method:
            method = self.detect_scraper_type(url)
        
        # Extract relevant kwargs
        headers = kwargs.get('headers')
        proxy = kwargs.get('proxy')
        wait_for_selector = kwargs.get('wait_for_selector')
        wait_time = kwargs.get('wait_time', 10)
        scroll = kwargs.get('scroll', True)
        actions = kwargs.get('actions')
        
        # Scrape using the determined method
        if method == 'bs4':
            content, error = self.scrape_with_bs4(url, headers, proxy)
        else:  # selenium
            content, error = self.scrape_with_selenium(
                url, proxy, 0, wait_for_selector, wait_time, scroll, actions
            )
        
        # If bs4 failed due to JavaScript issues, retry with Selenium
        if method == 'bs4' and error and content is None:
            logger.info(f"BeautifulSoup failed for {url}, falling back to Selenium")
            content, error = self.scrape_with_selenium(
                url, proxy, 0, wait_for_selector, wait_time, scroll, actions
            )
            method = 'selenium' if content else 'bs4'
        
        return content, method, error
    
    def batch_scrape(self, urls, max_workers=5, **kwargs):
        """
        Scrape multiple URLs in parallel using ThreadPoolExecutor.
        
        Args:
            urls: List of URLs to scrape
            max_workers: Maximum number of concurrent workers
            **kwargs: Additional arguments for scrape_url
            
        Returns:
            dict: Map of URL to (content, method, error) tuples
        """
        results = {}
        
        def scrape_worker(url):
            content, method, error = self.scrape_url(url, **kwargs)
            return url, content, method, error
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(scrape_worker, url) for url in urls]
            
            for future in futures:
                url, content, method, error = future.result()
                results[url] = (content, method, error)
        
        return results
    
    async def async_scrape_url(self, url, session=None, **kwargs):
        """
        Asynchronously scrape a URL.
        Note: This uses aiohttp instead of Selenium for performance,
        but will fallback to synchronous Selenium if needed.
        
        Args:
            url: URL to scrape
            session: Optional aiohttp ClientSession
            **kwargs: Additional arguments for the scraper
            
        Returns:
            tuple: (content, method, error)
        """
        # Check if we should force Selenium
        force_method = kwargs.get('force_method')
        if force_method == 'selenium':
            # For Selenium, we need to use the synchronous method
            # We'll run it in a ThreadPoolExecutor to avoid blocking
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(self.scrape_url, url, force_method, **kwargs)
                return await asyncio.wrap_future(future)
        
        # For bs4, we can use aiohttp
        headers = kwargs.get('headers', self.default_headers.copy())
        if self.user_agent_rotation:
            headers['User-Agent'] = self.get_next_user_agent()
        
        proxy = kwargs.get('proxy')
        proxy_url = None
        if proxy:
            if isinstance(proxy, dict) and 'http' in proxy:
                proxy_url = proxy['http']
            elif isinstance(proxy, str):
                proxy_url = proxy
            elif hasattr(proxy, 'get_formatted_proxy'):
                proxy_dict = proxy.get_formatted_proxy()
                proxy_url = proxy_dict['http']
        
        close_session = False
        if session is None:
            session = aiohttp.ClientSession()
            close_session = True
        
        try:
            async with session.get(url, headers=headers, proxy=proxy_url, timeout=self.timeout) as response:
                if response.status >= 400:
                    error = f"HTTP error status: {response.status}"
                    # If we get a 403 or 429, try with Selenium
                    if response.status in (403, 429):
                        logger.info(f"Received status {response.status}, falling back to Selenium for {url}")
                        with ThreadPoolExecutor(max_workers=1) as executor:
                            future = executor.submit(self.scrape_url, url, 'selenium', **kwargs)
                            return await asyncio.wrap_future(future)
                    return None, 'bs4', error
                
                content = await response.text()
                
                # Update proxy success count if applicable
                if hasattr(proxy, 'success_count'):
                    proxy.success_count += 1
                    await self._async_save_proxy(proxy)
                
                # Check if the content needs Selenium after all
                if self.detect_scraper_type(url, content) == 'selenium':
                    logger.info(f"Content analysis suggests Selenium needed for {url}")
                    with ThreadPoolExecutor(max_workers=1) as executor:
                        future = executor.submit(self.scrape_url, url, 'selenium', **kwargs)
                        return await asyncio.wrap_future(future)
                
                return content, 'bs4', None
                
        except Exception as e:
            # Update proxy failure count if applicable
            if hasattr(proxy, 'failure_count'):
                proxy.failure_count += 1
                await self._async_save_proxy(proxy)
            
            error = str(e)
            logger.error(f"Async scraping error for {url}: {error}")
            
            # Fall back to Selenium for any errors
            logger.info(f"Async request failed, falling back to Selenium for {url}")
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(self.scrape_url, url, 'selenium', **kwargs)
                return await asyncio.wrap_future(future)
                
        finally:
            if close_session:
                await session.close()
    
    async def _async_save_proxy(self, proxy):
        """Asynchronously save a proxy object."""
        if not hasattr(proxy, 'save'):
            return
            
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, proxy.save)
    
    async def async_batch_scrape(self, urls, max_concurrent=10, **kwargs):
        """
        Asynchronously scrape multiple URLs.
        
        Args:
            urls: List of URLs to scrape
            max_concurrent: Maximum number of concurrent requests
            **kwargs: Additional arguments for async_scrape_url
            
        Returns:
            dict: Map of URL to (content, method, error) tuples
        """
        results = {}
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def fetch_with_semaphore(url):
            async with semaphore:
                content, method, error = await self.async_scrape_url(url, **kwargs)
                return url, content, method, error
        
        async with aiohttp.ClientSession() as session:
            kwargs['session'] = session
            tasks = [fetch_with_semaphore(url) for url in urls]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            for response in responses:
                if isinstance(response, Exception):
                    logger.error(f"Async batch error: {str(response)}")
                    continue
                
                url, content, method, error = response
                results[url] = (content, method, error)
        
        return results
    
    #
    # NEW FEATURE 1: CUSTOM SELECTOR-BASED EXTRACTION
    #
    def extract_with_selectors(self, html_content, selectors, base_url=None):
        """
        Extract data using user-defined CSS or XPath selectors.
        
        Args:
            html_content: HTML content to parse
            selectors: Dict mapping field names to selector info
                Format: {'field_name': {'type': 'css|xpath', 'selector': 'selector string', 'attribute': 'optional attr'}}
            base_url: Optional base URL for resolving relative URLs
                
        Returns:
            dict: Extracted data with field names as keys
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        result = {}
        
        # Process each selector
        for field_name, selector_info in selectors.items():
            if isinstance(selector_info, str):
                # Simple case: selector_info is just a CSS selector string
                selector_type = 'css'
                selector = selector_info
                attribute = None
            else:
                # Advanced case: selector_info is a dict with type, selector, and optional attribute
                selector_type = selector_info.get('type', 'css').lower()
                selector = selector_info.get('selector', '')
                attribute = selector_info.get('attribute')
                multiple = selector_info.get('multiple', False)
            
            # Skip empty selectors
            if not selector:
                result[field_name] = None
                continue
                
            try:
                # Extract with CSS selectors (BeautifulSoup)
                if selector_type == 'css':
                    elements = soup.select(selector)
                    
                    # No elements found
                    if not elements:
                        result[field_name] = None
                        continue
                    
                    # Determine whether to return a single value or a list
                    if not multiple and len(elements) == 1:
                        element = elements[0]
                        # Extract attribute or text
                        if attribute:
                            if attribute == 'html':
                                result[field_name] = str(element)
                            else:
                                result[field_name] = element.get(attribute)
                                # Handle relative URLs if this is a link
                                if attribute in ['href', 'src'] and base_url and result[field_name]:
                                    if not result[field_name].startswith(('http://', 'https://')):
                                        result[field_name] = urljoin(base_url, result[field_name])
                        else:
                            result[field_name] = element.get_text(strip=True)
                    else:
                        # Multiple elements, always return a list
                        values = []
                        for element in elements:
                            if attribute:
                                if attribute == 'html':
                                    values.append(str(element))
                                else:
                                    value = element.get(attribute)
                                    # Handle relative URLs
                                    if attribute in ['href', 'src'] and base_url and value:
                                        if not value.startswith(('http://', 'https://')):
                                            value = urljoin(base_url, value)
                                    values.append(value)
                            else:
                                values.append(element.get_text(strip=True))
                        result[field_name] = values
                        
                # Extract with XPath selectors (lxml)
                elif selector_type == 'xpath':
                    # We need to use lxml for XPath
                    from lxml import etree
                    
                    # Parse the HTML with lxml
                    parser = etree.HTMLParser()
                    tree = etree.fromstring(html_content, parser)
                    
                    # Execute the XPath query
                    elements = tree.xpath(selector)
                    
                    # No elements found
                    if not elements:
                        result[field_name] = None
                        continue
                    
                    # Determine whether to return a single value or a list
                    if not multiple and len(elements) == 1:
                        element = elements[0]
                        # Extract attribute, text, or element itself
                        if attribute:
                            if attribute == 'html':
                                result[field_name] = etree.tostring(element, encoding='unicode')
                            else:
                                result[field_name] = element.get(attribute)
                                # Handle relative URLs
                                if attribute in ['href', 'src'] and base_url and result[field_name]:
                                    if not result[field_name].startswith(('http://', 'https://')):
                                        result[field_name] = urljoin(base_url, result[field_name])
                        else:
                            # If it's a text node or attribute value
                            if isinstance(element, str):
                                result[field_name] = element
                            else:
                                # Get text content of element
                                result[field_name] = element.text_content().strip() if hasattr(element, 'text_content') else str(element)
                    else:
                        # Multiple elements, always return a list
                        values = []
                        for element in elements:
                            if attribute:
                                if attribute == 'html':
                                    values.append(etree.tostring(element, encoding='unicode') if hasattr(element, 'tag') else str(element))
                                else:
                                    if hasattr(element, 'get'):
                                        value = element.get(attribute)
                                        # Handle relative URLs
                                        if attribute in ['href', 'src'] and base_url and value:
                                            if not value.startswith(('http://', 'https://')):
                                                value = urljoin(base_url, value)
                                        values.append(value)
                                    else:
                                        values.append(str(element))
                            else:
                                # If it's a text node or attribute value
                                if isinstance(element, str):
                                    values.append(element)
                                else:
                                    # Get text content of element
                                    values.append(element.text_content().strip() if hasattr(element, 'text_content') else str(element))
                        result[field_name] = values
                        
                # Extract with JSON-LD selectors
                elif selector_type == 'jsonld':
                    # Find all JSON-LD script tags
                    jsonld_scripts = soup.find_all('script', {'type': 'application/ld+json'})
                    jsonld_data = []
                    
                    # Parse each JSON-LD script
                    for script in jsonld_scripts:
                        try:
                            data = json.loads(script.string)
                            if isinstance(data, list):
                                jsonld_data.extend(data)
                            else:
                                jsonld_data.append(data)
                        except (json.JSONDecodeError, AttributeError):
                            continue
                    
                    # No JSON-LD found
                    if not jsonld_data:
                        result[field_name] = None
                        continue
                    
                    # Use the selector as a dot-notation path to the desired value
                    path_parts = selector.split('.')
                    
                    # Define a function to extract a value using the path
                    def extract_path(obj, path):
                        if not path:
                            return obj
                        if isinstance(obj, dict):
                            if path[0] in obj:
                                return extract_path(obj[path[0]], path[1:])
                        elif isinstance(obj, list):
                            results = []
                            for item in obj:
                                if isinstance(item, (dict, list)):
                                    val = extract_path(item, path)
                                    if val is not None:
                                        results.append(val)
                            return results if results else None
                        return None
                    
                    # Extract values from all JSON-LD objects
                    values = []
                    for data in jsonld_data:
                        val = extract_path(data, path_parts)
                        if val is not None:
                            if isinstance(val, list):
                                values.extend(val)
                            else:
                                values.append(val)
                    
                    # Return single value or list based on results
                    if values:
                        if not multiple and len(values) == 1:
                            result[field_name] = values[0]
                        else:
                            result[field_name] = values
                    else:
                        result[field_name] = None
            
            except Exception as e:
                logger.error(f"Error extracting {field_name} with {selector_type} selector '{selector}': {str(e)}")
                result[field_name] = None
        
        return result
    
    def extract_with_selenium_selectors(self, driver, selectors):
        """
        Extract data using selectors directly with Selenium WebDriver.
        This allows for more advanced interactions like getting computed styles.
        
        Args:
            driver: Selenium WebDriver instance
            selectors: Dict mapping field names to selector info
                
        Returns:
            dict: Extracted data with field names as keys
        """
        result = {}
        
        for field_name, selector_info in selectors.items():
            if isinstance(selector_info, str):
                # Simple case: selector_info is just a CSS selector string
                selector_type = 'css'
                selector = selector_info
                attribute = None
                multiple = False
            else:
                # Advanced case: selector_info is a dict
                selector_type = selector_info.get('type', 'css').lower()
                selector = selector_info.get('selector', '')
                attribute = selector_info.get('attribute')
                extract_method = selector_info.get('extract_method', 'text')  # text, attribute, property, style
                multiple = selector_info.get('multiple', False)
            
            # Skip empty selectors
            if not selector:
                result[field_name] = None
                continue
                
            try:
                if selector_type == 'css':
                    # Get elements with CSS selector
                    if multiple:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    else:
                        try:
                            elements = [driver.find_element(By.CSS_SELECTOR, selector)]
                        except NoSuchElementException:
                            elements = []
                
                elif selector_type == 'xpath':
                    # Get elements with XPath selector
                    if multiple:
                        elements = driver.find_elements(By.XPATH, selector)
                    else:
                        try:
                            elements = [driver.find_element(By.XPATH, selector)]
                        except NoSuchElementException:
                            elements = []
                else:
                    # Unsupported selector type
                    logger.warning(f"Unsupported selector type '{selector_type}' for Selenium extraction")
                    result[field_name] = None
                    continue
                
                # No elements found
                if not elements:
                    result[field_name] = None
                    continue
                
                # Extract values from elements
                values = []
                for element in elements:
                    # Choose extraction method
                    if attribute:
                        # Get specific attribute
                        values.append(element.get_attribute(attribute))
                    elif extract_method == 'property':
                        # Get JavaScript property
                        property_name = selector_info.get('property_name', 'textContent')
                        values.append(driver.execute_script(f"return arguments[0].{property_name};", element))
                    elif extract_method == 'style':
                        # Get computed style
                        style_property = selector_info.get('style_property', 'color')
                        values.append(
                            driver.execute_script(
                                f"return window.getComputedStyle(arguments[0]).getPropertyValue('{style_property}');", 
                                element
                            )
                        )
                    else:
                        # Default to text
                        values.append(element.text)
                
                # Return single value or list based on multiple flag
                if not multiple and values:
                    result[field_name] = values[0]
                else:
                    result[field_name] = values
                    
            except Exception as e:
                logger.error(f"Error extracting {field_name} with Selenium: {str(e)}")
                result[field_name] = None
        
        return result
                
    #
    # NEW FEATURE 2: PATTERN RECOGNITION
    #
    def detect_patterns(self, html_content, patterns=None):
        """
        Detect common patterns in a webpage, such as product lists, articles, tables, etc.
        
        Args:
            html_content: HTML content to analyze
            patterns: Optional dict of pattern names to CSS selectors to use
                
        Returns:
            dict: Detected patterns and their elements
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        results = {}
        
        # Use provided patterns or default ones
        patterns_to_check = patterns or self.COMMON_PATTERNS
        
        for pattern_name, selectors in patterns_to_check.items():
            pattern_elements = []
            
            # Try each selector for this pattern
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    # For each matching element, extract basic info
                    for element in elements:
                        # Create a basic representation of the element
                        element_info = {
                            'html_tag': element.name,
                            'classes': element.get('class', []),
                            'id': element.get('id', ''),
                            'text_preview': element.get_text()[:100].strip() if element.get_text() else '',
                            'has_children': bool(list(element.children)),
                            'child_count': len(list(element.children)),
                        }
                        
                        # Add additional pattern-specific extraction
                        if pattern_name == 'data_tables':
                            # For tables, extract rows and columns
                            rows = element.find_all('tr')
                            element_info['rows'] = len(rows)
                            element_info['columns'] = len(element.find_all('th')) or (
                                len(element.find_all('td')) // len(rows) if rows else 0
                            )
                            
                            # Try to extract headers
                            headers = []
                            header_row = element.find('thead')
                            if header_row:
                                for th in header_row.find_all('th'):
                                    headers.append(th.get_text().strip())
                            element_info['headers'] = headers
                        
                        elif pattern_name == 'product_cards':
                            # For product cards, try to identify price, title, image
                            price_element = element.select_one('.price, [class*="price"], [itemprop="price"]')
                            element_info['has_price'] = bool(price_element)
                            
                            title_element = element.select_one('h1, h2, h3, h4, .title, [itemprop="name"]')
                            element_info['has_title'] = bool(title_element)
                            
                            image_element = element.find('img')
                            element_info['has_image'] = bool(image_element)
                            
                            button_element = element.find('button') or element.select_one('a.button, .btn, [class*="btn"]')
                            element_info['has_button'] = bool(button_element)
                        
                        elif pattern_name == 'forms':
                            # For forms, count inputs and identify submit button
                            inputs = element.find_all('input')
                            element_info['input_count'] = len(inputs)
                            
                            input_types = {}
                            for input_elem in inputs:
                                input_type = input_elem.get('type', 'text')
                                if input_type in input_types:
                                    input_types[input_type] += 1
                                else:
                                    input_types[input_type] = 1
                            element_info['input_types'] = input_types
                            
                            submit_button = element.find('button') or element.find('input', {'type': 'submit'})
                            element_info['has_submit'] = bool(submit_button)
                        
                        pattern_elements.append(element_info)
                
                # If we found elements with this selector, no need to try others
                if pattern_elements:
                    break
            
            # Only include patterns where elements were found
            if pattern_elements:
                results[pattern_name] = pattern_elements
        
        return results
    
    def extract_pattern_data(self, html_content, pattern_type, pattern_selector, fields=None):
        """
        Extract structured data from a detected pattern.
        
        Args:
            html_content: HTML content to parse
            pattern_type: Type of pattern (e.g., 'product_cards', 'data_tables')
            pattern_selector: CSS selector for the pattern container
            fields: Optional dict mapping field names to relative CSS selectors or extraction settings
                
        Returns:
            list: Extracted items from the pattern
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        results = []
        
        # Find all instances of the pattern
        pattern_elements = soup.select(pattern_selector)
        
        # No elements found
        if not pattern_elements:
            return []
        
        # If no fields specified, use defaults based on pattern type
        if not fields:
            if pattern_type == 'product_cards':
                fields = {
                    'title': {'selector': 'h2, h3, h4, .title, [itemprop="name"]'},
                    'price': {'selector': '.price, [class*="price"], [itemprop="price"]'},
                    'image': {'selector': 'img', 'attribute': 'src'},
                    'link': {'selector': 'a', 'attribute': 'href'},
                    'description': {'selector': '.description, [itemprop="description"], p'}
                }
            elif pattern_type == 'data_tables':
                # For tables, we'll handle extraction differently
                return self._extract_table_data(soup, pattern_selector)
            elif pattern_type == 'lists':
                fields = {
                    'text': {'selector': 'li, dt, dd'},
                    'link': {'selector': 'a', 'attribute': 'href'},
                    'link_text': {'selector': 'a'}
                }
            else:
                # Default set of fields for generic patterns
                fields = {
                    'text': {'selector': '*'},
                    'link': {'selector': 'a', 'attribute': 'href'}
                }
        
        # Process each pattern element
        for element in pattern_elements:
            item_data = {}
            
            # Extract each field
            for field_name, field_info in fields.items():
                if isinstance(field_info, str):
                    # Simple case: field_info is just a CSS selector
                    relative_selector = field_info
                    attribute = None
                    multiple = False
                else:
                    # Advanced case: field_info is a dict
                    relative_selector = field_info.get('selector', '')
                    attribute = field_info.get('attribute')
                    multiple = field_info.get('multiple', False)
                
                # Find elements with the relative selector within this pattern element
                field_elements = element.select(relative_selector) if relative_selector else [element]
                
                # Extract values
                if not field_elements:
                    item_data[field_name] = None
                elif not multiple:
                    # Single value
                    field_elem = field_elements[0]
                    if attribute:
                        item_data[field_name] = field_elem.get(attribute)
                    else:
                        item_data[field_name] = field_elem.get_text(strip=True)
                else:
                    # Multiple values
                    values = []
                    for field_elem in field_elements:
                        if attribute:
                            values.append(field_elem.get(attribute))
                        else:
                            values.append(field_elem.get_text(strip=True))
                    item_data[field_name] = values
            
            # Add the item if it has data
            if any(v is not None for v in item_data.values()):
                results.append(item_data)
        
        return results
    
    def _extract_table_data(self, soup, table_selector):
        """
        Extract data from HTML tables into a structured format.
        
        Args:
            soup: BeautifulSoup object
            table_selector: CSS selector for the table
            
        Returns:
            dict: Table data with headers and rows
        """
        tables = soup.select(table_selector)
        results = []
        
        for table in tables:
            table_data = {'headers': [], 'rows': []}
            
            # Extract headers
            thead = table.find('thead')
            if thead:
                headers = [th.get_text(strip=True) for th in thead.find_all('th')]
                if not headers:
                    headers = [th.get_text(strip=True) for th in thead.find_all('td')]
                table_data['headers'] = headers
            
            # If no thead, try to get headers from the first row
            if not table_data['headers']:
                first_row = table.find('tr')
                if first_row:
                    headers = [th.get_text(strip=True) for th in first_row.find_all('th')]
                    if headers:
                        table_data['headers'] = headers
                    else:
                        # If still no th elements, use first row td elements as headers
                        headers = [td.get_text(strip=True) for td in first_row.find_all('td')]
                        table_data['headers'] = headers
            
            # Extract rows
            rows = []
            tbody = table.find('tbody')
            if tbody:
                for tr in tbody.find_all('tr'):
                    row = {}
                    cells = tr.find_all(['td', 'th'])
                    
                    # If we have headers, use them as keys
                    if table_data['headers'] and len(table_data['headers']) == len(cells):
                        for i, cell in enumerate(cells):
                            row[table_data['headers'][i]] = cell.get_text(strip=True)
                    else:
                        # Otherwise, use numeric indices
                        for i, cell in enumerate(cells):
                            row[f"column_{i+1}"] = cell.get_text(strip=True)
                    
                    rows.append(row)
            else:
                # If no tbody, get all rows but skip the first if it's the header
                for i, tr in enumerate(table.find_all('tr')):
                    # Skip the first row if it was used for headers
                    if i == 0 and table_data['headers']:
                        continue
                    
                    row = {}
                    cells = tr.find_all(['td', 'th'])
                    
                    # If we have headers, use them as keys
                    if table_data['headers'] and len(table_data['headers']) == len(cells):
                        for i, cell in enumerate(cells):
                            row[table_data['headers'][i]] = cell.get_text(strip=True)
                    else:
                        # Otherwise, use numeric indices
                        for i, cell in enumerate(cells):
                            row[f"column_{i+1}"] = cell.get_text(strip=True)
                    
                    rows.append(row)
            
            table_data['rows'] = rows
            results.append(table_data)
        
        return results
    
    #
    # NEW FEATURE 3: CONTENT TRANSFORMATION AND CLEANING
    #
    def transform_data(self, data, options=None):
        """
        Transform and clean scraped data based on options.
        
        Args:
            data: Data to transform (can be a dict, list, or primitive value)
            options: Dict of transformation options
                
        Returns:
            Transformed data
        """
        # Default options
        default_options = {
            'trim_strings': True,              # Remove whitespace from string values
            'remove_empty': True,              # Remove None/empty values
            'normalize_whitespace': True,      # Remove extra spaces, newlines
            'convert_numbers': True,           # Convert numeric strings to numbers
            'parse_dates': True,               # Attempt to parse date strings
            'flatten': False,                  # Flatten nested structures
            'flatten_separator': '.',          # Separator for flattened keys
            'extract_domain': False,           # Extract domain from URLs
            'minify_html': False,              # Remove whitespace from HTML
            'strip_html': False,               # Remove HTML tags from strings
            'date_format': '%Y-%m-%d',         # Format for parsed dates
        }
        
        # Merge with user-provided options
        if options:
            default_options.update(options)
        
        # Apply transformations
        return self._apply_transformations(data, default_options)
    
    def _apply_transformations(self, data, options, parent_key=''):
        """
        Recursively apply transformations to data.
        
        Args:
            data: Data to transform
            options: Transformation options
            parent_key: Parent key for flattening
            
        Returns:
            Transformed data
        """
        # Handle different data types
        if isinstance(data, dict):
            return self._transform_dict(data, options, parent_key)
        elif isinstance(data, list):
            return self._transform_list(data, options, parent_key)
        elif isinstance(data, str):
            return self._transform_string(data, options)
        else:
            # Nothing to transform for other types
            return data
    
    def _transform_dict(self, data, options, parent_key=''):
        """Transform dictionary data."""
        result = {}
        
        for key, value in data.items():
            # Skip empty values if remove_empty is True
            if options['remove_empty'] and (value is None or value == '' or value == []):
                continue
            
            # Transform the value
            transformed_value = self._apply_transformations(value, options, f"{parent_key}{key}")
            
            # Skip transformed empty values
            if options['remove_empty'] and (transformed_value is None or transformed_value == '' or transformed_value == []):
                continue
            
            # Handle flattening
            if options['flatten'] and isinstance(transformed_value, dict):
                # Add flattened key-value pairs
                for sub_key, sub_value in transformed_value.items():
                    flat_key = f"{key}{options['flatten_separator']}{sub_key}"
                    result[flat_key] = sub_value
            else:
                # Add the key-value pair as is
                result[key] = transformed_value
        
        return result
    
    def _transform_list(self, data, options, parent_key=''):
        """Transform list data."""
        result = []
        
        for item in data:
            # Transform each item
            transformed_item = self._apply_transformations(item, options, parent_key)
            
            # Skip empty values if remove_empty is True
            if options['remove_empty'] and (transformed_item is None or transformed_item == '' or transformed_item == []):
                continue
            
            result.append(transformed_item)
        
        return result
    
    def _transform_string(self, data, options):
        """Transform string data."""
        # Skip empty strings
        if not data:
            return data
        
        result = data
        
        # Trim whitespace
        if options['trim_strings']:
            result = result.strip()
        
        # Normalize whitespace
        if options['normalize_whitespace']:
            result = re.sub(r'\s+', ' ', result)
        
        # Strip HTML tags
        if options['strip_html']:
            result = re.sub(r'<[^>]*>', '', result)
        
        # Minify HTML (if this is HTML content)
        if options['minify_html'] and ('<' in result and '>' in result):
            result = re.sub(r'>\s+<', '><', result)
        
        # Extract domain from URL
        if options['extract_domain'] and result.startswith(('http://', 'https://')):
            parsed_url = urlparse(result)
            result = parsed_url.netloc
        
        # Convert numbers
        if options['convert_numbers'] and result:
            # Check if string is a number
            if re.match(r'^-?\d+(?:\.\d+)?$', result):
                try:
                    if '.' in result:
                        return float(result)
                    else:
                        return int(result)
                except ValueError:
                    pass
        
        # Parse dates
        if options['parse_dates'] and result:
            try:
                date_obj = date_parser.parse(result, fuzzy=True)
                return date_obj.strftime(options['date_format'])
            except (ValueError, OverflowError):
                pass
        
        return result
    
    def export_data(self, data, format='json', **kwargs):
        """
        Export data to various formats.
        
        Args:
            data: Data to export
            format: Export format ('json', 'csv', 'xml', 'yaml')
            **kwargs: Additional format-specific options
            
        Returns:
            str: Formatted data as a string
        """
        if format.lower() == 'json':
            indent = kwargs.get('indent', 2)
            return json.dumps(data, indent=indent, ensure_ascii=False)
        
        elif format.lower() == 'csv':
            if not data or not isinstance(data, (list, dict)):
                return ''
                
            # Convert data to list if it's a dict
            if isinstance(data, dict):
                data = [data]
                
            # Get fieldnames from first row or from kwargs
            fieldnames = kwargs.get('fieldnames')
            if not fieldnames:
                if isinstance(data[0], dict):
                    fieldnames = list(data[0].keys())
                else:
                    # Can't determine fieldnames
                    return ''
            
            # Create CSV string
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in data:
                # If row is not a dict, skip it
                if not isinstance(row, dict):
                    continue
                    
                # Write the row
                writer.writerow(row)
            
            return output.getvalue()
        
        elif format.lower() == 'xml':
            try:
                from dicttoxml import dicttoxml
                xml_data = dicttoxml(data)
                return xml_data.decode('utf-8')
            except ImportError:
                return f"<error>XML export requires dicttoxml package</error>"
        
        elif format.lower() == 'yaml':
            try:
                import yaml
                return yaml.dump(data, default_flow_style=False)
            except ImportError:
                return f"# YAML export requires PyYAML package"
        
        else:
            return f"Unsupported export format: {format}"
    
    def cleanup(self):
        """Cleanup resources."""
        # Quit all drivers in the pool
        while not self.selenium_driver_pool.empty():
            try:
                driver = self.selenium_driver_pool.get(block=False)
                if driver:
                    driver.quit()
            except queue.Empty:
                break
            except Exception as e:
                logger.error(f"Error during cleanup: {str(e)}")