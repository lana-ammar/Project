const persistence = require('./persistence');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function registerUser(name, email, degreeName, password, role) {
    const validRoles = ['student', 'department_head'];
    if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
    }
    const db = await persistence.getDatabase();

    email = email.toLowerCase();

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) throw new Error('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = generateVerificationToken();

    const user = {
        name,
        email,
        degreeName,
        password: hashedPassword,
        role,
        emailVerified: false,
        verificationToken: token,
        createdAt: new Date()
    };

    await db.collection('users').insertOne(user);
    console.log(`[EMAIL SIMULATION] Verification email sent:
        To: ${email}
        Subject: Verify Your Email
        Body: Please verify your email by visiting http://localhost:8000/verify/${token}
    `);
    return { message: 'Registration successful. Please verify your email to login.' };
}

function generateVerificationToken() {
    return crypto.randomBytes(20).toString('hex');
}

async function loginUser(email, password) {
    const db = await persistence.getDatabase();
    email = email.toLowerCase();

    const user = await db.collection('users').findOne({ email });
    if (!user) throw new Error('User not found');

    if (!user.emailVerified) throw new Error('Email not verified. Please verify your email to login.');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid password');

    const uuid = crypto.randomUUID();
    const expiry = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes
    await persistence.saveSession(uuid, expiry, {
        _id: user._id,
        email: user.email,
        role: user.role
    });

    return { uuid, role: user.role };
}

async function verifyEmail(token) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({ verificationToken: token });
    if (!user) throw new Error('Invalid verification token');
    if (user.emailVerified) throw new Error('Email already verified');

    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { emailVerified: true, verificationToken: null } }
    );
    return { message: 'Email verified successfully. You can now login.' };
}

async function getSession(sessionKey) {
    return await persistence.getSession(sessionKey);
}

async function deleteSession(sessionKey) {
    await persistence.deleteSession(sessionKey);
}

async function verifyEmailDev(email) {
    const db = await persistence.getDatabase();

    email = email.toLowerCase();

    const user = await db.collection('users').findOne({ email });
    if (!user) throw new Error('User not found');
    if (user.emailVerified) throw new Error('Email already verified');

    const result = await db.collection('users').updateOne(
        { email },
        { $set: { emailVerified: true, verificationToken: null } }
    );
    if (result.modifiedCount === 0) throw new Error('Failed to verify email');
    return { message: `Email ${email} verified for development` };
}

async function requestPasswordReset(email) {
    const db = await persistence.getDatabase();
    email = email.toLowerCase();

    const user = await db.collection('users').findOne({ email });
    if (!user) {
        throw new Error('No account found with that email');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiry

    await db.collection('users').updateOne(
        { email },
        { $set: { resetToken, resetTokenExpiry } }
    );

    console.log(`[EMAIL SIMULATION] Password reset requested:
        To: ${email}
        Subject: Password Reset Request
        Body: Please reset your password by visiting http://localhost:8000/reset-password/${resetToken}
        Expires: ${resetTokenExpiry.toISOString()}
    `);
}

async function validateResetToken(token) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
    });
    return !!user;
}

async function resetPassword(token, password) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) throw new Error('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').updateOne(
        { _id: user._id },
        {
            $set: { password: hashedPassword },
            $unset: { resetToken: "", resetTokenExpiry: "" }
        }
    );

    console.log(`[EMAIL SIMULATION] Password reset successful:
        To: ${user.email}
        Subject: Password Reset Confirmation
        Body: Your password has been successfully reset.
    `);
}

// Request handling
const REQUEST_CATEGORIES = ['Change Section', 'Register Over Cap', 'Capstone Registration'];
const WORKING_HOURS_START = 9; // 9 AM
const WORKING_HOURS_END = 17; // 5 PM
const MINUTES_PER_REQUEST = 15; // Estimated time per request

async function submitRequest(studentId, category, semester, details) {
    if (!REQUEST_CATEGORIES.includes(category)) {
        throw new Error('Invalid request category');
    }
    if (!semester) {
        throw new Error('Semester is required');
    }

    const db = await persistence.getDatabase();
    
    const queueLength = await db.collection('requests').countDocuments({
        category,
        status: 'Pending'
    });

    const estimatedCompletion = calculateEstimatedCompletion(queueLength);
    
    const request = {
        studentId: new persistence.ObjectId(studentId),
        category,
        semester,
        details,
        status: 'Pending',
        createdAt: new Date(),
        estimatedCompletion,
    };

    await db.collection('requests').insertOne(request);
    
    console.log(`[EMAIL SIMULATION] Request submitted:
        To: Student ${studentId}
        Subject: Request Received
        Body: Your ${category} request for ${semester} has been received. Estimated completion: ${estimatedCompletion.toISOString()}
    `);
}

async function cancelRequest(studentId, requestId) {
    const db = await persistence.getDatabase();
    const result = await db.collection('requests').updateOne(
        {
            _id: new persistence.ObjectId(requestId),
            studentId: new persistence.ObjectId(studentId),
            status: 'Pending'
        },
        { $set: { status: 'Canceled', updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
        throw new Error('Request not found, already processed, or not owned by student');
    }

    console.log(`[EMAIL SIMULATION] Request canceled:
        To: Student ${studentId}
        Subject: Request Canceled
        Body: Your request ${requestId} has been canceled.
    `);
}

async function getStudentRequests(studentId, semester) {
    const db = await persistence.getDatabase();
    const query = { studentId: new persistence.ObjectId(studentId) };
    if (semester) {
        query.semester = semester;
    }
    return await db.collection('requests').find(query).toArray();
}

function calculateEstimatedCompletion(queueLength) {
    const now = new Date();
    let totalMinutes = queueLength * MINUTES_PER_REQUEST;
    let current = new Date(now);

    while (totalMinutes > 0) {
        const hours = current.getHours();
        const day = current.getDay();

        if (day >= 1 && day <= 5 && hours >= WORKING_HOURS_START && hours < WORKING_HOURS_END) {
            const minutesUntilEndOfDay = (WORKING_HOURS_END - hours) * 60 - current.getMinutes();
            const minutesToProcessToday = Math.min(totalMinutes, minutesUntilEndOfDay);
            totalMinutes -= minutesToProcessToday;
            current = new Date(current.getTime() + minutesToProcessToday * 60 * 1000);
        } else {
            current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + (day === 0 || day === 6 ? 1 : 0));
            current.setHours(WORKING_HOURS_START, 0, 0, 0);
            if (day === 5) {
                current.setDate(current.getDate() + 3);
            } else if (day === 6) {
                current.setDate(current.getDate() + 2);
            }
        }
    }

    return current;
}

async function getRequestQueues() {
    const db = await persistence.getDatabase();
    const queues = [];
    for (const category of REQUEST_CATEGORIES) {
        const count = await db.collection('requests').countDocuments({ category, status: 'Pending' });
        queues.push({ category, count });
    }
    return queues;
}

async function getRequestsByCategory(category) {
    const db = await persistence.getDatabase();
    const requests = await db.collection('requests').find({ category, status: 'Pending' }).toArray();
    for (let request of requests) {
        const student = await db.collection('users').findOne({ _id: request.studentId });
        request.student = student || { name: 'Unknown', email: 'Unknown' };
    }
    return requests;
}

async function getRequestById(requestId) {
    const db = await persistence.getDatabase();
    const request = await db.collection('requests').findOne({ _id: new persistence.ObjectId(requestId) });
    if (request) {
        const student = await db.collection('users').findOne({ _id: request.studentId });
        request.student = student || { name: 'Unknown', email: 'Unknown' };
    }
    return request;
}

async function processRequest(requestId, action, note) {
    const db = await persistence.getDatabase();
    const request = await db.collection('requests').findOne({ _id: new persistence.ObjectId(requestId) });
    if (!request || request.status !== 'Pending') {
        throw new Error('Request not found or already processed');
    }

    const newStatus = action === 'resolve' ? 'Resolved' : 'Rejected';
    await db.collection('requests').updateOne(
        { _id: new persistence.ObjectId(requestId) },
        { $set: { status: newStatus, note, updatedAt: new Date() } }
    );

    const student = await db.collection('users').findOne({ _id: request.studentId });

    console.log(`[EMAIL SIMULATION] Request ${newStatus}:
        To: ${student.email}
        Subject: Request ${newStatus}
        Body: Your ${request.category} request for ${request.semester} has been ${newStatus}. Note: ${note}
    `);
}

async function getRandomPendingRequest() {
    const db = await persistence.getDatabase();
    const pendingRequests = await db.collection('requests').find({ status: 'Pending' }).toArray();
    if (pendingRequests.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * pendingRequests.length);
    return pendingRequests[randomIndex];
}

module.exports = {
    registerUser,
    loginUser,
    verifyEmail,
    getSession,
    deleteSession,
    verifyEmailDev,
    requestPasswordReset,
    validateResetToken,
    resetPassword,
    submitRequest,
    cancelRequest,
    getStudentRequests,
    getRequestQueues,
    getRequestsByCategory,
    getRequestById,
    processRequest,
    getRandomPendingRequest
};