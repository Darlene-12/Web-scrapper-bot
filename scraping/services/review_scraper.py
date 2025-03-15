import re
import logging
import time
from datetime import datetime
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class ReviewScraper(BaseScraper):
    """
    Specialized scraper for extracting user reviews from websites.
    Handles e-commerce product reviews, app reviews, and general review sites.
    """
    
    def __init__(self, url, keywords=None, use_selenium=False, proxy=None, timeout=30, 
                 headers=None, max_reviews=100, product_id=None, load_more=True):
        """
        Initialize the review scraper.
        
        Args:
            url (str): The URL to scrape
            keywords (str, optional): Search keywords
            use_selenium (bool): Whether to use Selenium
            proxy (ScrapingProxy, optional): Proxy to use
            timeout (int): Request timeout in seconds
            headers (dict, optional): Custom HTTP headers
            max_reviews (int): Maximum number of reviews to collect
            product_id (str, optional): ID of the product being reviewed
            load_more (bool): Whether to attempt to load more reviews with Selenium
        """
        # For review scraping, it's often better to use Selenium by default
        super().__init__(url, keywords, use_selenium or load_more, proxy, timeout, headers)
        self.max_reviews = max_reviews
        self.product_id = product_id
        self.load_more = load_more
    
    def parse_content(self, html_content):
        """
        Parse review information from HTML content.
        
        Args:
            html_content (str): HTML content to parse
            
        Returns:
            dict: Structured review data
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Detect the type of review page
        site_type = self._detect_site_type(soup)
        
        # Extract the product information
        product_info = self._extract_product_info(soup)
        
        # Extract the reviews based on the site type
        if site_type == 'amazon':
            reviews = self._extract_amazon_reviews(soup)
        elif site_type == 'yelp':
            reviews = self._extract_yelp_reviews(soup)
        elif site_type == 'trip_advisor':
            reviews = self._extract_tripadvisor_reviews(soup)
        elif site_type == 'app_store':
            reviews = self._extract_app_store_reviews(soup)
        elif site_type == 'google_play':
            reviews = self._extract_google_play_reviews(soup)
        else:
            # Generic review extraction
            reviews = self._extract_generic_reviews(soup)
        
        # Limit the number of reviews
        reviews = reviews[:self.max_reviews]
        
        # Calculate review statistics
        review_stats = self._calculate_review_stats(reviews)
        
        # Combine all data
        review_data = {
            'url': self.url,
            'site_type': site_type,
            'product': product_info,
            'reviews': reviews,
            'statistics': review_stats,
            'review_count': len(reviews),
            'max_reviews_reached': len(reviews) >= self.max_reviews
        }
        
        return review_data
    
    def get_page_content(self):
        """
        Override get_page_content to implement "load more" functionality.
        """
        if self.use_selenium and self.load_more:
            return self._get_content_with_load_more()
        else:
            return super().get_page_content()
    
    def _get_content_with_load_more(self):
        """
        Get page content with Selenium and attempt to load more reviews.
        """
        start_time = time.time()
        
        try:
            driver = self._setup_selenium()
            driver.get(self.url)
            
            # Wait for the page to load
            WebDriverWait(driver, self.timeout).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            
            # Additional wait for any JS-rendered content
            time.sleep(2)
            
            # Detect the site type for custom loading actions
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            site_type = self._detect_site_type(soup)
            
            # Try to load more reviews based on site type
            current_reviews = 0
            max_attempts = 10  # Prevent infinite loops
            
            for attempt in range(max_attempts):
                # Count current reviews
                new_soup = BeautifulSoup(driver.page_source, 'html.parser')
                if site_type == 'amazon':
                    review_elements = new_soup.select('.review')
                    current_count = len(review_elements)
                elif site_type == 'yelp':
                    review_elements = new_soup.select('.review')
                    current_count = len(review_elements)
                elif site_type == 'trip_advisor':
                    review_elements = new_soup.select('.review-container')
                    current_count = len(review_elements)
                else:
                    # Generic case
                    review_elements = new_soup.select('.review, [itemtype*="Review"], .review-content, .review-container')
                    current_count = len(review_elements)
                
                if current_count == current_reviews or current_count >= self.max_reviews:
                    # No new reviews loaded or we have enough
                    break
                
                current_reviews = current_count
                logger.info(f"Found {current_reviews} reviews, attempting to load more...")
                
                # Try to find and click "load more" buttons
                try:
                    # Try common "load more" selectors
                    load_more_clicked = False
                    
                    # Amazon style
                    if site_type == 'amazon':
                        for selector in ['.a-pagination a:contains("Next page")', '.show-more-reviews', '#cm_cr-pagination_bar a.a-link-item-right']:
                            try:
                                load_more_btn = driver.find_element(By.CSS_SELECTOR, selector)
                                if load_more_btn.is_displayed() and load_more_btn.is_enabled():
                                    driver.execute_script("arguments[0].scrollIntoView(true);", load_more_btn)
                                    time.sleep(1)
                                    load_more_btn.click()
                                    time.sleep(3)  # Wait for content to load
                                    load_more_clicked = True
                                    break
                            except NoSuchElementException:
                                continue
                    
                    # Yelp style
                    elif site_type == 'yelp':
                        try:
                            load_more_btn = driver.find_element(By.CSS_SELECTOR, 'button.pagination-link-more')
                            if load_more_btn.is_displayed() and load_more_btn.is_enabled():
                                driver.execute_script("arguments[0].scrollIntoView(true);", load_more_btn)
                                time.sleep(1)
                                load_more_btn.click()
                                time.sleep(3)
                                load_more_clicked = True
                        except NoSuchElementException:
                            pass
                    
                    # TripAdvisor style
                    elif site_type == 'trip_advisor':
                        try:
                            load_more_btn = driver.find_element(By.CSS_SELECTOR, '.load-more button, .more-results')
                            if load_more_btn.is_displayed() and load_more_btn.is_enabled():
                                driver.execute_script("arguments[0].scrollIntoView(true);", load_more_btn)
                                time.sleep(1)
                                load_more_btn.click()
                                time.sleep(3)
                                load_more_clicked = True
                        except NoSuchElementException:
                            pass
                    
                    # Generic approach - try common patterns
                    if not load_more_clicked:
                        for selector in [
                            'button:contains("Load more")', 'button:contains("Show more")', 
                            'a:contains("Load more")', 'a:contains("More reviews")',
                            '.load-more', '.show-more', '#more-reviews', '.pagination-next',
                            'button.more', '[data-testid="pagination-button-next"]'
                        ]:
                            try:
                                load_more_btn = driver.find_element(By.CSS_SELECTOR, selector)
                                if load_more_btn.is_displayed() and load_more_btn.is_enabled():
                                    driver.execute_script("arguments[0].scrollIntoView(true);", load_more_btn)
                                    time.sleep(1)
                                    load_more_btn.click()
                                    time.sleep(3)
                                    load_more_clicked = True
                                    break
                            except NoSuchElementException:
                                continue
                    
                    # If no button found, try scrolling to load lazy content
                    if not load_more_clicked:
                        # Scroll to bottom of page
                        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                        time.sleep(2)
                
                except (NoSuchElementException, TimeoutException) as e:
                    logger.info(f"Could not load more reviews: {str(e)}")
                    break
            
            content = driver.page_source
            driver.quit()
            
            self.processing_time = time.time() - start_time
            return content
                
        except Exception as e:
            self.processing_time = time.time() - start_time
            self.error = str(e)
            logger.error(f"Error scraping reviews from {self.url}: {str(e)}")
            raise
    
    def _detect_site_type(self, soup):
        """Detect the type of review site."""
        url = self.url.lower()
        
        if 'amazon.' in url:
            return 'amazon'
        elif 'yelp.' in url:
            return 'yelp'
        elif 'tripadvisor.' in url or 'trip-advisor.' in url or 'trip_advisor.' in url:
            return 'trip_advisor'
        elif 'apps.apple.com' in url:
            return 'app_store'
        elif 'play.google.com' in url:
            return 'google_play'
        
        # Check for common patterns in the HTML
        if soup.find('div', {'id': 'cm_cr-review_list'}) or soup.find('div', {'data-hook': 'review'}):
            return 'amazon'
        elif soup.find('div', {'class': 'review-content'}) or soup.find('div', {'class': 'review__content'}):
            return 'yelp'
        elif soup.find('div', {'class': 'review-container'}) or soup.find('div', {'data-reviewid'}):
            return 'trip_advisor'
        
        return 'generic'
    
    def _extract_product_info(self, soup):
        """Extract information about the product being reviewed."""
        product_info = {
            'name': None,
            'image_url': None,
            'description': None,
            'avg_rating': None,
            'review_count': None,
            'url': self.url
        }
        
        # Try to get product name
        for selector in [
            'h1.product-title', 'h1.product-name', 'h1.product_title',
            '#productTitle', 'h1[itemprop="name"]', '.product-name'
        ]:
            name_elem = soup.select_one(selector)
            if name_elem and name_elem.text.strip():
                product_info['name'] = name_elem.text.strip()
                break
        
        # Try to get product image
        for selector in [
            'img.product-image', '#landingImage', '.product-image img',
            'img[itemprop="image"]', '.gallery-image-container img'
        ]:
            img_elem = soup.select_one(selector)
            if img_elem and img_elem.get('src'):
                product_info['image_url'] = img_elem['src']
                break
        
        # Try to get description
        for selector in [
            '#productDescription', '.product-description', '[itemprop="description"]',
            '.description', '#product-description'
        ]:
            desc_elem = soup.select_one(selector)
            if desc_elem and desc_elem.text.strip():
                product_info['description'] = desc_elem.text.strip()
                break
        
        # Try to get average rating
        for selector in [
            '[data-hook="rating-out-of-text"]', '.average-rating', '.rating',
            '[itemprop="ratingValue"]', '.average'
        ]:
            rating_elem = soup.select_one(selector)
            if rating_elem and rating_elem.text.strip():
                rating_text = rating_elem.text.strip()
                rating_match = re.search(r'(\d+(\.\d+)?)', rating_text)
                if rating_match:
                    product_info['avg_rating'] = float(rating_match.group(1))
                    break
        
        # Try to get review count
        for selector in [
            '[data-hook="total-review-count"]', '.review-count', '.reviews-count',
            '[itemprop="reviewCount"]', '.ratings-count'
        ]:
            count_elem = soup.select_one(selector)
            if count_elem and count_elem.text.strip():
                count_text = count_elem.text.strip()
                count_match = re.search(r'(\d+)', count_text.replace(',', ''))
                if count_match:
                    product_info['review_count'] = int(count_match.group(1))
                    break
        
        return product_info
    
    def _extract_amazon_reviews(self, soup):
        """Extract reviews from Amazon product pages."""
        reviews = []
        
        # Find all review containers
        review_elements = soup.select('#cm_cr-review_list .review, [data-hook="review"]')
        
        for elem in review_elements:
            review = {}
            
            # Get reviewer name
            name_elem = elem.select_one('.a-profile-name, [data-hook="review-author"]')
            if name_elem:
                review['reviewer_name'] = name_elem.text.strip()
            
            # Get review title
            title_elem = elem.select_one('[data-hook="review-title"]')
            if title_elem:
                review['title'] = title_elem.text.strip()
            
            # Get rating
            rating_elem = elem.select_one('i.review-rating, [data-hook="review-star-rating"]')
            if rating_elem:
                rating_text = rating_elem.text.strip()
                rating_match = re.search(r'(\d+(\.\d+)?)', rating_text)
                if rating_match:
                    review['rating'] = float(rating_match.group(1))
            
            # Get verified purchase status
            verified_elem = elem.select_one('[data-hook="avp-badge"]')
            review['verified_purchase'] = bool(verified_elem)
            
            # Get review date
            date_elem = elem.select_one('[data-hook="review-date"]')
            if date_elem:
                review['date'] = date_elem.text.strip()
                # Try to parse the date
                try:
                    # Handle different date formats
                    date_formats = [
                        'Reviewed in %s on %B %d, %Y',  # Reviewed in the United States on January 1, 2020
                        'on %B %d, %Y'  # on January 1, 2020
                    ]
                    
                    date_text = date_elem.text.strip()
                    for fmt in date_formats:
                        try:
                            # Extract just the date part for some formats
                            if 'on ' in date_text and 'Reviewed in' in date_text:
                                date_text = 'on ' + date_text.split('on ', 1)[1]
                            
                            # Try to parse with this format
                            date_obj = datetime.strptime(date_text, fmt)
                            review['date_parsed'] = date_obj.strftime('%Y-%m-%d')
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass
            
            # Get review text
            body_elem = elem.select_one('[data-hook="review-body"]')
            if body_elem:
                review['text'] = body_elem.text.strip()
            
            # Get helpful votes
            helpful_elem = elem.select_one('[data-hook="helpful-vote-statement"]')
            if helpful_elem:
                votes_text = helpful_elem.text.strip()
                votes_match = re.search(r'(\d+)', votes_text.replace(',', ''))
                if votes_match:
                    review['helpful_votes'] = int(votes_match.group(1))
            
            # Record the review ID if available
            id_attr = elem.get('id')
            if id_attr:
                review['review_id'] = id_attr
            
            reviews.append(review)
        
        return reviews
    
    def _extract_yelp_reviews(self, soup):
        """Extract reviews from Yelp business pages."""
        reviews = []
        
        # Find all review containers
        review_elements = soup.select('.review, .review__wrapper')
        
        for elem in review_elements:
            review = {}
            
            # Get reviewer name
            name_elem = elem.select_one('.user-display-name, .user-passport-info .name')
            if name_elem:
                review['reviewer_name'] = name_elem.text.strip()
            
            # Get rating
            rating_elem = elem.select_one('.rating-large, .i-stars')
            if rating_elem:
                # Try to get rating from aria-label
                aria_label = rating_elem.get('aria-label', '')
                rating_match = re.search(r'(\d+(\.\d+)?)', aria_label)
                if rating_match:
                    review['rating'] = float(rating_match.group(1))
                else:
                    # Try to get from class name (e.g., "stars_4")
                    for cls in rating_elem.get('class', []):
                        if cls.startswith('stars_'):
                            try:
                                stars = cls.split('_')[1]
                                review['rating'] = float(stars)
                                break
                            except (IndexError, ValueError):
                                pass
            
            # Get review date
            date_elem = elem.select_one('.review-content .rating-qualifier, .rating-qualifier')
            if date_elem:
                review['date'] = date_elem.text.strip()
                # Try to parse the date
                try:
                    date_text = date_elem.text.strip()
                    date_match = re.search(r'(\d+/\d+/\d+|\w+ \d+, \d+)', date_text)
                    if date_match:
                        date_str = date_match.group(1)
                        # Try different date formats
                        for fmt in ['%m/%d/%Y', '%B %d, %Y']:
                            try:
                                date_obj = datetime.strptime(date_str, fmt)
                                review['date_parsed'] = date_obj.strftime('%Y-%m-%d')
                                break
                            except ValueError:
                                continue
                except Exception:
                    pass
            
            # Get review text
            body_elem = elem.select_one('.review-content p, .comment__text')
            if body_elem:
                review['text'] = body_elem.text.strip()
            
            # Get reactions (useful, funny, cool)
            reactions = {}
            reaction_elems = elem.select('.review-footer-action')
            for reaction_elem in reaction_elems:
                reaction_text = reaction_elem.text.strip().lower()
                count_match = re.search(r'(\d+)', reaction_text)
                count = int(count_match.group(1)) if count_match else 0
                
                if 'useful' in reaction_text:
                    reactions['useful'] = count
                elif 'funny' in reaction_text:
                    reactions['funny'] = count
                elif 'cool' in reaction_text:
                    reactions['cool'] = count
            
            if reactions:
                review['reactions'] = reactions
            
            # Record the review ID if available
            id_attr = elem.get('data-review-id')
            if id_attr:
                review['review_id'] = id_attr
            
            reviews.append(review)
        
        return reviews
    
    def _extract_tripadvisor_reviews(self, soup):
        """Extract reviews from TripAdvisor pages."""
        reviews = []
        
        # Find all review containers
        review_elements = soup.select('.review-container, [data-reviewid]')
        
        for elem in review_elements:
            review = {}
            
            # Get reviewer name
            name_elem = elem.select_one('.info_text, .member_info .username')
            if name_elem:
                review['reviewer_name'] = name_elem.text.strip()
            
            # Get review title
            title_elem = elem.select_one('.review-title, .title')
            if title_elem:
                review['title'] = title_elem.text.strip()
            
            # Get rating
            rating_elem = elem.select_one('.ui_bubble_rating')
            if rating_elem:
                # TripAdvisor uses class names like "ui_bubble_rating bubble_50" for 5.0 stars
                for cls in rating_elem.get('class', []):
                    if cls.startswith('bubble_'):
                        try:
                            rating_value = int(cls.split('bubble_')[1]) / 10
                            review['rating'] = rating_value
                            break
                        except (IndexError, ValueError):
                            pass
            
            # Get review date
            date_elem = elem.select_one('.ratingDate, .review-date, .prw_reviews_stay_date')
            if date_elem:
                review['date'] = date_elem.text.strip()
                # Try to parse the date
                try:
                    date_text = date_elem.text.strip()
                    
                    # Handle "Reviewed [date]" format
                    if 'Reviewed' in date_text:
                        date_text = date_text.split('Reviewed ')[1]
                    
                    # Try to match common date patterns
                    date_match = re.search(r'(\w+ \d+, \d+|\d+/\d+/\d+)', date_text)
                    if date_match:
                        date_str = date_match.group(1)
                        # Try different date formats
                        for fmt in ['%B %d, %Y', '%m/%d/%Y']:
                            try:
                                date_obj = datetime.strptime(date_str, fmt)
                                review['date_parsed'] = date_obj.strftime('%Y-%m-%d')
                                break
                            except ValueError:
                                continue
                except Exception:
                    pass
            
            # Get review text
            body_elem = elem.select_one('.prw_reviews_text_summary_hsx, .review-body, .reviewText')
            if body_elem:
                review['text'] = body_elem.text.strip()
            
            # Get trip type
            trip_type_elem = elem.select_one('.trip_type')
            if trip_type_elem:
                review['trip_type'] = trip_type_elem.text.strip()
            
            # Get helpful votes
            helpful_elem = elem.select_one('.helpful_text')
            if helpful_elem:
                votes_text = helpful_elem.text.strip()
                votes_match = re.search(r'(\d+)', votes_text.replace(',', ''))
                if votes_match:
                    review['helpful_votes'] = int(votes_match.group(1))
            
            # Record the review ID if available
            id_attr = elem.get('data-reviewid')
            if id_attr:
                review['review_id'] = id_attr
            
            reviews.append(review)
        
        return reviews
    
    def _extract_app_store_reviews(self, soup):
        """Extract reviews from Apple App Store pages."""
        reviews = []
        
        # Find all review containers
        review_elements = soup.select('.review, .we-customer-review')
        
        for elem in review_elements:
            review = {}
            
            # Get reviewer name
            name_elem = elem.select_one('.we-customer-review__user')
            if name_elem:
                review['reviewer_name'] = name_elem.text.strip()
            
            # Get review title
            title_elem = elem.select_one('.we-customer-review__title')
            if title_elem:
                review['title'] = title_elem.text.strip()
            
            # Get rating
            rating_elem = elem.select_one('.we-customer-review__rating')
            if rating_elem:
                aria_label = rating_elem.get('aria-label', '')
                rating_match = re.search(r'(\d+) (stars|star)', aria_label)
                if rating_match:
                    review['rating'] = float(rating_match.group(1))
            
            # Get review date
            date_elem = elem.select_one('.we-customer-review__date')
            if date_elem:
                review['date'] = date_elem.text.strip()
            
            # Get review text
            body_elem = elem.select_one('.we-customer-review__body')
            if body_elem:
                review['text'] = body_elem.text.strip()
            
            # Get version info
            version_elem = elem.select_one('.we-customer-review__version')
            if version_elem:
                review['app_version'] = version_elem.text.strip()
            
            reviews.append(review)
        
        return reviews
    
    def _extract_google_play_reviews(self, soup):
        """Extract reviews from Google Play Store pages."""
        reviews = []
        
        # Note: Google Play Store reviews are heavily JavaScript-dependent
        # This is a basic implementation for the HTML snapshot
        
        # Find all review containers
        review_elements = soup.select('.review-body, [data-reviewid]')
        
        for elem in review_elements:
            review = {}
            
            # Get reviewer name
            name_elem = elem.select_one('.author-name')
            if name_elem:
                review['reviewer_name'] = name_elem.text.strip()
            
            # Get rating
            rating_elem = elem.select_one('.rating-bar-container')
            if rating_elem:
                aria_label = rating_elem.get('aria-label', '')
                rating_match = re.search(r'(\d+) stars', aria_label)
                if rating_match:
                    review['rating'] = float(rating_match.group(1))
            
            # Get review date
            date_elem = elem.select_one('.review-date')
            if date_elem:
                review['date'] = date_elem.text.strip()
            
            # Get review text
            body_elem = elem.select_one('.review-body, .review-text')
            if body_elem:
                review['text'] = body_elem.text.strip()
            
            # Get helpful votes
            helpful_elem = elem.select_one('.review-info-bar-thumbs-up')
            if helpful_elem:
                votes_text = helpful_elem.text.strip()
                votes_match = re.search(r'(\d+)', votes_text.replace(',', ''))
                if votes_match:
                    review['helpful_votes'] = int(votes_match.group(1))
            
            reviews.append(review)
        
        return reviews
    
    def _calculate_review_stats(self, reviews):
        """Calculate statistics for the reviews."""
        stats = {
            'total_reviews': len(reviews),
            'average_rating': None,
            'rating_distribution': {
                '5': 0,
                '4': 0,
                '3': 0,
                '2': 0,
                '1': 0
            },
            'text_length_avg': 0,
            'has_rating_count': 0,
            'has_text_count': 0,
            'date_range': {
                'earliest': None,
                'latest': None
            }
        }
        
        # Skip calculation if no reviews
        if not reviews:
            return stats
        
        # Calculate stats
        total_rating = 0
        total_text_length = 0
        earliest_date = None
        latest_date = None
        
        for review in reviews:
            # Count reviews with rating
            rating = review.get('rating')
            if rating is not None:
                stats['has_rating_count'] += 1
                total_rating += rating
                
                # Increment rating distribution
                rating_key = str(int(min(max(round(rating), 1), 5)))
                stats['rating_distribution'][rating_key] += 1
            
            # Count reviews with text and total text length
            text = review.get('text')
            if text:
                stats['has_text_count'] += 1
                total_text_length += len(text)
            
            # Track date range
            date = review.get('date_parsed')
            if date:
                if earliest_date is None or date < earliest_date:
                    earliest_date = date
                if latest_date is None or date > latest_date:
                    latest_date = date
        
        # Calculate averages
        if stats['has_rating_count'] > 0:
            stats['average_rating'] = round(total_rating / stats['has_rating_count'], 1)
        
        if stats['has_text_count'] > 0:
            stats['text_length_avg'] = round(total_text_length / stats['has_text_count'], 0)
        
        # Set date range
        stats['date_range']['earliest'] = earliest_date
        stats['date_range']['latest'] = latest_date
        
        # Calculate percentage for each rating
        if stats['has_rating_count'] > 0:
            stats['rating_percentage'] = {}
            for rating, count in stats['rating_distribution'].items():
                percentage = (count / stats['has_rating_count']) * 100
                stats['rating_percentage'][rating] = round(percentage, 1)
        
        return stats
    
    def _extract_generic_reviews(self, soup):
        """Extract reviews using generic patterns that work across many sites."""
        reviews = []
        
        # Try several common patterns for review containers
        review_elements = soup.select(
            '.review, [itemtype*="Review"], .review-content, .review-container, '
            '.customer-review, .user-review, [data-review-id], .comment, .testimonial'
        )
        
        if not review_elements:
            # Fallback to looking for groups of ratings and text
            potential_reviews = []
            rating_elements = soup.select('.rating, .stars, [class*="star"], [class*="rating"]')
            
            for rating_elem in rating_elements:
                # Look for nearby text that might be a review
                review_text = None
                
                # Check siblings
                next_elem = rating_elem.find_next('p')
                if next_elem and len(next_elem.text.strip()) > 30:
                    review_text = next_elem.text.strip()
                
                if review_text:
                    potential_reviews.append({
                        'rating_elem': rating_elem,
                        'text': review_text
                    })
            
            # Process potential reviews
            for item in potential_reviews:
                review = {}
                
                # Try to extract rating
                rating_elem = item['rating_elem']
                
                # Try aria-label
                aria_label = rating_elem.get('aria-label', '')
                rating_match = re.search(r'(\d+(\.\d+)?)', aria_label)
                if rating_match:
                    review['rating'] = float(rating_match.group(1))
                else:
                    # Try class name patterns
                    for cls in rating_elem.get('class', []):
                        if 'star' in cls.lower() or 'rating' in cls.lower():
                            num_match = re.search(r'(\d+)', cls)
                            if num_match:
                                review['rating'] = float(num_match.group(1))
                                break
                
                # Get review text
                review['text'] = item['text']
                
                # Look for a name near the rating
                name_elem = rating_elem.find_previous('h3') or rating_elem.find_previous('h4') or rating_elem.find_previous('strong')
                if name_elem:
                    review['reviewer_name'] = name_elem.text.strip()
                
                # Look for a date
                date_elem = rating_elem.find_next('time') or rating_elem.find_next(class_=lambda c: c and ('date' in c.lower() or 'time' in c.lower()))
                if date_elem:
                    review['date'] = date_elem.text.strip()
                
                reviews.append(review)
        
        else:
            # Process structured review elements
            for elem in review_elements:
                review = {}
                
                # Try to get reviewer name
                name_selectors = [
                    '.author', '.reviewer', '.user', '.name', '.customer-name',
                    '[itemprop="author"]', '.review-author', 'h3', 'h4'
                ]
                for selector in name_selectors:
                    name_elem = elem.select_one(selector)
                    if name_elem and name_elem.text.strip():
                        review['reviewer_name'] = name_elem.text.strip()
                        break
                
                # Try to get rating
                rating_selectors = [
                    '.rating', '.stars', '[itemprop="ratingValue"]',
                    '[class*="star"]', '[class*="rating"]'
                ]
                for selector in rating_selectors:
                    rating_elem = elem.select_one(selector)
                    if rating_elem:
                        # Try to get numeric rating from text
                        rating_text = rating_elem.text.strip()
                        rating_match = re.search(r'(\d+(\.\d+)?)', rating_text)
                        if rating_match:
                            review['rating'] = float(rating_match.group(1))
                            break
                        
                        # Try to get rating from classes
                        for cls in rating_elem.get('class', []):
                            if 'star' in cls.lower() or 'rating' in cls.lower():
                                num_match = re.search(r'(\d+)', cls)
                                if num_match:
                                    review['rating'] = float(num_match.group(1))
                                    break
                        
                        # Try to get from aria-label
                        aria_label = rating_elem.get('aria-label', '')
                        aria_match = re.search(r'(\d+(\.\d+)?)', aria_label)
                        if aria_match:
                            review['rating'] = float(aria_match.group(1))
                            break
                
                # Try to get review title
                title_selectors = [
                    '.review-title', '.title', 'h3', 'h4',
                    '[itemprop="headline"]', '.review-heading'
                ]
                for selector in title_selectors:
                    title_elem = elem.select_one(selector)
                    if title_elem and title_elem.text.strip():
                        review['title'] = title_elem.text.strip()
                        break
                
                # Try to get review date
                date_selectors = [
                    '.date', '.review-date', 'time',
                    '[itemprop="datePublished"]', '.review-time'
                ]
                for selector in date_selectors:
                    date_elem = elem.select_one(selector)
                    if date_elem and date_elem.text.strip():
                        review['date'] = date_elem.text.strip()
                        break
                
                # Try to get review text
                text_selectors = [
                    '.review-text', '.text', '.content', '.description',
                    '[itemprop="reviewBody"]', '.review-content', 'p'
                ]
                for selector in text_selectors:
                    text_elem = elem.select_one(selector)
                    if text_elem and text_elem.text.strip():
                        review['text'] = text_elem.text.strip()
                        break
                
                # Only add reviews that have text or rating
                if review.get('text') or review.get('rating'):
                    reviews.append(review)