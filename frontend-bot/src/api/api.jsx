// api.js - API Service for connecting to Django backend

// Base API URL - change this to match your backend
const API_BASE_URL = 'http://localhost:8000/api';

// Helper function for handling API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    // Try to parse error message from the response if possible
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.detail || `HTTP error ${response.status}`);
    } catch (e) {
      throw new Error(`HTTP error ${response.status}`);
    }
  }
  
  // Check if response is empty
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  } else {
    return response.text();
  }
};

// Helper function to get auth headers for authenticated requests
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Token ${token}` } : {};
}

// API Services object
const apiService = {
  // Authentication
  auth: {
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
    
    logout: () => {
      localStorage.removeItem('authToken');
    },
    
    register: async (userData) => {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      return handleResponse(response);
    },
    
    getUser: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/user/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    }
  },
  
  // Scraped Data endpoints
  scrapedData: {
    getAll: async (params = {}) => {
      // Convert params object to query string
      const queryParams = params instanceof URLSearchParams 
        ? params 
        : new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null));
      
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
    
    delete: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return true;
    },
    
    bulkDelete: async (ids) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/bulk_delete/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return true;
    },
    
    // Methods for downloading data
    downloadCSV: async (ids = null) => {
      let url = `${API_BASE_URL}/scraped-data/download_csv/`;
      
      if (ids && ids.length > 0) {
        const queryParams = new URLSearchParams();
        ids.forEach(id => queryParams.append('ids', id));
        url += `?${queryParams.toString()}`;
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const blob = await response.blob();
        return blob;
      } catch (error) {
        console.error('Error downloading CSV:', error);
        throw error;
      }
    },
    
    downloadJSON: async (ids = null) => {
      let url = `${API_BASE_URL}/scraped-data/download_json/`;
      
      if (ids && ids.length > 0) {
        const queryParams = new URLSearchParams();
        ids.forEach(id => queryParams.append('ids', id));
        url += `?${queryParams.toString()}`;
      }
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const blob = await response.blob();
        return blob;
      } catch (error) {
        console.error('Error downloading JSON:', error);
        throw error;
      }
    },
    
    getRawHTML: async (id) => {
      const response = await fetch(`${API_BASE_URL}/scraped-data/${id}/raw_html/`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return response.text();
    }
  },
  
  // Scraping Schedule endpoints
  schedules: {
    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/schedules/?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/schedules/${id}/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    create: async (scheduleData) => {
      const response = await fetch(`${API_BASE_URL}/schedules/`, {
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
      const response = await fetch(`${API_BASE_URL}/schedules/${id}/`, {
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
      const response = await fetch(`${API_BASE_URL}/schedules/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return true;
    },
    
    runNow: async (id) => {
      const response = await fetch(`${API_BASE_URL}/schedules/${id}/run_now/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    toggleActive: async (id, isActive) => {
      const response = await fetch(`${API_BASE_URL}/schedules/${id}/toggle_active/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
      });
      return handleResponse(response);
    }
  },
  
  // Scraping Proxy endpoints
  proxies: {
    getAll: async (filters = {}) => {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/proxies/?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/proxies/${id}/`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
    
    create: async (proxyData) => {
      const response = await fetch(`${API_BASE_URL}/proxies/`, {
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
      const response = await fetch(`${API_BASE_URL}/proxies/${id}/`, {
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
      const response = await fetch(`${API_BASE_URL}/proxies/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return true;
    },
    
    testConnection: async (id) => {
      const response = await fetch(`${API_BASE_URL}/proxies/${id}/test_connection/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    }
  }
};

// Export individual functions for direct import in components
export const login = apiService.auth.login;
export const logout = apiService.auth.logout;
export const register = apiService.auth.register;

export const getScrapedData = apiService.scrapedData.getAll;
export const getScrapedDataById = apiService.scrapedData.getById;
export const scrapeData = apiService.scrapedData.scrapeNow;
export const scheduleScrapingTask = apiService.scrapedData.schedule;
export const deleteScrapedData = apiService.scrapedData.delete;
export const bulkDeleteScrapedData = apiService.scrapedData.bulkDelete;
export const downloadCSV = apiService.scrapedData.downloadCSV;
export const downloadJSON = apiService.scrapedData.downloadJSON;
export const getRawHTML = apiService.scrapedData.getRawHTML;

export const getSchedules = apiService.schedules.getAll;
export const getScheduleById = apiService.schedules.getById;
export const createSchedule = apiService.schedules.create;
export const updateSchedule = apiService.schedules.update;
export const deleteSchedule = apiService.schedules.delete;
export const runSchedule = apiService.schedules.runNow;
export const toggleScheduleActive = apiService.schedules.toggleActive;

export const getProxies = apiService.proxies.getAll;
export const getProxyById = apiService.proxies.getById;
export const createProxy = apiService.proxies.create;
export const updateProxy = apiService.proxies.update;
export const deleteProxy = apiService.proxies.delete;
export const testProxy = apiService.proxies.testConnection;

// Add alias for addProxy function to maintain compatibility with ProxyManagement component
export const addProxy = apiService.proxies.create;

// Export the default service object
export default apiService;