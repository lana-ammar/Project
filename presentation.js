const path = require('path');
const express = require('express');
const router = express.Router();
const business = require('./business');

// Root route to serve the main page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'coreui', 'dist', 'index.html'));
});

// Register route
router.post('/register', async (req, res) => {
    const { name, email, contactNumber, degreeName, password, role } = req.body;
    try {
        const response = await business.registerUser(name, email, contactNumber, degreeName, password, role);
        res.json(response);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Email verification route
router.get('/verify/:token', async (req, res) => {
    try {
        const response = await business.verifyEmail(req.params.token);
        res.json(response);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password, role } = req.body; // Get role from request body
    try {
        const user = await business.loginUser(email, password, role); // Pass role to loginUser

        // Save user in session
        req.session.user = user;

        // Redirect based on role
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

// Profile route
router.get('/profile', async (req, res) => {
    const { userId } = req.query;
    try {
        const user = await business.getUserProfile(userId);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/verify/:token', async (req, res) => {
    try {
        const response = await business.verifyEmail(req.params.token);
        res.json(response);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;