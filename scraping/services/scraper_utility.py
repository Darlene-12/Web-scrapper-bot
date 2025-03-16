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
    Utility class that provides methods for determining when to use BeautifulSoup vs Selenium,
    handles proxy rotation, and provides improved scraping capabilities.
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
        
        # List of common user agents for rotation - MOVED UP BEFORE INITIALIZATION
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
        
        # Initialize the driver pool - NOW AFTER USER AGENTS ARE DEFINED
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

                