const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const business = require('./business');

const app = express();
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'coreui', 'dist')));

// Middleware for auth
function isAuthenticated(role) {
    return async (req, res, next) => {
        const sessionKey = req.cookies.sessionKey;
        const session = await business.getSession(sessionKey); // Use business layer
        if (!session || !session.Data) return res.redirect('/login.html');
        if (role && session.Data.role !== role) return res.status(403).send('Forbidden');
        req.user = session.Data;
        next();
    };
}

// Protect access to static pages
app.use(async (req, res, next) => {
    const publicPages = ['/', '/login.html'];
    if (req.path.endsWith('.html') && !publicPages.includes(req.path)) {
        const sessionKey = req.cookies.sessionKey;
        if (!sessionKey) return res.redirect('/login.html');

        const sessionData = await business.getSession(sessionKey); // Use business layer
        if (!sessionData) return res.redirect('/login.html');

        req.user = sessionData.Data; // Attach user data to request
    }
    next();
});

// Development-only email verification endpoint
router.get('/dev-verify/:email', async (req, res) => {
    try {
        const result = await business.verifyEmailDev(req.params.email); // Use business layer
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const result = await business.registerUser(...Object.values(req.body));
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const sessionInfo = await business.loginUser(email, password);
        res.cookie('sessionKey', sessionInfo.uuid, { httpOnly: true, maxAge: 1000 * 60 * 10 });
        
        // Determine redirect based on role
        let redirectUrl = '/';
        if (sessionInfo.role === 'student') {
            redirectUrl = '/student.html';
        } else if (sessionInfo.role === 'department_head') {
            redirectUrl = '/department-head.html';
        }
        
        res.json({ redirect: redirectUrl });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Protected student page
router.get('/student.html', isAuthenticated('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'coreui', 'dist', 'student.html'));
});

// Protected department head page
router.get('/department-head.html', isAuthenticated('department_head'), (req, res) => {
    res.sendFile(path.join(__dirname, 'coreui', 'dist', 'department-head.html'));
});

// Logout
router.post('/logout', async (req, res) => {
    const sessionKey = req.cookies.sessionKey;
    await business.deleteSession(sessionKey); // Use business layer
    res.clearCookie('sessionKey');
    res.json({ message: 'Logged out' });
});

app.use('/', router);

// Start server
app.listen(8000, () => console.log('Server running on port 8000'));