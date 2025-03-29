// src/utils/helpers.js

/**
 * Format a date to a readable string
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj)) {
      return 'Invalid date';
    }
    
    const defaultOptions = {
      type: 'date', // 'date', 'time', 'datetime', 'relative'
      format: 'medium', // 'short', 'medium', 'long'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Current date for relative formatting
    const now = new Date();
    
    // For relative time formatting
    if (config.type === 'relative') {
      const diff = now - dateObj;
      const diffInSeconds = Math.floor(diff / 1000);
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
      
      // Fall back to standard date format for older dates
      return formatDate(date, { type: 'date', format: 'medium' });
    }
    
    // For standard date/time formatting
    let formatOptions = {};
    
    switch (config.type) {
      case 'date':
        formatOptions = {
          year: 'numeric',
          month: config.format === 'short' ? 'numeric' : config.format === 'medium' ? 'short' : 'long',
          day: 'numeric',
        };
        break;
      case 'time':
        formatOptions = {
          hour: 'numeric',
          minute: 'numeric',
          second: config.format === 'long' ? 'numeric' : undefined,
        };
        break;
      case 'datetime':
      default:
        formatOptions = {
          year: 'numeric',
          month: config.format === 'short' ? 'numeric' : config.format === 'medium' ? 'short' : 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: config.format === 'long' ? 'numeric' : undefined,
        };
    }
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
  };
  
  /**
   * Format file size from bytes to human readable format
   * @param {number} bytes - Size in bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} - Formatted size string
   */
  export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };
  
  /**
   * Truncate text to a specified length and add ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text
   */
  export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  /**
   * Capitalize the first letter of each word in a string
   * @param {string} text - Text to capitalize
   * @returns {string} - Capitalized text
   */
  export const capitalizeWords = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  /**
   * Convert snake_case to camelCase
   * @param {string} text - Snake case text
   * @returns {string} - Camel case text
   */
  export const snakeToCamel = (text) => {
    if (!text) return '';
    return text.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  };
  
  /**
   * Convert camelCase to snake_case
   * @param {string} text - Camel case text
   * @returns {string} - Snake case text
   */
  export const camelToSnake = (text) => {
    if (!text) return '';
    return text.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  };
  
  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} - Cloned object
   */
  export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
  
  /**
   * Generate a random string ID
   * @param {number} length - Length of the ID
   * @returns {string} - Random ID
   */
  export const generateId = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  /**
   * Debounce a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce wait time in ms
   * @returns {Function} - Debounced function
   */
  export const debounce = (func, wait = 300) => {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  /**
   * Throttle a function call
   * @param {Function} func - Function to throttle
   * @param {number} limit - Throttle limit in ms
   * @returns {Function} - Throttled function
   */
  export const throttle = (func, limit = 300) => {
    let inThrottle;
    
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  };
  
  /**
   * Validate a URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Is valid URL
   */
  export const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  /**
   * Extract domain from URL
   * @param {string} url - URL
   * @returns {string} - Domain name
   */
  export const extractDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  };
  
  /**
   * Convert object to query string parameters
   * @param {Object} params - Parameters object
   * @returns {string} - Query string
   */
  export const objectToQueryString = (params) => {
    return Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  };
  
  /**
   * Parse query string parameters to object
   * @param {string} queryString - Query string
   * @returns {Object} - Parameters object
   */
  export const queryStringToObject = (queryString) => {
    if (!queryString || !queryString.includes('=')) {
      return {};
    }
    
    return queryString
      .replace(/^\?/, '')
      .split('&')
      .reduce((result, param) => {
        const [key, value] = param.split('=');
        if (key) {
          result[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
        return result;
      }, {});
  };
  
  /**
   * Download data as a file
   * @param {string|Blob} data - Data to download
   * @param {string} filename - Filename
   * @param {string} type - MIME type
   */
  export const downloadFile = (data, filename, type = 'text/plain') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };
  
  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} - File extension
   */
  export const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  };
  
  /**
   * Check if a file is a PDF
   * @param {File} file - File object
   * @returns {boolean} - Is PDF
   */
  export const isPdfFile = (file) => {
    return file.type === 'application/pdf' || 
           getFileExtension(file.name).toLowerCase() === 'pdf';
  };
  
  /**
   * Delay execution for a specified time
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after the delay
   */
  export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));