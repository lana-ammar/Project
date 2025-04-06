const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://Lana:12class34@cluster1.pvhcr.mongodb.net/";
let client;

async function connectDatabase() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        console.log('MongoDB connected successfully');
    }
}

async function getDatabase() {
    await connectDatabase();
    return client.db('course_management');
}

module.exports = { connectDatabase, getDatabase, ObjectId };
