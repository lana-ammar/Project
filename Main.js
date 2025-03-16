const express = require('express');
const presentation = require('./presentation');
const persistence = require('./persistence');

// Initialize Express
const app = express();

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use the presentation layer (routes)
app.use('/', presentation);

// Test MongoDB connection
persistence.connectDatabase()
    .then(() => {
        console.log('MongoDB connection successful');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
    });

// Start the server
const PORT = 8000; 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});