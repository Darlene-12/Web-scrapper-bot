import logging
from urllib.parse import urlparse
from bs4 import BeautifulSoup

from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class CustomSelectorScraper(BaseScraper):
    """
    A specialized scraper that allows users to define their own selectors for extracting data.
    This provides maximum flexibility by letting users specify exactly what to extract.
    """
    
    def __init__(self, url, selectors=None, data_type='custom', include_raw_html=False, 
                 include_metadata=True, transform_options=None, **kwargs):
        """
        Initialize the custom selector scraper.
        
        Args:
            url (str): URL to scrape
            selectors (dict): Mapping of field names to CSS or XPath selectors
                Examples:
                    - Simple: {'title': 'h1.title', 'price': '.product-price'}
                    - Advanced: {
                        'images': {
                            'selector': 'img.product-image', 
                            'attribute': 'src', 
                            'multiple': True
                        }
                      }
            data_type (str): Type of data being scraped (for categorization)
            include_raw_html (bool): Whether to include raw HTML in results
            include_metadata (bool): Whether to include page metadata
            transform_options (dict): Data transformation options
            **kwargs: Additional arguments for the base scraper
        """
        super().__init__(url, **kwargs)
        self.selectors = selectors or {}
        self.data_type = data_type
        self.include_raw_html = include_raw_html
        self.include_metadata = include_metadata
        self.transform_options = transform_options or {
            'trim': True,
            'remove_empty': True,
            'normalize_text': True,
            'convert_numbers': True,
            'parse_dates': True
        }
    
    def parse_content(self, html_content):
        """
        Parse HTML content using the user-defined selectors.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Structured data based on the defined selectors
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        parsed_url = urlparse(self.url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Initialize results with basic info
        results = {
            'url': self.url,
            'extracted_data': {}
        }
        
        # Extract data according to selectors
        from .scraper_utility import ScraperUtility
        scraper_utility = ScraperUtility()
        
        extracted_data = scraper_utility.extract_with_selectors(
            html_content, self.selectors, base_url
        )
        
        # Transform the data if needed
        if self.transform_options:
            extracted_data = scraper_utility.transform_data(
                extracted_data, self.transform_options
            )
        
        results['extracted_data'] = extracted_data
        
        # Include page metadata if requested
        if self.include_metadata:
            results['metadata'] = self._extract_metadata(soup)
        
        # Include raw HTML if requested (can be large)
        if self.include_raw_html:
            results['raw_html'] = html_content
        
        return results
    
    def _extract_metadata(self, soup):
        """Extract basic metadata from the page."""
        metadata = {
            'title': None,
            'description': None,
            'canonical_url': None,
            'language': None,
            'favicon': None,
            'meta_tags': {}
        }
        
        # Extract title
        if soup.title:
            metadata['title'] = soup.title.string.strip() if soup.title.string else None
        
        # Extract meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and 'content' in meta_desc.attrs:
            metadata['description'] = meta_desc['content'].strip()
        
        # Extract canonical URL
        canonical = soup.find('link', rel='canonical')
        if canonical and 'href' in canonical.attrs:
            metadata['canonical_url'] = canonical['href']
        
        # Extract language
        html_tag = soup.find('html')
        if html_tag and 'lang' in html_tag.attrs:
            metadata['language'] = html_tag['lang']
        
        # Extract favicon
        favicon = soup.find('link', rel=lambda r: r and ('icon' in r or 'shortcut' in r))
        if favicon and 'href' in favicon.attrs:
            # Handle relative URLs
            if favicon['href'].startswith('/'):
                parsed_url = urlparse(self.url)
                base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                metadata['favicon'] = base_url + favicon['href']
            else:
                metadata['favicon'] = favicon['href']
        
        # Extract other meta tags
        for meta in soup.find_all('meta'):
            if 'name' in meta.attrs and 'content' in meta.attrs:
                metadata['meta_tags'][meta['name']] = meta['content']
        
        return metadata
    
    def get_data_type(self):
        """Return the data type specified for this scraper instance."""
        return self.data_type


class TemplateBasedScraper(CustomSelectorScraper):
    """
    A scraper that uses pre-defined templates based on URL patterns.
    This is useful for repeatedly scraping the same type of page across different URLs.
    """
    
    def __init__(self, url, template, **kwargs):
        """
        Initialize with a template.
        
        Args:
            url (str): URL to scrape
            template (dict): Scraping template with selectors and settings
                Example: {
                    'name': 'Product Template',
                    'selectors': {...},
                    'data_type': 'product',
                    'transform_options': {...}
                }
            **kwargs: Additional arguments for the CustomSelectorScraper
        """
        # Extract settings from template
        selectors = template.get('selectors', {})
        data_type = template.get('data_type', 'template')
        transform_options = template.get('transform_options')
        
        # Initialize with template settings
        super().__init__(
            url=url,
            selectors=selectors,
            data_type=data_type,
            transform_options=transform_options,
            **kwargs
        )
        
        # Store the template name for reference
        self.template_name = template.get('name', 'Unnamed Template')
    
    def parse_content(self, html_content):
        """
        Parse content using the template.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Results with template information
        """
        # Get normal extraction results
        results = super().parse_content(html_content)
        
        # Add template information
        results['template'] = {
            'name': self.template_name
        }
        
        return results


class PatternDetectionScraper(BaseScraper):
    """
    A scraper that automatically detects and extracts common patterns.
    This is useful for exploratory scraping when you don't know the page structure.
    """
    
    def __init__(self, url, patterns=None, include_raw_html=False, transform_options=None, **kwargs):
        """
        Initialize pattern detection scraper.
        
        Args:
            url (str): URL to scrape
            patterns (dict, optional): Custom patterns to detect
            include_raw_html (bool): Whether to include raw HTML
            transform_options (dict): Data transformation options
            **kwargs: Additional arguments for the base scraper
        """
        super().__init__(url, **kwargs)
        self.patterns = patterns  # Use default patterns if None
        self.include_raw_html = include_raw_html
        self.transform_options = transform_options
    
    def parse_content(self, html_content):
        """
        Parse content by detecting common patterns.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Detected patterns and data
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        parsed_url = urlparse(self.url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Initialize results
        results = {
            'url': self.url,
            'patterns_detected': {}
        }
        
        # Detect patterns
        from .scraper_utility import ScraperUtility
        scraper_utility = ScraperUtility()
        
        detected_patterns = scraper_utility.detect_patterns(
            html_content, self.patterns, base_url
        )
        
        # Transform the data if needed
        if self.transform_options and detected_patterns:
            for pattern_name, pattern_data in detected_patterns.items():
                detected_patterns[pattern_name] = scraper_utility.transform_data(
                    pattern_data, self.transform_options
                )
        
        results['patterns_detected'] = detected_patterns
        
        # Add summary of what was found
        summary = {}
        for pattern_name, pattern_data in detected_patterns.items():
            if isinstance(pattern_data, list):
                summary[pattern_name] = len(pattern_data)
            else:
                summary[pattern_name] = 1
        
        results['pattern_summary'] = summary
        
        # Add page metadata
        results['metadata'] = {
            'title': soup.title.string.strip() if soup.title and soup.title.string else None,
        }
        
        # Include raw HTML if requested
        if self.include_raw_html:
            results['raw_html'] = html_content
        
        return results
    
    def get_data_type(self):
        """Return the data type for this scraper."""
        return 'pattern_detection'