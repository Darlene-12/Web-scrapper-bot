import axios from 'axios';

// create axios instance with default configuration

const api = axios.create({
    baseURL: 'http://localhost:8000/scraping/api/',
    headers:{
        'Content-Type': 'application/json',
    },
});

// API functions for scraped DataTransfer

export const scrapeData = async (URL, keywords, dataType) =>{
    return api.post('scraped-data/scrape-now/, {url, keywords, dataType});')
};

export const getScrapedData = async (params) => {
    return api.get('scraped-data/', {params});
};

export const downloadCSV = async () =>  {
    return api.get('scraped-data/download-CSV', { responseType: 'blob'});
};

export const downloadJSON = async () => {
    return api.get('scraped-data/download-json/', {responseType: 'blob'})
};

export default api;