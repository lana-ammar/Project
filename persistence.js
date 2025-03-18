const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Lana:12class34@cluster1.pvhcr.mongodb.net/";
let client;

async function connectDatabase() {
    if (!client) {
        try {
            client = new MongoClient(uri);
            await client.connect();
            console.log('MongoDB connected successfully');
        } catch (err) {
            console.error('MongoDB connection failed:', err);
            throw err;
        }
    }
}

async function getDatabase() {
    try {
        await connectDatabase();
        return client.db('course_management');
    } catch (err) {
        console.error('Failed to get database:', err);
        throw err;
    }
}

module.exports = { connectDatabase, getDatabase, ObjectId };