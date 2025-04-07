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
        emailVerified: false,
        verificationToken: token,
        createdAt: new Date()
    };

    await db.collection('users').insertOne(user);
    console.log(`Verification link: http://localhost:8000/verify/${token}`);
    return { message: 'Registered. Please verify your email.' };
}

async function loginUser(email, password) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid password');
    if (!user.emailVerified) throw new Error('Email not verified');

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
