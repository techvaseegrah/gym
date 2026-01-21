const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for updating existing fighter departments');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

// Update existing fighters without department to 'seniors'
const updateExistingFightersDepartment = async () => {
    try {
        const Fighter = require('./models/Fighter');
        
        // Find fighters without a department set (undefined, null, or empty string)
        const fightersWithoutDept = await Fighter.find({
            $or: [
                { department: { $exists: false } },
                { department: null },
                { department: "" }
            ]
        });
        
        console.log(`Found ${fightersWithoutDept.length} fighters without a department`);
        
        if (fightersWithoutDept.length > 0) {
            // Update all fighters without department to 'seniors'
            const result = await Fighter.updateMany(
                {
                    $or: [
                        { department: { $exists: false } },
                        { department: null },
                        { department: "" }
                    ]
                },
                { $set: { department: 'seniors' } }
            );
            
            console.log(`Updated ${result.nModified} fighters to 'seniors' department`);
            console.log('All existing fighters without department have been assigned to "seniors"');
        } else {
            console.log('All fighters already have a department assigned');
        }
        
        // Show updated counts by department
        const departments = ['seniors', 'senior', 'junior', 'silambam', 'bharatanatyam'];
        for (const deptName of departments) {
            const count = await Fighter.countDocuments({ department: deptName });
            if (count > 0) {
                console.log(`Fighters in "${deptName}" department: ${count}`);
            }
        }
        
    } catch (error) {
        console.error('Error updating existing fighter departments:', error.message);
    }
};

// Run the update
const runUpdate = async () => {
    await connectDB();
    await updateExistingFightersDepartment();
    mongoose.connection.close();
    console.log('Database connection closed');
};

runUpdate();