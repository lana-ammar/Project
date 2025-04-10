const path = require('path');
const express = require('express');
const router = express.Router();
const business = require('./business');
const persistence = require('./persistence');

// Middleware for auth
function isAuthenticated(role) {
    return async (req, res, next) => {
        const sessionKey = req.cookies.sessionKey;
        const session = await persistence.getSession(sessionKey);
        if (!session || !session.Data) return res.redirect('/login.html');
        if (role && session.Data.role !== role) return res.status(403).send('Forbidden');
        req.user = session.Data;
        next();
    };
}

// Home page
// Development-only email verification endpoint
router.get('/dev-verify/:email', async (req, res) => {
    try {
        const db = await persistence.getDatabase();
        await db.collection('users').updateOne(
            { email: req.params.email },
            { $set: { emailVerified: true } }
        );
        res.json({ message: `Email ${req.params.email} verified for development` });
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
    await persistence.deleteSession(sessionKey);
    res.clearCookie('sessionKey');
    res.json({ message: 'Logged out' });
});

module.exports = router;
