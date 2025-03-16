// Persitence layer
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Lana:12class34@cluster1.pvhcr.mongodb.net/";
let client = undefined

/**
 * A function for connecting to the database
 * 
 * @returns {void}
 */
async function connectDatabase() {
    if (!client) {
        client = new MongoClient(uri)
        await client.connect()
    }
}  

/**
 * Gets the database instance.
 * @returns {Object} The database instance.
 */
async function getDatabase() {
    await connectDatabase();
    return client.db('course_management');
}

module.exports = {
    connectDatabase,
    getDatabase,
};