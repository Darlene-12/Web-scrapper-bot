import time
import logging
import requests
import json
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from django.utils import timezone

from ..models import ScrapedData, ScrapingProxy

# Set up logging
logger = logging.getLogger(__name__)

class BaseScraper:
    """
    Universal base scraper class that provides core functionality for all types of scraping.
    This class is designed to be flexible and handle any type of content from any website.
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
        
        # Parse URL components for later use
        self.parsed_url = urlparse(url)
        self.domain = self.parsed_url.netloc
        self.base_url = f"{self.parsed_url.scheme}://{self.domain}"
        
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
            elif isinstance(self.proxy, dict) and 'http' in self.proxy:
                proxy_string = self.proxy['http']
            elif isinstance(self.proxy, str):
                proxy_string = self.proxy
            
            if proxy_string:
                chrome_options.add_argument(f'--proxy-server={proxy_string}')
        
        # Add performance-improving options
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-infobars")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-popup-blocking")
        
        # Add experimental options to avoid detection
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
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
                
                # Wait for common content containers
                try:
                    common_selectors = [
                        "main", "#content", ".content", "article", ".article", 
                        ".product", ".container", "#main", ".main-content",
                        ".post", ".page", "body > div > div"
                    ]
                    
                    # Combine selectors for a single check
                    combined_selector = ", ".join(common_selectors)
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, combined_selector))
                    )
                except TimeoutException:
                    # Not critical if this fails
                    logger.warning(f"No common content containers found for {self.url}")
                
                # Additional wait for any JS-rendered content
                time.sleep(2)
                
                # Scroll in increments to trigger lazy loading
                self._scroll_page(driver)
                
                # Check for cookie notice and try to dismiss it
                self._handle_common_overlays(driver)
                
                # Get the page content
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
                    elif isinstance(self.proxy, dict):
                        proxies = self.proxy
                    elif isinstance(self.proxy, str):
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
    
    def _scroll_page(self, driver):
        """
        Scroll the page in increments to trigger lazy loading.
        
        Args:
            driver: Selenium WebDriver instance
        """
        try:
            # Get page dimensions
            total_height = driver.execute_script("return document.body.scrollHeight")
            viewport_height = driver.execute_script("return window.innerHeight")
            
            # Calculate number of scroll steps (minimum 3)
            scroll_steps = max(3, total_height // viewport_height)
            
            # Scroll in increments
            for i in range(scroll_steps):
                scroll_position = (i + 1) * (total_height / scroll_steps)
                driver.execute_script(f"window.scrollTo(0, {scroll_position});")
                time.sleep(0.5)  # Short pause for content to load
            
            # Scroll back to top
            driver.execute_script("window.scrollTo(0, 0);")
            
        except Exception as e:
            logger.warning(f"Error during page scrolling: {str(e)}")
    
    def _handle_common_overlays(self, driver):
        """
        Try to handle common overlays like cookie notices and popups.
        
        Args:
            driver: Selenium WebDriver instance
        """
        try:
            # Common button text for cookie/consent notices
            consent_buttons = [
                # Cookie consent buttons
                "//button[contains(., 'Accept')]",
                "//button[contains(., 'Agree')]",
                "//button[contains(., 'OK')]", 
                "//button[contains(., 'I agree')]",
                "//button[contains(., 'Accept all')]",
                "//button[contains(., 'Accept cookies')]",
                "//button[contains(., 'Got it')]",
                
                # Cookie consent buttons (CSS)
                "button.accept-cookies", 
                ".cookie-accept", 
                ".cookie-consent-accept",
                "#accept-cookies", 
                "#acceptCookies",
                
                # Modal close buttons
                "//button[contains(@class, 'close')]",
                "//div[contains(@class, 'modal')]//button",
                ".modal-close", 
                ".popup-close", 
                ".close-button"
            ]
            
            # Try each button selector
            for selector in consent_buttons:
                try:
                    # Determine if it's XPath or CSS
                    by_type = By.XPATH if selector.startswith("//") else By.CSS_SELECTOR
                    
                    # Find and click the button with a short timeout
                    button = WebDriverWait(driver, 3).until(
                        EC.element_to_be_clickable((by_type, selector))
                    )
                    button.click()
                    logger.info(f"Clicked overlay element: {selector}")
                    time.sleep(0.5)  # Short pause after clicking
                    break  # Stop after first successful click
                    
                except (TimeoutException, NoSuchElementException):
                    continue  # Try next selector
                
        except Exception as e:
            # Not critical if this fails
            logger.info(f"Could not handle overlays: {str(e)}")
    
    def parse_content(self, html_content):
        """
        Parse the HTML content into structured data.
        Universal parser designed to extract common web elements.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Structured data extracted from the HTML
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract basic metadata
        metadata = self._extract_metadata(soup)
        
        # Extract text content
        text_content = self._extract_text_content(soup)
        
        # Extract links
        links = self._extract_links(soup)
        
        # Extract images
        images = self._extract_images(soup)
        
        # Extract structured data (JSON-LD)
        structured_data = self._extract_json_ld(soup)
        
        # Look for common elements
        common_elements = self._detect_common_elements(soup)
        
        # Combine all data
        result = {
            'url': self.url,
            'domain': self.domain,
            'metadata': metadata,
            'text_content_sample': text_content[:3000] if text_content else '',  # First 3000 chars only
            'links': links[:30],  # Limit to top 30 links
            'images': images[:15],  # Limit to top 15 images
            'structured_data': structured_data,
            'common_elements': common_elements,
            'content_stats': {
                'text_length': len(text_content),
                'word_count': len(text_content.split()) if text_content else 0,
                'link_count': len(links),
                'image_count': len(images)
            }
        }
        
        return result
    
    def _extract_metadata(self, soup):
        """
        Extract metadata from the page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            dict: Page metadata
        """
        metadata = {
            'title': None,
            'description': None,
            'keywords': None,
            'canonical_url': None,
            'language': None,
            'favicon': None,
            'og_data': {},
            'twitter_data': {}
        }
        
        # Extract title
        if soup.title:
            metadata['title'] = soup.title.string.strip() if soup.title.string else None
        
        # Extract meta tags
        for meta in soup.find_all('meta'):
            # Description
            if meta.get('name') == 'description' and meta.get('content'):
                metadata['description'] = meta['content'].strip()
                
            # Keywords
            elif meta.get('name') == 'keywords' and meta.get('content'):
                metadata['keywords'] = [k.strip() for k in meta['content'].split(',')]
                
            # OpenGraph data
            elif meta.get('property') and meta['property'].startswith('og:') and meta.get('content'):
                key = meta['property'][3:]  # Remove 'og:' prefix
                metadata['og_data'][key] = meta['content'].strip()
                
            # Twitter card data
            elif meta.get('name') and meta['name'].startswith('twitter:') and meta.get('content'):
                key = meta['name'][8:]  # Remove 'twitter:' prefix
                metadata['twitter_data'][key] = meta['content'].strip()
        
        # Extract canonical URL
        canonical = soup.find('link', rel='canonical')
        if canonical and canonical.get('href'):
            metadata['canonical_url'] = canonical['href']
            
        # Extract language
        html_tag = soup.find('html')
        if html_tag and html_tag.get('lang'):
            metadata['language'] = html_tag['lang']
            
        # Extract favicon
        favicon = soup.find('link', rel=lambda r: r and ('icon' in r or 'shortcut' in r))
        if favicon and favicon.get('href'):
            href = favicon['href']
            if href.startswith('/'):
                href = urljoin(self.base_url, href)
            metadata['favicon'] = href
            
        return metadata
    
    def _extract_text_content(self, soup):
        """
        Extract main text content from the page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            str: Main text content
        """
        # Remove script and style elements
        for script_or_style in soup(['script', 'style', 'noscript', 'svg', 'header', 'footer', 'nav']):
            script_or_style.decompose()
        
        # Try to find main content containers
        main_containers = soup.select('main, article, .post-content, .article-content, #content, .content, .post, .article')
        
        if main_containers:
            # Use the largest container by text length
            container = max(main_containers, key=lambda x: len(x.get_text()))
            return container.get_text(separator='\n', strip=True)
        else:
            # Fallback to body content
            return soup.body.get_text(separator='\n', strip=True) if soup.body else ''
    
    def _extract_links(self, soup):
        """
        Extract links from the page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            list: Links with metadata
        """
        links = []
        
        for a in soup.find_all('a', href=True):
            href = a['href']
            
            # Skip javascript links and anchors
            if href.startswith('javascript:') or href == '#':
                continue
                
            # Resolve relative URLs
            if href.startswith('/'):
                href = urljoin(self.base_url, href)
                
            # Get link text and title
            text = a.get_text(strip=True)
            title = a.get('title', '')
            
            # Determine if internal or external
            is_external = not href.startswith(self.base_url)
            
            links.append({
                'href': href,
                'text': text,
                'title': title,
                'is_external': is_external
            })
            
        return links
    
    def _extract_images(self, soup):
        """
        Extract images from the page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            list: Images with metadata
        """
        images = []
        
        for img in soup.find_all('img'):
            # Try different source attributes (regular src and data-src for lazy loading)
            src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
            
            if not src:
                continue
                
            # Resolve relative URLs
            if src.startswith('/'):
                src = urljoin(self.base_url, src)
                
            # Get alt text and other attributes
            alt = img.get('alt', '')
            title = img.get('title', '')
            width = img.get('width', '')
            height = img.get('height', '')
            
            images.append({
                'src': src,
                'alt': alt,
                'title': title,
                'width': width,
                'height': height
            })
            
        return images
    
    def _extract_json_ld(self, soup):
        """
        Extract JSON-LD structured data.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            list: Structured data objects
        """
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        structured_data = []
        
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                structured_data.append(data)
            except (json.JSONDecodeError, TypeError, ValueError):
                continue
                
        return structured_data
    
    def _detect_common_elements(self, soup):
        """
        Detect common page elements like products, reviews, articles, etc.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            dict: Detected elements by type
        """
        detected = {}
        
        # Check for products
        product_containers = soup.select('.product, .product-item, [itemtype*="Product"], [data-product-id]')
        if product_containers:
            detected['products'] = {
                'count': len(product_containers),
                'sample': self._extract_product_sample(product_containers[0]) if product_containers else None
            }
            
        # Check for reviews
        review_containers = soup.select('.review, .customer-review, [itemtype*="Review"], [data-review-id]')
        if review_containers:
            detected['reviews'] = {
                'count': len(review_containers),
                'sample': self._extract_review_sample(review_containers[0]) if review_containers else None
            }
            
        # Check for articles
        article_containers = soup.select('article, .post, .article, [itemtype*="Article"]')
        if article_containers:
            detected['articles'] = {
                'count': len(article_containers),
                'sample': self._extract_article_sample(article_containers[0]) if article_containers else None
            }
            
        # Check for tables
        tables = soup.find_all('table')
        if tables:
            detected['tables'] = {
                'count': len(tables),
                'sample': self._extract_table_sample(tables[0]) if tables else None
            }
            
        # Check for forms
        forms = soup.find_all('form')
        if forms:
            detected['forms'] = {
                'count': len(forms),
                'sample': self._extract_form_sample(forms[0]) if forms else None
            }
            
        return detected
    
    def _extract_product_sample(self, product_element):
        """Extract sample data from a product element."""
        sample = {}
        
        # Try to extract title
        title_elem = product_element.select_one('.product-title, .product-name, h2, h3, [itemprop="name"]')
        if title_elem:
            sample['title'] = title_elem.get_text(strip=True)
            
        # Try to extract price
        price_elem = product_element.select_one('.price, .product-price, [itemprop="price"]')
        if price_elem:
            sample['price'] = price_elem.get_text(strip=True)
            
        # Try to extract image
        img_elem = product_element.select_one('img')
        if img_elem and (img_elem.get('src') or img_elem.get('data-src')):
            src = img_elem.get('src') or img_elem.get('data-src')
            if src.startswith('/'):
                src = urljoin(self.base_url, src)
            sample['image'] = src
            
        return sample
    
    def _extract_review_sample(self, review_element):
        """Extract sample data from a review element."""
        sample = {}
        
        # Try to extract author
        author_elem = review_element.select_one('.author, .reviewer, [itemprop="author"]')
        if author_elem:
            sample['author'] = author_elem.get_text(strip=True)
            
        # Try to extract rating
        rating_elem = review_element.select_one('.rating, .stars, [itemprop="ratingValue"]')
        if rating_elem:
            sample['rating'] = rating_elem.get_text(strip=True)
            
        # Try to extract text
        text_elem = review_element.select_one('.text, .content, .review-text, [itemprop="reviewBody"]')
        if text_elem:
            sample['text'] = text_elem.get_text(strip=True)
            
        return sample
    
    def _extract_article_sample(self, article_element):
        """Extract sample data from an article element."""
        sample = {}
        
        # Try to extract title
        title_elem = article_element.select_one('h1, h2, .title, [itemprop="headline"]')
        if title_elem:
            sample['title'] = title_elem.get_text(strip=True)
            
        # Try to extract author
        author_elem = article_element.select_one('.author, .byline, [itemprop="author"]')
        if author_elem:
            sample['author'] = author_elem.get_text(strip=True)
            
        # Try to extract date
        date_elem = article_element.select_one('.date, time, [itemprop="datePublished"]')
        if date_elem:
            sample['date'] = date_elem.get_text(strip=True)
            
        # Try to extract summary
        summary_elem = article_element.select_one('.summary, .excerpt, [itemprop="description"]')
        if summary_elem:
            sample['summary'] = summary_elem.get_text(strip=True)
            
        return sample
    
    def _extract_table_sample(self, table_element):
        """Extract sample data from a table element."""
        headers = []
        rows = []
        
        # Extract headers
        th_elements = table_element.select('th')
        if th_elements:
            headers = [th.get_text(strip=True) for th in th_elements]
            
        # Extract a few rows (up to 3)
        tr_elements = table_element.select('tr')
        for i, tr in enumerate(tr_elements[:4]):  # First 4 rows max
            # Skip header row if we already extracted headers
            if i == 0 and headers:
                continue
                
            # Extract cells
            td_elements = tr.select('td')
            if td_elements:
                row = [td.get_text(strip=True) for td in td_elements]
                rows.append(row)
                
        return {
            'headers': headers,
            'row_sample': rows,
            'row_count': len(table_element.select('tr')),
            'col_count': len(headers) or len(rows[0]) if rows else 0
        }
    
    def _extract_form_sample(self, form_element):
        """Extract sample data from a form element."""
        fields = []
        
        # Extract form fields
        for input_elem in form_element.select('input, textarea, select'):
            field_type = input_elem.name
            
            if input_elem.name == 'input':
                field_type = input_elem.get('type', 'text')
                
            # Skip hidden and submit fields
            if field_type in ['hidden', 'submit', 'button']:
                continue
                
            field = {
                'type': field_type,
                'name': input_elem.get('name', ''),
                'id': input_elem.get('id', '')
            }
            
            # Get label if available
            if input_elem.get('id'):
                label_elem = form_element.select_one(f'label[for="{input_elem["id"]}"]')
                if label_elem:
                    field['label'] = label_elem.get_text(strip=True)
                    
            fields.append(field)
            
        return {
            'action': form_element.get('action', ''),
            'method': form_element.get('method', 'get'),
            'field_count': len(fields),
            'fields_sample': fields[:5]  # First 5 fields max
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
            
            # Get source IP (for tracking purposes)
            try:
                ip_response = requests.get('https://api.ipify.org', timeout=5)
                source_ip = ip_response.text.strip()
            except:
                # Not critical if this fails
                pass
                
        except Exception as e:
            status = 'failed'
            self.error = str(e)
            logger.error(f"Error during scraping process: {str(e)}")
        
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
        
        Returns:
            str: Data type identifier
        """
        return 'general'