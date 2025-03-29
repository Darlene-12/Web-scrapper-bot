// src/services/api.js

// Base URL for all API requests

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Default request timeout (in milliseconds)
const DEFAULT_TIMEOUT = 30000;

// Helper function to handle API responses
const handleResponse = async (response) => {
  // Check if response is OK (status in the range 200-299)
  if (!response.ok) {
    // Try to parse error response as JSON
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error: ${response.status}`);
    } catch (e) {
      // If parsing fails, throw generic error with status code
      throw new Error(`API error: ${response.status}`);
    }
  }

  // For 204 No Content responses, return null
  if (response.status === 204) {
    return null;
  }

  // Parse successful response as JSON
  return response.json();
};

// Configure request with authorization headers and timeout
const configureRequest = (options = {}) => {
  // Get auth token from localStorage
  const token = localStorage.getItem('authToken');
  
  // Configure headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Configure fetch options with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  const requestOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };

  return { requestOptions, timeoutId };
};

// API client with methods for different request types
const api = {
  /**
   * Perform GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} - Response data
   */
  async get(endpoint, options = {}) {
    const { requestOptions, timeoutId } = configureRequest(options);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        ...requestOptions,
      });
      
      return await handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Perform POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Additional request options
   * @returns {Promise} - Response data
   */
  async post(endpoint, data, options = {}) {
    const { requestOptions, timeoutId } = configureRequest(options);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        ...requestOptions,
        body: JSON.stringify(data),
      });
      
      return await handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Perform PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Additional request options
   * @returns {Promise} - Response data
   */
  async put(endpoint, data, options = {}) {
    const { requestOptions, timeoutId } = configureRequest(options);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        ...requestOptions,
        body: JSON.stringify(data),
      });
      
      return await handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Perform PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Additional request options
   * @returns {Promise} - Response data
   */
  async patch(endpoint, data, options = {}) {
    const { requestOptions, timeoutId } = configureRequest(options);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        ...requestOptions,
        body: JSON.stringify(data),
      });
      
      return await handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Perform DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional request options
   * @returns {Promise} - Response data
   */
  async delete(endpoint, options = {}) {
    const { requestOptions, timeoutId } = configureRequest(options);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        ...requestOptions,
      });
      
      return await handleResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Upload file(s) with multipart/form-data
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - FormData with files and other fields
   * @param {Object} options - Additional request options
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise} - Response data
   */
  async uploadFiles(endpoint, formData, options = {}, onProgress = null) {
    const token = localStorage.getItem('authToken');
    const headers = {};
    
    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Don't set Content-Type as it's automatically set with boundary for FormData
    
    try {
      // Use XMLHttpRequest for upload progress tracking
      if (onProgress) {
        return await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.open('POST', `${API_BASE_URL}${endpoint}`);
          
          // Set headers
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          
          // Setup progress handler
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              onProgress(percentComplete);
            }
          });
          
          // Setup completion handlers
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (e) {
                resolve(xhr.responseText || null);
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error during upload'));
          };
          
          xhr.ontimeout = () => {
            reject(new Error('Upload timed out'));
          };
          
          // Set timeout
          xhr.timeout = options.timeout || DEFAULT_TIMEOUT;
          
          // Send the formData
          xhr.send(formData);
        });
      } else {
        // Use standard fetch API if no progress tracking needed
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers,
          body: formData,
          signal: options.signal,
        });
        
        return await handleResponse(response);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }
};

// Specific API endpoints for web scraping functionality
const scraperApi = {
  /**
   * Start a new web scraping task
   * @param {Object} config - Scraping configuration
   * @returns {Promise} - Task ID and initial status
   */
  startScrape(config) {
    return api.post('/scraper/tasks/', config);
  },

  /**
   * Get status and results of a scraping task
   * @param {string} taskId - Task identifier
   * @returns {Promise} - Task status and available results
   */
  getScrapeStatus(taskId) {
    return api.get(`/scraper/tasks/${taskId}/`);
  },

  /**
   * Get complete results of a completed scraping task
   * @param {string} taskId - Task identifier
   * @returns {Promise} - Complete scraping results
   */
  getScrapeResults(taskId) {
    return api.get(`/scraper/tasks/${taskId}/results/`);
  },

  /**
   * Upload PDFs for data extraction
   * @param {FormData} formData - Form data with PDF files
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Upload response
   */
  uploadPdfs(formData, onProgress = null) {
    return api.uploadFiles('/scraper/pdf/upload/', formData, {}, onProgress);
  },

  /**
   * Start processing uploaded PDFs
   * @param {string} uploadId - Upload identifier
   * @param {Object} options - Processing options
   * @returns {Promise} - Processing task info
   */
  processPdfs(uploadId, options) {
    return api.post(`/scraper/pdf/${uploadId}/process/`, options);
  },

  /**
   * Get available proxy servers
   * @returns {Promise} - List of available proxies
   */
  getProxies() {
    return api.get('/scraper/proxies/');
  },

  /**
   * Test proxy connection
   * @param {Object} proxyConfig - Proxy configuration
   * @returns {Promise} - Test results
   */
  testProxy(proxyConfig) {
    return api.post('/scraper/proxies/test/', proxyConfig);
  },

  /**
   * Schedule a recurring scraping task
   * @param {Object} scheduleConfig - Schedule configuration
   * @returns {Promise} - Created schedule info
   */
  createSchedule(scheduleConfig) {
    return api.post('/scheduler/schedules/', scheduleConfig);
  },

  /**
   * Get user's scheduled tasks
   * @returns {Promise} - List of scheduled tasks
   */
  getSchedules() {
    return api.get('/scheduler/schedules/');
  },

  /**
   * Update a scheduled task
   * @param {string} scheduleId - Schedule identifier
   * @param {Object} scheduleConfig - Updated schedule configuration
   * @returns {Promise} - Updated schedule info
   */
  updateSchedule(scheduleId, scheduleConfig) {
    return api.put(`/scheduler/schedules/${scheduleId}/`, scheduleConfig);
  },

  /**
   * Delete a scheduled task
   * @param {string} scheduleId - Schedule identifier
   * @returns {Promise} - Deletion confirmation
   */
  deleteSchedule(scheduleId) {
    return api.delete(`/scheduler/schedules/${scheduleId}/`);
  }
};

export { api, scraperApi };