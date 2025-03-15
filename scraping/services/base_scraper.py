import time
import logging
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from django.utils import timezone

from ..models import ScrapedData, ScrapingProxy

# Set up logging
logger = logging.getLogger(__name__)

class BaseScraper:
    """
    Base scraper class that provides common functionality for all scrapers.
    This class handles browser setup, request handling, and error management.
    """
    
    def __init__(self, url, keywords=None, use_selenium=False, proxy=None, timeout=30, headers=None):
        """
        Initialize the scraper with target URL and options.
        
        Args:
            url (str): The URL to scrape
            keywords (str, optional): Search keywords associated with this scrape
            use_selenium (bool): Whether to use Selenium for browser automation
            proxy (ScrapingProxy, optional): Proxy to use for the request
            timeout (int): Request timeout in seconds
            headers (dict, optional): Custom HTTP headers to use
        """
        self.url = url
        self.keywords = keywords or ''
        self.use_selenium = use_selenium
        self.proxy = proxy
        self.timeout = timeout
        self.data = {}
        self.error = None
        self.processing_time = None
        
        # Set default headers if none provided
        self.headers = headers or {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
        }
    
    def _setup_selenium(self):
        """
        Set up Selenium WebDriver with appropriate options.
        
        Returns:
            webdriver: Configured Chrome WebDriver instance
        """
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(f"user-agent={self.headers['User-Agent']}")
        
        # Add proxy if specified
        if self.proxy:
            proxy_string = None
            if hasattr(self.proxy, 'get_formatted_proxy'):
                proxy_dict = self.proxy.get_formatted_proxy()
                proxy_string = proxy_dict.get('http')
            
            if proxy_string:
                chrome_options.add_argument(f'--proxy-server={proxy_string}')
        
        # Install and set up the WebDriver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(self.timeout)
        
        return driver
    
    def get_page_content(self):
        """
        Get the page content using either requests or Selenium.
        
        Returns:
            str: HTML content of the page
            
        Raises:
            Exception: If there's an error during the request
        """
        start_time = time.time()
        
        try:
            if self.use_selenium:
                driver = self._setup_selenium()
                driver.get(self.url)
                
                # Wait for the page to load
                WebDriverWait(driver, self.timeout).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
                
                # Wait for specific elements that might indicate page readiness
                try:
                    # Try to wait for common content containers
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, 
                            "main, #content, .content, article, .article, .product, .container, .product-info"))
                    )
                except:
                    # Not critical if this fails
                    pass
                
                # Additional wait for any JS-rendered content
                time.sleep(2)
                
                # Scroll down to trigger lazy loading
                driver.execute_script(
                    "window.scrollTo(0, document.body.scrollHeight / 2);"
                )
                time.sleep(1)
                
                # Scroll to bottom
                driver.execute_script(
                    "window.scrollTo(0, document.body.scrollHeight);"
                )
                time.sleep(1)
                
                # Scroll back to top
                driver.execute_script("window.scrollTo(0, 0);")
                
                content = driver.page_source
                driver.quit()
                
                self.processing_time = time.time() - start_time
                return content
            else:
                # Set up proxy for requests if needed
                proxies = None
                if self.proxy:
                    if hasattr(self.proxy, 'get_formatted_proxy'):
                        proxies = self.proxy.get_formatted_proxy()
                    else:
                        proxies = {'http': self.proxy, 'https': self.proxy}
                
                response = requests.get(
                    self.url,
                    headers=self.headers,
                    timeout=self.timeout,
                    proxies=proxies
                )
                response.raise_for_status()
                
                self.processing_time = time.time() - start_time
                return response.text
                
        except Exception as e:
            self.processing_time = time.time() - start_time
            self.error = str(e)
            logger.error(f"Error scraping {self.url}: {str(e)}")
            raise
    
    def parse_content(self, html_content):
        """
        Parse the HTML content into structured data.
        This method should be overridden by subclasses.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Structured data extracted from the HTML
        """
        # Base implementation just creates a simple soup object
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract title and meta description as basic data
        title = soup.title.string if soup.title else ''
        meta_desc = ''
        meta_tag = soup.find('meta', attrs={'name': 'description'})
        if meta_tag and 'content' in meta_tag.attrs:
            meta_desc = meta_tag['content']
        
        # Extract all text content
        text_content = soup.get_text(separator='\n', strip=True)
        
        # Extract links
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text(strip=True)
            if href and text:
                links.append({'href': href, 'text': text})
        
        # Extract images
        images = []
        for img in soup.find_all('img', src=True):
            src = img['src']
            alt = img.get('alt', '')
            if src:
                images.append({'src': src, 'alt': alt})
        
        return {
            'title': title.strip() if title else '',
            'meta_description': meta_desc.strip(),
            'url': self.url,
            'links_count': len(links),
            'images_count': len(images),
            'text_sample': text_content[:1000] if text_content else '',
            'links': links[:20],  # Limit to top 20 links
            'images': images[:10],  # Limit to top 10 images
        }
    
    def scrape(self):
        """
        Main scraping method that orchestrates the scraping process.
        
        Returns:
            ScrapedData: The created ScrapedData instance
        """
        source_ip = None
        status = 'success'
        
        try:
            html_content = self.get_page_content()
            self.data = self.parse_content(html_content)
            
            # Get source IP
            try:
                ip_response = requests.get('https://api.ipify.org', timeout=5)
                source_ip = ip_response.text.strip()
            except:
                # Not critical if this fails
                pass
                
        except Exception as e:
            status = 'failed'
            self.error = str(e)
        
        # Create and return the ScrapedData instance
        scraped_data = ScrapedData.objects.create(
            url=self.url,
            keywords=self.keywords,
            content=self.data if self.data else {'error': self.error},
            data_type=self.get_data_type(),
            status=status,
            error_message=self.error,
            processing_time=self.processing_time,
            source_ip=source_ip,
            headers_used=self.headers,
            selenium_used=self.use_selenium
        )
        
        # Update proxy statistics if used
        if self.proxy and hasattr(self.proxy, 'success_count'):
            self.proxy.last_used = timezone.now()
            if status == 'success':
                self.proxy.success_count += 1
            else:
                self.proxy.failure_count += 1
                
            # Update average response time
            if self.proxy.average_response_time:
                self.proxy.average_response_time = (
                    self.proxy.average_response_time * 0.7 + 
                    (self.processing_time or 0) * 0.3
                )
            else:
                self.proxy.average_response_time = self.processing_time
                
            self.proxy.save()
        
        return scraped_data
    
    def get_data_type(self):
        """
        Get the data type for this scraper.
        This method should be overridden by subclasses.
        
        Returns:
            str: Data type identifier
        """
        return 'general'



    