const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { ObjectId } = require('mongodb');

dotenv.config();

/**
 * Registers a new user and sends a verification email.
 */
async function registerUser(name, email, contactNumber, degreeName, password) {
    const db = await mongoose.connection.db;
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) throw new Error('Email already registered');

    const user = {
        name,
        email,
        contactNumber,
        degreeName,
        password, // Store plain text for now (NOT recommended for production)
        emailVerified: false,
        verificationToken: Math.random().toString(36).substr(2, 20) // Simple token generation
    };

    await usersCollection.insertOne(user);
    
    // Simulated email (replace with actual email service if needed)
    console.log(`Verification email sent: http://localhost:8000/verify/${user.verificationToken}`);
    
    return { message: "Registration successful, check your email for verification link." };
}

/**
 * Verifies the user's email using the token.
 */
async function verifyEmail(token) {
    const db = await mongoose.connection.db;
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ verificationToken: token });
    if (!user) throw new Error('Invalid or expired token');

    await usersCollection.updateOne(
        { _id: user._id },
        { $set: { emailVerified: true }, $unset: { verificationToken: "" } }
    );

    return { message: "Email verified successfully. You can now log in." };
}

/**
 * Fetches a user profile.
 */
async function getUserProfile(userId) {
    const db = await mongoose.connection.db;
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
    if (!user) throw new Error('User not found');

    return user;
}

module.exports = { registerUser, verifyEmail, getUserProfile };
