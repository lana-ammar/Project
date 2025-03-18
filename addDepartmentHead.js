const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = "mongodb+srv://Lana:12class34@cluster1.pvhcr.mongodb.net/";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function addDepartmentHead() {
    try {
        await client.connect();
        const db = client.db('course_management');

        // Department head details
        const name = "Department Head Name";
        const email = "head@udst.edu.qa";
        const contactNumber = "12345678";
        const degreeName = "Administration";
        const password = "12class34"; // Replace with the actual password
        const role = "department_head";

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the department head into the users collection
        const result = await db.collection('users').insertOne({
            name,
            email,
            contactNumber,
            degreeName,
            password: hashedPassword,
            role,
            emailVerified: true,
            verificationToken: null
        });

        console.log('Department head added successfully:', result.insertedId);
    } catch (err) {
        console.error('Error adding department head:', err);
    } finally {
        await client.close();
    }
}

addDepartmentHead();