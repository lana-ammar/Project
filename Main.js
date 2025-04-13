const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const exphbs = require('express-handlebars');
const business = require('./business');

const app = express();
const router = express.Router();

// Handlebars setup with section helper
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
        eq: (a, b) => a === b,
        formatDate: (date) => date ? new Date(date).toLocaleString() : '',
        section: function(name, options) {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CSRF token generation (stored in cookie)
app.use((req, res, next) => {
    let csrfToken = req.cookies.csrfToken;
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', csrfToken, { httpOnly: true });
    }
    res.locals.csrfToken = csrfToken;
    req.csrfToken = csrfToken;
    next();
});

// CSRF validation
function verifyCsrfToken(req, res, next) {
    if (req.method === 'POST') {
        const submittedToken = req.body._csrf;
        if (!submittedToken || submittedToken !== req.csrfToken) {
            return res.status(403).render('index', {
                title: 'Login',
                message: 'Invalid CSRF token'
            });
        }
    }
    next();
}

// Middleware for auth
function isAuthenticated(role) {
    return async (req, res, next) => {
        const sessionKey = req.cookies.sessionKey;
        const session = await business.getSession(sessionKey);
        if (!session || !session.Data) {
            return res.redirect('/');
        }
        if (role && session.Data.role !== role) {
            return res.status(403).send('Forbidden');
        }
        req.user = session.Data;
        next();
    };
}

// Public routes
router.get('/', (req, res) => {
    res.render('index', { title: 'Login', csrfToken: req.csrfToken });
});

router.get('/register', (req, res) => {
    res.render('register', { title: 'Register', csrfToken: req.csrfToken });
});

// Development-only email verification
router.get('/dev-verify/:email', async (req, res) => {
    try {
        const result = await business.verifyEmailDev(req.params.email);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Register
router.post('/register', verifyCsrfToken, async (req, res) => {
    try {
        const result = await business.registerUser(...Object.values(req.body));
        res.render('index', {
            title: 'Login',
            message: result.message,
            csrfToken: req.csrfToken
        });
    } catch (err) {
        res.status(400).render('register', {
            title: 'Register',
            message: err.message,
            csrfToken: req.csrfToken
        });
    }
});

// Login
router.post('/login', verifyCsrfToken, async (req, res) => {
    const { email, password } = req.body;
    try {
        const sessionInfo = await business.loginUser(email, password);
        res.cookie('sessionKey', sessionInfo.uuid, { httpOnly: true, maxAge: 1000 * 60 * 10 });
        
        if (sessionInfo.role === 'student') {
            res.redirect('/student');
        } else if (sessionInfo.role === 'department_head') {
            res.redirect('/department-head');
        } else {
            res.redirect('/');
        }
    } catch (err) {
        res.status(400).render('index', {
            title: 'Login',
            message: err.message,
            csrfToken: req.csrfToken
        });
    }
});

// Student dashboard
router.get('/student', isAuthenticated('student'), async (req, res) => {
    try {
        const studentId = req.user._id;
        const semester = req.query.semester || '';
        const requests = await business.getStudentRequests(studentId, semester);
        res.render('student', {
            title: 'Student Dashboard',
            requests,
            semester,
            csrfToken: req.csrfToken
        });
    } catch (err) {
        res.render('student', {
            title: 'Student Dashboard',
            message: err.message,
            requests: [],
            csrfToken: req.csrfToken
        });
    }
});

// Request submission
router.post('/requests/submit', isAuthenticated('student'), verifyCsrfToken, async (req, res) => {
    try {
        const { category, semester, details } = req.body;
        const studentId = req.user._id;
        await business.submitRequest(studentId, category, semester, details);
        res.redirect('/student');
    } catch (err) {
        const requests = await business.getStudentRequests(req.user._id, req.query.semester || '');
        res.status(400).render('student', {
            title: 'Student Dashboard',
            message: err.message,
            requests,
            semester: req.query.semester || '',
            csrfToken: req.csrfToken
        });
    }
});

// Request cancellation
router.post('/requests/cancel/:requestId', isAuthenticated('student'), verifyCsrfToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        const studentId = req.user._id;
        await business.cancelRequest(studentId, requestId);
        res.redirect('/student');
    } catch (err) {
        const requests = await business.getStudentRequests(req.user._id, req.query.semester || '');
        res.status(400).render('student', {
            title: 'Student Dashboard',
            message: err.message,
            requests,
            semester: req.query.semester || '',
            csrfToken: req.csrfToken
        });
    }
});

// Department head dashboard (placeholder)
router.get('/department-head', isAuthenticated('department_head'), (req, res) => {
    res.render('department-head', {
        title: 'Department Head Dashboard',
        csrfToken: req.csrfToken
    });
});

// Logout
router.post('/logout', verifyCsrfToken, async (req, res) => {
    const sessionKey = req.cookies.sessionKey;
    await business.deleteSession(sessionKey);
    res.clearCookie('sessionKey');
    res.clearCookie('csrfToken');
    res.redirect('/');
});

app.use('/', router);

app.listen(8000, () => console.log('Server running on port 8000'));