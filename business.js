const persistence = require('./persistence');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function registerUser(name, email, degreeName, password, role) {
    const db = await persistence.getDatabase();

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
        emailVerified: true, // For testing
        verificationToken: token,
        createdAt: new Date()
    };

    await db.collection('users').insertOne(user);
    console.log(`[DEV MODE] Email automatically verified for ${email}`);
    return { message: 'Registration successful. You can now login.' };
}

function generateVerificationToken() {
    return crypto.randomBytes(20).toString('hex');
}

async function loginUser(email, password) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user) throw new Error('User not found');

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
    if (!user) throw new Error('Invalid token');
    await db.collection('users').updateOne({ _id: user._id }, { $set: { emailVerified: true } });
    return { message: 'Email verified' };
}

async function getSession(sessionKey) {
    return await persistence.getSession(sessionKey);
}

async function deleteSession(sessionKey) {
    await persistence.deleteSession(sessionKey);
}

async function verifyEmailDev(email) {
    const db = await persistence.getDatabase();
    const result = await db.collection('users').updateOne(
        { email },
        { $set: { emailVerified: true } }
    );
    if (result.modifiedCount === 0) throw new Error('User not found or already verified');
    return { message: `Email ${email} verified for development` };
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
    
    // Calculate queue length for this category
    const queueLength = await db.collection('requests').countDocuments({
        category,
        status: 'Pending'
    });

    // Calculate estimated processing time
    const estimatedCompletion = calculateEstimatedCompletion(queueLength);
    
    const request = {
        studentId: new persistence.ObjectId(studentId), // Fix: Use 'new'
        category,
        semester,
        details,
        status: 'Pending',
        createdAt: new Date(),
        estimatedCompletion,
    };

    await db.collection('requests').insertOne(request);
    
    // Simulate email notification
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
            _id: new persistence.ObjectId(requestId), // Fix: Use 'new'
            studentId: new persistence.ObjectId(studentId), // Fix: Use 'new'
            status: 'Pending'
        },
        { $set: { status: 'Canceled', updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
        throw new Error('Request not found, already processed, or not owned by student');
    }

    // Simulate email notification
    console.log(`[EMAIL SIMULATION] Request canceled:
        To: Student ${studentId}
        Subject: Request Canceled
        Body: Your request ${requestId} has been canceled.
    `);
}

async function getStudentRequests(studentId, semester) {
    const db = await persistence.getDatabase();
    const query = { studentId: new persistence.ObjectId(studentId) }; // Fix: Use 'new'
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

module.exports = {
    registerUser,
    loginUser,
    verifyEmail,
    getSession,
    deleteSession,
    verifyEmailDev,
    submitRequest,
    cancelRequest,
    getStudentRequests
};