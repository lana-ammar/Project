const express = require('express');
const path = require('path');
const presentation = require('./presentation');
const persistence = require('./persistence');
const session = require('express-session');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Static files
app.use(express.static(path.join(__dirname, 'coreui', 'dist')));

// Protect HTML access via session
app.use((req, res, next) => {
    if (!req.session.user && req.path.endsWith('.html') && req.path !== '/login.html') {
        return res.redirect('/login.html');
    }
    next();
});

// Routes
app.use('/', presentation);

// Connect DB
persistence.connectDatabase()
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection failed:', err));

// Start server
const PORT = 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
