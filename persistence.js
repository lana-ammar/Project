const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://Lana:12class34@cluster1.pvhcr.mongodb.net/";
let client;
let db;

async function connectDatabase() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('course_management');
    }
}

async function getDatabase() {
    await connectDatabase();
    return db;
}

// --- SESSION MANAGEMENT ---

async function saveSession(uuid, expiry, data) {
    await connectDatabase();
    await db.collection('sessions').insertOne({ SessionKey: uuid, Expiry: expiry, Data: data });
}

async function getSession(sessionKey) {
    await connectDatabase();
    const session = await db.collection('sessions').findOne({ SessionKey: sessionKey });
    if (!session || new Date(session.Expiry) < new Date()) return null;
    return session;
}

async function deleteSession(sessionKey) {
    await connectDatabase();
    await db.collection('sessions').deleteOne({ SessionKey: sessionKey });
}

module.exports = {
    connectDatabase,
    getDatabase,
    ObjectId,
    saveSession,
    getSession,
    deleteSession
};
