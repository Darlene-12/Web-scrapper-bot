import React, {useState} from 'react';
import {scrapeData} from '../../services/api';
import './ScrapeForm.css';


const ScrapeForm = ({onScrapingComplete}) =>{
    const [formData, setFormData] = useState({
                url: '',
                keywords: '',
                dataType: '',
     })}

    const [loading, setloading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    }

            
