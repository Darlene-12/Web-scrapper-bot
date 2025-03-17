import React, {useState} from 'react';
import {scrapeData} from '../../services/api';
import './ScrapeForm.css';


const ScrapeForm = (
    {
        onScrapingComplete}) =>{
            const [formData, setFormData] = useState({
                url: '',
                keywords: '',
                dataType: '',
            })}
            
