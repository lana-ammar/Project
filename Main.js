const express = require('express');
const path = require('path');
const presentation = require('./presentation');
const persistence = require('./persistence');

// Initialize Express
const app = express();

// Middleware for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the CoreUI template
app.use(express.static(path.join(__dirname, 'coreui', 'dist')));

// Use the routes
app.use('/', presentation);

// Connect to MongoDB
persistence.connectDatabase()
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection failed:', err));

// Start server
const PORT = 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));