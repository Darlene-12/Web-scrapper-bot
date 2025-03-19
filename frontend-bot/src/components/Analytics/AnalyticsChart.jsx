import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './AnalyticsChart.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsChart = ({ data, dataType }) => {
  const [chartData, setChartData] = useState([]);
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    if (!data) return;

    // Process data based on its type
    if (dataType === 'review') {
      processReviewData(data);
    } else if (dataType === 'product') {
      processProductData(data);
    } else {
      // Generic data processing
      processGenericData(data);
    }
  }, [data, dataType]);

  const processReviewData = (reviewData) => {
    if (!reviewData.statistics) return;

    // Create sentiment analysis data
    if (reviewData.statistics.rating_distribution) {
      const distribution = reviewData.statistics.rating_distribution;
      const formattedData = Object.entries(distribution).map(([rating, count]) => ({
        rating,
        count,
        percentage: reviewData.statistics.rating_percentage?.[rating] || 0
      }));

      setChartData(formattedData);
      setChartType('sentiment');
    }
  };

  const processProductData = (productData) => {
    // For product data, show price comparisons if multiple products
    if (Array.isArray(productData.products) && productData.products.length > 0) {
      const formattedData = productData.products.map(product => ({
        name: product.title?.substring(0, 30) || 'Product',
        price: product.price || 0,
        rating: product.rating || 0
      }));

      setChartData(formattedData);
      setChartType('product');
    }
  };

  const processGenericData = (genericData) => {
    // For generic data, try to find countable properties
    const processed = [];
    
    // If data is an array, count occurrences of common attributes
    if (Array.isArray(genericData)) {
      // For example, count by domain or content type
      const countByType = {};
      
      genericData.forEach(item => {
        const type = item.type || 'unknown';
        countByType[type] = (countByType[type] || 0) + 1;
      });
      
      Object.entries(countByType).forEach(([type, count]) => {
        processed.push({ name: type, value: count });
      });
      
      setChartData(processed);
      setChartType('pie');
    }
  };

  const renderSentimentAnalysis = () => {
    return (
      <div>
        <h3>Sentiment Analysis</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Number of Reviews" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderProductAnalysis = () => {
    return (
      <div>
        <h3>Product Price Comparison</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="price" fill="#82ca9d" name="Price" />
              <Bar dataKey="rating" fill="#8884d8" name="Rating" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    return (
      <div>
        <h3>Data Distribution</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (!data || chartData.length === 0) {
    return <div className="no-data-message">No data available for analysis.</div>;
  }

  return (
    <div className="analytics-container">
      {chartType === 'sentiment' && renderSentimentAnalysis()}
      {chartType === 'product' && renderProductAnalysis()}
      {chartType === 'pie' && renderPieChart()}
    </div>
  );
};

export default AnalyticsChart;
