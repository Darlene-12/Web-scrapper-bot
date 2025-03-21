// api.jsx - API Service for connecting to Django backend

// Base API URL - change this to match your backend
const API_BASE_URL = 'http://localhost:8000/api';

// Helper function for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    // Try to parse error message from the response if possible
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    } catch (e) {
      throw new Error(`HTTP error ${response.status}`);
    }
  }
  return response.json();
};

// Helper function to get auth headers for authenticated requests
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Token ${token}` } : {};
}

// API Services object
const apiService = {
  // Authentication
  // Note: Add proper authentication methods that match your backend auth
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },
  
  // Scraped Data endpoints
  scrapedData: {
    getAll: async (filters = {}) => {
      // Convert filters object to query string
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/scraped-data/?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/${id}/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    scrapeNow: async (scrapeRequest) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/scrape_now/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scrapeRequest),
      });
      return handleResponse(response);
    },
    
    schedule: async (scheduleRequest) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/schedule/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleRequest),
      });
      return handleResponse(response);
    },
    
    downloadCsv: () => {
      // Direct browser to download the file
      window.location.href = `${API_BASE_URL}/scraped-data/download_csv/`;
    },
    
    downloadJson: () => {
      // Direct browser to download the file
      window.location.href = `${API_BASE_URL}/scraped-data/download_json/`;
    },
    
    analyzeSentiment: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/${id}/analyze_sentiment/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    }
  },
  
  // Scraping Schedule endpoints
  scrapingSchedules: {
    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/${id}/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    create: async (scheduleData) => {
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });
      return handleResponse(response);
    },
    
    update: async (id, scheduleData) => {
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/${id}/`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });
      return handleResponse(response);
    },
    
    delete: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return true;
    },
    
    runNow: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/${id}/run_now/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    toggleActive: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-schedules/${id}/toggle_active/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    }
  },
  
  // Scraping Proxy endpoints
  scrapingProxies: {
    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/scraping-proxies/?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-proxies/${id}/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    create: async (proxyData) => {
      const response = await fetch(`${API_BASE_URL}/scraping-proxies/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proxyData),
      });
      return handleResponse(response);
    },
    
    update: async (id, proxyData) => {
      const response = await fetch(`${API_BASE_URL}/scraping-proxies/${id}/`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proxyData),
      });
      return handleResponse(response);
    },
    
    delete: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-proxies/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return true;
    },
    
    testConnection: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraping-proxies/${id}/test_connection/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    }
  }
};

// Export individual functions for direct import in components
export const scrapeData = apiService.scrapedData.scrapeNow;
export const getScrapedHistory = apiService.scrapedData.getAll;
export const deleteScrapedData = apiService.scrapingSchedules.delete;
export const scheduleScrapingTask = apiService.scrapedData.schedule;

// Export the default service object
export default apiService;