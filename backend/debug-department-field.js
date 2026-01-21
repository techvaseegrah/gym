const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const debugDepartmentField = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Get first fighter to inspect the department field type
        const fighter = await Fighter.findOne({});
        console.log('Sample fighter document:');
        console.log(JSON.stringify(fighter.toObject(), null, 2));
        
        // Check the department field specifically
        console.log('\nDepartment field details:');
        console.log('Raw value:', fighter.department);
        console.log('Type:', typeof fighter.department);
        console.log('Constructor:', fighter.department.constructor.name);
        
        if (typeof fighter.department === 'object') {
            console.log('Department is an object - checking if it\'s an ObjectId:');
            console.log('Has _bsontype?', '_bsontype' in fighter.department);
            console.log('String representation:', fighter.department.toString());
        }
        
        // Get a few fighters to see the pattern
        const fighters = await Fighter.find({}).limit(5);
        console.log('\nFirst 5 fighters department values:');
        fighters.forEach((f, idx) => {
            console.log(`${idx + 1}. ${f.name}: ${f.department} (type: ${typeof f.department})`);
        });
        
    } catch (error) {
        console.error('Error debugging department field:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
debugDepartmentField();