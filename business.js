const persistence = require('./persistence');
const bcrypt = require('bcrypt');

async function registerUser(name, email, contactNumber, degreeName, password, role) {
    if (!name || !email || !contactNumber || !degreeName || !password || !role) {
        throw new Error('All fields are required');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();

    const db = await persistence.getDatabase();
    const user = {
        name,
        email,
        contactNumber,
        degreeName,
        password: hashedPassword,
        role,
        emailVerified: false,
        verificationToken
    };

    const result = await db.collection('users').insertOne(user);
    console.log(`Verification link: http://localhost:8000/verify/${verificationToken}`);
    return { message: 'Registered. Please verify your email.', userId: result.insertedId };
}

async function loginUser(email, password, role) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) throw new Error('User not found');
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new Error('Invalid password');
    if (!user.emailVerified) throw new Error('Email not verified');
    if (user.role !== role) throw new Error(`You are not authorized as a ${role}`);

    return user;
}

function generateVerificationToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function verifyEmail(token) {
    const db = await persistence.getDatabase();
    const user = await db.collection('users').findOne({ verificationToken: token });

    if (!user) throw new Error('Invalid token');
    await db.collection('users').updateOne({ _id: user._id }, { $set: { emailVerified: true } });
    return { message: 'Email verified successfully' };
}

module.exports = { registerUser, loginUser, verifyEmail };
