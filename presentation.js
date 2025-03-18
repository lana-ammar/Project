const path = require('path');
const express = require('express');
const router = express.Router();
const business = require('./business');

// Root route to serve the main page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'coreui', 'dist', 'index.html'));
});

// Other routes (register, verify, profile)
router.post('/register', async (req, res) => {
    const { name, email, contactNumber, degreeName, password, role } = req.body;
    try {
        const response = await business.registerUser(name, email, contactNumber, degreeName, password, role);
        res.json(response);
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

router.get('/profile', async (req, res) => {
    const { userId } = req.query;
    try {
        const user = await business.getUserProfile(userId);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;