import axios from 'axios';

// create axios instance with default configuration

const api = axios.create({
    baseURL: 'http://localhost:8000/scraping/api/',
    headers:{
        'Content-Type': 'application/json',
    },
});