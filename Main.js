const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const presentation = require('./presentation');
const persistence = require('./persistence');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'coreui', 'dist')));

// Protect access to static pages
app.use(async (req, res, next) => {
    const publicPages = ['/', '/login.html'];
    if (req.path.endsWith('.html') && !publicPages.includes(req.path)) {
        const sessionKey = req.cookies.sessionKey;
        if (!sessionKey) return res.redirect('/login.html');

        const sessionData = await persistence.getSession(sessionKey);
        if (!sessionData) return res.redirect('/login.html');

        req.user = sessionData.Data; // Attach user data to request
    }
    next();
});

app.use('/', presentation);

// Connect DB
persistence.connectDatabase()
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection failed:', err));

// Start server
app.listen(8000, () => console.log('Server running on port 8000'));
