import React, {useState} from 'react';
import { downloadCSV, downloadJSON } from '../../services/api';

const ResultsTable = ({data}) => {

    const [expandedRow, setExpandedRow] = useState(null);

    if(!data ||!data.content) {
        return <div className="no-results">No data available</div>;
    }

    const handleDownloadCSV = async () =>{
        try{
            const response = await downloadCSV();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scraped_data.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }catch(error) {
            console.error('Error downloading CSV:', error);
            alert('Failed to Download CSV');
        }
        
    };

    const handleDownloadJSON = async () => {
        try{
            const response = await downloadJSON();
            const url = window.URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'scraped_data.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
        }catch(error) {
            console.error('Error downloading JSON:', error);
            alert('Failed to Download JSON');
        }
    };

    const toggleExpandedRow = (index) => {
        if (expandedRow === index){
            setExpandedRow(null);
        } else {
            setExpandedRow(index);
        }
    };

    //Generate table headers based on data type

    const renderTableHeaders = () => {
        // if we don't have data,show the default product headers
        if(!data || !data.data_type){
            return (
                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Actions</th>
                </tr>
            );
        }
        
        
        const {data_type} = data;

        switch (data_type){
            case 'product':
                return(
                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Rating</th> 
                        <th>Review</th>
                        <th>Actions</th>
                    </tr>
                );
            case 'review':
                return (
                    <tr>
                        <th>Reviewer</th>
                        <th>Rating</th>
                        <th> Date</th>
                        <th>Comment</th>
                        <th>Actions</th>
                    </tr>
                );
            default:
                return(
                    <tr>
                        <th>Title</th>
                        <th>URL</th>
                        <th>Content</th>
                        <th>Actions</th>
                    </tr>
                );
        }
    };

    // Render table rows based on data
    const renderTableRows = () => {
        const content = data.content;

        // For product data
        if (data.data_type === 'product'){
            return (
                <tr>
                    <td>{content.title || 'N/A'}</td>
                    <td>{content.price ?
                    (content.currency ? `${content.currency} ${content.price} `: `${content.price}`)
                    : 'N/A'}
                    </td>
                    <td>{content.review_count ? `${content.review_count} reviews`: 'N/A'}</td>
                    <td>
                        <button onClick={() => toggleExpandedRow(0)} className="view-details-btn">
                            {expandedRow === 0 ? 'Hide Details': 'View Details'}
                        </button>
                    </td>
                </tr>
            );
        }

        // For review data
        if (data.data_type === 'review' && content.reviews){
            return content.reviews.slice(0, 10).map ((review, index)=>(
                <tr key={index}>
                    <td>{review.reviewer_name || 'Anonymous'}</td>
                    <td>{review.rating || 'N/A'}</td>
                    <td>{review.date || 'N/A'}</td>
                    <td className ="review-text">{review.text ? `${review.text.slice(0, 100)}...`: 'N/A'}</td>
                    <td>
                        <button onClick={() => toggleExpandedRow(index)} className="view-details-btn">
                        {expandedRow === index? 'Hide Details': 'View Details'}
                        </button>
                    </td>
                </tr>
            ));
        }

        //Default/general content
        return (
            <tr>
                <td>{content.title || 'N/A'}</td>
                <td>{data.url || 'N/A'}</td>
                <td>{content.text_sample ? `${content.text_sample.slice(0, 100)}...` : 'N/A'}</td>
                <td>
                <button onClick={() => toggleExpandRow(0)} className="view-details-btn">
                    {expandedRow === 0 ? 'Hide Details' : 'View Details'}
                </button>
                </td>
          </tr>

        );
    };

    // Render expanded content for row details
    const renderExpandedContent = () => {
        if (expandedRow === null) return null;
        
        const content = data.content;
        
        return (
        <div className="expanded-content">
            <h3>Detailed Information</h3>
            <pre>{JSON.stringify(content, null, 2)}</pre>
        </div>
        );
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
                    {renderTableHeaders()}
                </thead>
                <tbody>
                    {renderTableRows()}
                </tbody>
                </table>
            </div>
        
            {renderExpandedContent()}
        
            <div className="analytics-section">
                <h3>Analytics:</h3>
                <div className="sentiment-chart-placeholder">
                [Sentiment Analysis Chart]
                </div>
            </div>
        </div>
    );
};

export default ResultsTable;