const path = require('path');
const express = require('express');
const router = express.Router();
const business = require('./business');

// Middleware to protect pages
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
}

// Serve homepage
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'coreui', 'dist', 'index.html'));
});

// Register
router.post('/register', async (req, res) => {
    const { name, email, contactNumber, degreeName, password, role } = req.body;
    try {
        const result = await business.registerUser(name, email, contactNumber, degreeName, password, role);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Email verification
router.get('/verify/:token', async (req, res) => {
    try {
        const result = await business.verifyEmail(req.params.token);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const user = await business.loginUser(email, password, role);
        req.session.user = user;

        if (user.role === 'student') {
            res.json({ redirect: '/student.html' });
        } else if (user.role === 'department_head') {
            res.json({ redirect: '/department-head.html' });
        } else {
            res.status(400).json({ error: 'Invalid role' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Protected student page
router.get('/student.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'coreui', 'dist', 'student.html'));
});

// Protected department head page
router.get('/department-head.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'coreui', 'dist', 'department-head.html'));
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

module.exports = router;
