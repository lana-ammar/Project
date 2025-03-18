const persistence = require('./persistence');
const bcrypt = require('bcrypt');

async function registerUser(name, email, contactNumber, degreeName, password, role) {
    try {
        // Validate input
        if (!name || !email || !contactNumber || !degreeName || !password || !role) {
            throw new Error('All fields are required');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to database
        const db = await persistence.getDatabase();
        const user = {
            name,
            email,
            contactNumber,
            degreeName,
            password: hashedPassword,
            role,
            emailVerified: false,
            verificationToken: generateVerificationToken() // Implement this function
        };

        const result = await db.collection('users').insertOne(user);
        console.log('User inserted successfully:', result.insertedId);
        return { message: 'User registered successfully', userId: result.insertedId };
    } catch (err) {
        console.error('Error in registerUser:', err);
        throw err;
    }
}

async function verifyEmail(token) {
    try {
        const db = await persistence.getDatabase();
        const user = await db.collection('users').findOne({ verificationToken: token });
        if (!user) {
            throw new Error('Invalid token');
        }

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { emailVerified: true } }
        );

        return { message: 'Email verified successfully' };
    } catch (err) {
        console.error('Error in verifyEmail:', err);
        throw err;
    }
}

async function getUserProfile(userId) {
    try {
        const db = await persistence.getDatabase();
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        return user;
    } catch (err) {
        console.error('Error in getUserProfile:', err);
        throw err;
    }
}

function generateVerificationToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

module.exports = { registerUser, verifyEmail, getUserProfile };