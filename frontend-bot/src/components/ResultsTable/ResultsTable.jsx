import React, {useState} from 'react';
import { downloadCSV, downloadJSON } from '../../services/api';
import './ResultsTable.css';

const ResultsTable = ({data}) => {
    const [expandedRow, setExpandedRow] = useState(null);

    const handleDownloadCSV = async () => {
        try {
            const response = await downloadCSV();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scraped_data.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch(error) {
            console.error('Error downloading CSV:', error);
            alert('Failed to Download CSV');
        }
    };

    const handleDownloadJSON = async () => {
        try {
            const response = await downloadJSON();
            const url = window.URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scraped_data.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch(error) {
            console.error('Error downloading JSON:', error);
            alert('Failed to Download JSON');
        }
    };

    const toggleExpandedRow = (index) => {
        if (expandedRow === index) {
            setExpandedRow(null);
        } else {
            setExpandedRow(index);
        }
    };

    return (
        <div className="results-table-container">
            <div className="results-header">
                <h2>Results:</h2>
                <div className="download-buttons">
                    <button onClick={handleDownloadCSV} className="download-btn csv-btn">Download CSV</button>
                    <button onClick={handleDownloadJSON} className="download-btn json-btn">Download JSON</button>
                </div>
            </div>
            
            <div className="table-wrapper">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Rating</th>
                            <th>Review</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!data || !data.content ? (
                            <tr>
                                <td colSpan="4" className="no-data">No data available</td>
                            </tr>
                        ) : (
                            // Render actual data if available
                            data.data_type === 'product' ? (
                                <tr>
                                    <td>{data.content.title || 'N/A'}</td>
                                    <td>
                                        {data.content.price 
                                            ? (data.content.currency ? `${data.content.currency} ${data.content.price}` : data.content.price)
                                            : 'N/A'}
                                    </td>
                                    <td>{data.content.rating || 'N/A'}</td>
                                    <td>{data.content.review_count ? `${data.content.review_count} reviews` : 'N/A'}</td>
                                </tr>
                            ) : data.data_type === 'review' && data.content.reviews ? (
                                // Render review data
                                data.content.reviews.slice(0, 10).map((review, index) => (
                                    <tr key={index}>
                                        <td>{review.reviewer_name || 'Anonymous'}</td>
                                        <td>{review.rating || 'N/A'}</td>
                                        <td>{review.date || 'N/A'}</td>
                                        <td className="review-text">{review.text ? `${review.text.slice(0, 100)}...` : 'N/A'}</td>
                                    </tr>
                                ))
                            ) : (
                                // Default case
                                <tr>
                                    <td>{data.content.title || 'N/A'}</td>
                                    <td>{data.url || 'N/A'}</td>
                                    <td colSpan="2">{data.content.text_sample ? `${data.content.text_sample.slice(0, 100)}...` : 'N/A'}</td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>
            
            {data && data.content && expandedRow !== null && (
                <div className="expanded-content">
                    <h3>Detailed Information</h3>
                    <pre>{JSON.stringify(data.content, null, 2)}</pre>
                </div>
            )}
            
            {data && data.content && (
                <div className="analytics-section">
                    <h3>Analytics:</h3>
                    <div className="sentiment-chart-placeholder">
                        [Sentiment Analysis Chart]
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsTable;