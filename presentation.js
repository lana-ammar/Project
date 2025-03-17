const express = require('express');
const router = express.Router();
const business = require('./business');

/**
 * Route to register a user.
 */
router.post('/register', async (req, res) => {
    const { name, email, contactNumber, degreeName, password } = req.body;
    try {
        const response = await business.registerUser(name, email, contactNumber, degreeName, password);
        res.json(response);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Route to verify email.
 */
router.get('/verify/:token', async (req, res) => {
    try {
        const response = await business.verifyEmail(req.params.token);
        res.json(response);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Route to get user profile (Example: /profile?userId=123).
 */
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
