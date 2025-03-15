import re
import logging
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class ProductScraper(BaseScraper):
    """
    Specialized scraper for extracting product information from e-commerce sites.
    This scraper attempts to identify and extract product details using common patterns.
    """
    
    def parse_content(self, html_content):
        """
        Parse product information from HTML content.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Structured product data
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Initialize product data dictionary
        product_data = {
            'url': self.url,
            'title': self._extract_title(soup),
            'price': self._extract_price(soup),
            'currency': self._extract_currency(soup),
            'description': self._extract_description(soup),
            'features': self._extract_features(soup),
            'specifications': self._extract_specifications(soup),
            'images': self._extract_images(soup),
            'rating': self._extract_rating(soup),
            'review_count': self._extract_review_count(soup),
            'availability': self._extract_availability(soup),
            'brand': self._extract_brand(soup),
            'sku': self._extract_sku(soup),
            'categories': self._extract_categories(soup),
            'variants': self._extract_variants(soup),
        }
        
        # Add structured data if available (JSON-LD)
        structured_data = self._extract_structured_data(soup)
        if structured_data:
            product_data['structured_data'] = structured_data
        
        return product_data
    
    def _extract_title(self, soup):
        """Extract product title."""
        # Try common product title selectors
        selectors = [
            'h1.product-title', 'h1.product-name', 'h1.product_title',
            'h1.productTitle', 'h1.product_name', 'h1.title', 
            '#productTitle', '.product-title h1', '.product-name h1',
            '[data-testid="product-title"]', '.pdp-title', '.product-detail-name',
            '.product-single__title', '.product-meta__title'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.text.strip():
                return element.text.strip()
        
        # Fallback to the first h1
        h1 = soup.find('h1')
        if h1:
            return h1.text.strip()
            
        # Final fallback to page title
        if soup.title:
            return soup.title.string.strip()
            
        return None
    
    def _extract_price(self, soup):
        """Extract product price as a float value."""
        # Try common price selectors
        selectors = [
            '.product-price', '.price', '.offer-price', 
            '#priceblock_ourprice', '.current-price',
            '[data-price]', '[itemprop="price"]', '.product_price',
            '.price-current', '.price-sales', '.sales-price',
            '.product-meta__price', '.price__current', '.product__price',
            '[data-testid="product-price"]', '.pdp-price', '.product-price-container'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                price_text = element.text.strip()
                # Extract numeric value from price text
                price_match = re.search(r'[\d,]+\.?\d*', price_text)
                if price_match:
                    # Convert to float, removing commas
                    try:
                        return float(price_match.group().replace(',', ''))
                    except ValueError:
                        continue
        
        # Look for price microdata
        price_meta = soup.find('meta', {'itemprop': 'price'})
        if price_meta and 'content' in price_meta.attrs:
            try:
                return float(price_meta['content'])
            except ValueError:
                pass
        
        # Look for elements with 'price' in the attribute values
        price_elements = soup.find_all(lambda tag: any('price' in attr.lower() for attr in tag.attrs.values() if isinstance(attr, str)))
        for element in price_elements:
            price_text = element.text.strip()
            price_match = re.search(r'[\d,]+\.?\d*', price_text)
            if price_match:
                try:
                    return float(price_match.group().replace(',', ''))
                except ValueError:
                    continue
                    
        return None
    
    def _extract_currency(self, soup):
        """Extract currency symbol or code."""
        # Try common price selectors to find the currency
        selectors = [
            '.product-price', '.price', '.offer-price', 
            '#priceblock_ourprice', '.current-price'
        ]
        
        currency_symbols = {
            '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
            '₹': 'INR', 'kr': 'SEK', 'C$': 'CAD', 'A$': 'AUD',
            'R$': 'BRL', '₽': 'RUB', '฿': 'THB', '₩': 'KRW'
        }
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                price_text = element.text.strip()
                for symbol, code in currency_symbols.items():
                    if symbol in price_text:
                        return code
                        
        # Look for currency in meta tags
        meta_currency = soup.find('meta', {'itemprop': 'priceCurrency'})
        if meta_currency and 'content' in meta_currency.attrs:
            return meta_currency['content']
            
        return None
    
    def _extract_description(self, soup):
        """Extract product description."""
        # Try common description selectors
        selectors = [
            '#product-description', '.product-description', 
            '[itemprop="description"]', '#description',
            '.description', '.product-info__description',
            '.product-single__description', '.product__description',
            '[data-testid="product-description"]', '.pdp-description',
            '.product-details__description'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.text.strip():
                return element.text.strip()
                
        # Try meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc and 'content' in meta_desc.attrs:
            return meta_desc['content'].strip()
            
        return None
    
    def _extract_features(self, soup):
        """Extract product features as a list."""
        # Try common feature list selectors
        selectors = [
            '.product-features ul', '#feature-bullets ul', 
            '.features-list', '.product-attributes ul',
            '.product-specs ul', '#productDetails ul',
            '.key-features', '.feature-list', '[data-testid="product-features"]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                features = []
                for li in element.find_all('li'):
                    feature_text = li.text.strip()
                    if feature_text:
                        features.append(feature_text)
                if features:
                    return features
        
        # Check for feature paragraphs
        feature_section = soup.find(lambda tag: tag.name in ['div', 'section'] and 
                                   'feature' in ' '.join(tag.get('class', [])).lower())
        if feature_section:
            features = []
            for p in feature_section.find_all('p'):
                text = p.text.strip()
                if text:
                    features.append(text)
            if features:
                return features
                    
        return []
    
    def _extract_specifications(self, soup):
        """Extract product specifications from tables."""
        specs = {}
        
        # Look for specification tables
        spec_table_selectors = [
            '.specifications', '.product-specs', '.tech-specs',
            '.product-information__specifications', '.product-specifications',
            '[data-testid="product-specifications"]', '.pdp-specs'
        ]
        
        for selector in spec_table_selectors:
            spec_tables = soup.select(f'{selector} table')
            if not spec_tables:
                spec_element = soup.select_one(selector)
                if spec_element:
                    spec_tables = spec_element.find_all('table')
            
            for table in spec_tables:
                # Process table rows
                for row in table.find_all('tr'):
                    cells = row.find_all(['th', 'td'])
                    if len(cells) >= 2:
                        key = cells[0].text.strip()
                        value = cells[1].text.strip()
                        if key and value:
                            specs[key] = value
        
        # Look for definition lists
        spec_dl_selectors = [
            '.specifications dl', '.product-specs dl', '.tech-specs dl',
            '.product-information__specifications dl'
        ]
        
        for selector in spec_dl_selectors:
            dl_elements = soup.select(selector)
            for dl in dl_elements:
                dt_elements = dl.find_all('dt')
                dd_elements = dl.find_all('dd')
                
                for i in range(min(len(dt_elements), len(dd_elements))):
                    key = dt_elements[i].text.strip()
                    value = dd_elements[i].text.strip()
                    if key and value:
                        specs[key] = value
        
        return specs
    
    def _extract_images(self, soup):
        """Extract product images as a list of URLs."""
        images = []
        
        # Try product image galleries
        gallery_selectors = [
            '.product-image-gallery img', '.product-gallery img',
            '.product__image-wrapper img', '#imageBlock img',
            '.product-images img', '.woocommerce-product-gallery img',
            '.product-single__photos img', '.product__photos img',
            '[data-testid="product-gallery"] img', '.pdp-images img'
        ]
        
        for selector in gallery_selectors:
            elements = soup.select(selector)
            for img in elements:
                src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                if src and src not in images:
                    # Convert relative URLs to absolute
                    if src.startswith('/'):
                        from urllib.parse import urlparse
                        parsed_url = urlparse(self.url)
                        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                        src = base_url + src
                    images.append(src)
                    
        # If no images found in galleries, try main product image
        if not images:
            main_image_selectors = [
                '.product-image img', '#main-image', 
                '.main-image img', '[itemprop="image"]',
                '.product__featured-image', '.product-hero-image img'
            ]
            
            for selector in main_image_selectors:
                element = soup.select_one(selector)
                if element:
                    src = element.get('src') or element.get('data-src')
                    if src:
                        # Convert relative URLs to absolute
                        if src.startswith('/'):
                            from urllib.parse import urlparse
                            parsed_url = urlparse(self.url)
                            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                            src = base_url + src
                        images.append(src)
                        break
                        
        return images
    
    def _extract_rating(self, soup):
        """Extract product rating as a float."""
        # Try common rating selectors
        selectors = [
            '.rating-value', '.product-rating', '.review-rating',
            '[itemprop="ratingValue"]', '.stars-rating',
            '.product-ratings', '.rating-stars', '.star-rating',
            '[data-testid="product-rating"]', '.pdp-rating'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                try:
                    # Extract the numeric value
                    rating_text = element.text.strip()
                    rating_match = re.search(r'\d+(\.\d+)?', rating_text)
                    if rating_match:
                        return float(rating_match.group())
                except ValueError:
                    continue
                    
        # Look for ratings in style attributes (width percentage)
        rating_styles = soup.select('.stars[style], .rating[style]')
        for style in rating_styles:
            style_text = style.get('style', '')
            width_match = re.search(r'width:\s*(\d+)%', style_text)
            if width_match:
                try:
                    # Convert percentage to rating out of 5
                    percentage = float(width_match.group(1))
                    return round((percentage / 100) * 5, 1)
                except ValueError:
                    continue
        
        # Look for rating in meta tags
        meta_rating = soup.find('meta', {'itemprop': 'ratingValue'})
        if meta_rating and 'content' in meta_rating.attrs:
            try:
                return float(meta_rating['content'])
            except ValueError:
                pass
                    
        return None
    
    def _extract_review_count(self, soup):
        """Extract number of reviews as an integer."""
        # Try common review count selectors
        selectors = [
            '.review-count', '#reviewCount', '[itemprop="reviewCount"]',
            '.ratings-count', '.rating-count', '.review-links',
            '.product-ratings__count', '.product__reviews-count',
            '[data-testid="product-reviews-count"]', '.pdp-review-count'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                review_text = element.text.strip()
                # Extract numeric value from text
                count_match = re.search(r'\d+', review_text.replace(',', ''))
                if count_match:
                    try:
                        return int(count_match.group())
                    except ValueError:
                        continue
        
        # Check meta tags
        meta_count = soup.find('meta', {'itemprop': 'reviewCount'})
        if meta_count and 'content' in meta_count.attrs:
            try:
                return int(meta_count['content'])
            except ValueError:
                pass
                        
        return None
    
    def _extract_availability(self, soup):
        """Extract product availability status."""
        # Try common availability selectors
        selectors = [
            '.availability', '.stock-status', '[itemprop="availability"]',
            '.product-availability', '#availability', 
            '.product__availability', '.product-stock',
            '[data-testid="product-availability"]', '.pdp-availability'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                availability = element.text.strip().lower()
                
                # Determine status based on text content
                if any(term in availability for term in ['in stock', 'available', 'in-stock']):
                    return 'In Stock'
                elif any(term in availability for term in ['out of stock', 'unavailable', 'out-of-stock']):
                    return 'Out of Stock'
                elif any(term in availability for term in ['pre-order', 'preorder']):
                    return 'Pre-Order'
                elif any(term in availability for term in ['backorder', 'back-order']):
                    return 'Backorder'
                else:
                    return availability.capitalize()
                    
        # Check for structured data
        availability_meta = soup.find('meta', {'itemprop': 'availability'})
        if availability_meta and 'content' in availability_meta.attrs:
            content = availability_meta['content'].lower()
            if 'instock' in content:
                return 'In Stock'
            elif 'outofstock' in content:
                return 'Out of Stock'
                
        return None
    
    def _extract_brand(self, soup):
        """Extract product brand name."""
        # Try common brand selectors
        selectors = [
            '.brand', '[itemprop="brand"]', '.product-brand',
            '.manufacturer', '.vendor', '.product-meta__vendor',
            '.product__vendor', '[data-testid="product-brand"]',
            '.pdp-brand'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                # Check if the element has an itemscope attribute
                if element.has_attr('itemscope'):
                    brand_name = element.select_one('[itemprop="name"]')
                    if brand_name:
                        return brand_name.text.strip()
                        
                # Otherwise, use the element's text
                brand_text = element.text.strip()
                if brand_text:
                    return brand_text
                    
        # Check for brand in meta tags
        meta_brand = soup.find('meta', {'itemprop': 'brand'})
        if meta_brand and 'content' in meta_brand.attrs:
            return meta_brand['content'].strip()
            
        return None
    
    def _extract_sku(self, soup):
        """Extract product SKU or product code."""
        # Try common SKU selectors
        selectors = [
            '[itemprop="sku"]', '.sku', '.product-sku',
            '.product-code', '#product-code', '.product-meta__sku',
            '.product__sku', '[data-testid="product-sku"]', 
            '.pdp-sku', '[data-product-sku]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                sku_text = element.text.strip()
                # If the element contains a label, try to extract just the SKU
                sku_match = re.search(r'(?:SKU|Item|Product Code|Model)(?:\s*(?::|#))?\s*([A-Z0-9\-]+)', sku_text, re.IGNORECASE)
                if sku_match:
                    return sku_match.group(1)
                else:
                    return sku_text
                    
        # Look for text containing SKU patterns
        sku_patterns = [
            r'SKU\s*(?::|#)?\s*([A-Z0-9\-]+)',
            r'Item\s*(?::|#)?\s*([A-Z0-9\-]+)',
            r'Product Code\s*(?::|#)?\s*([A-Z0-9\-]+)',
            r'Model\s*(?::|#)?\s*([A-Z0-9\-]+)'
        ]
        
        for pattern in sku_patterns:
            for element in soup.find_all(text=re.compile(pattern, re.IGNORECASE)):
                sku_match = re.search(pattern, element, re.IGNORECASE)
                if sku_match:
                    return sku_match.group(1)
        
        # Check meta tags
        meta_sku = soup.find('meta', {'itemprop': 'sku'})
        if meta_sku and 'content' in meta_sku.attrs:
            return meta_sku['content'].strip()