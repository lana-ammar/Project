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

        // Generate verification token
        const verificationToken = generateVerificationToken();

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
            verificationToken // Store the token
        };

        const result = await db.collection('users').insertOne(user);
        console.log('User inserted successfully:', result.insertedId);

        // Simulate sending an email by logging the verification link
        console.log(`Verification link: http://localhost:8000/verify/${verificationToken}`);

        return { message: 'User registered successfully. Please check your email for verification.', userId: result.insertedId };
    } catch (err) {
        console.error('Error in registerUser:', err);
        throw err;
    }
}

async function loginUser(email, password, role) {
    try {
        const db = await persistence.getDatabase();
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            throw new Error('User not found');
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new Error('Invalid password');
        }

        // Verify email
        if (!user.emailVerified) {
            throw new Error('Email not verified');
        }

        // Verify role
        if (user.role !== role) {
            throw new Error(`You are not authorized as a ${role}`);
        }

        return user; // Return the user object
    } catch (err) {
        console.error('Error in loginUser:', err);
        throw err;
    }
}

function generateVerificationToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function verifyEmail(token) {
    try {
        const db = await persistence.getDatabase();
        const user = await db.collection('users').findOne({ verificationToken: token });

        if (!user) {
            throw new Error('Invalid token');
        }

        // Mark the email as verified
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

module.exports = { registerUser, loginUser , verifyEmail};