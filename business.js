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
        emailVerified: true, // Changed from false to true for testing
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
    
    // Temporarily comment out this check for testing
    // if (!user.emailVerified) throw new Error('Email not verified');

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

module.exports = { registerUser, loginUser, verifyEmail };
