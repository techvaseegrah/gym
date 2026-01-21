const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for department cleanup');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

// Clean up duplicate departments
const cleanupDepartments = async () => {
    try {
        const Department = require('./models/Department');
        const Fighter = require('./models/Fighter');
        
        console.log('Departments before cleanup:');
        const allDepartments = await Department.find({});
        allDepartments.forEach(dept => {
            console.log(`- "${dept.name}"`);
        });
        
        // Define standard department names and their mappings
        const standardNames = {
            'senior': ['senior', 'Senior Fighters'],
            'junior': ['junior', 'Junior Fighters'],
            'silambam': ['silambam'],
            'bharatanatyam': ['bharatanatyam']
        };
        
        // Group departments by standard name
        for (const [standardName, possibleNames] of Object.entries(standardNames)) {
            const matchingDepts = await Department.find({
                name: { $in: possibleNames }
            });
            
            if (matchingDepts.length > 1) {
                console.log(`\nFound duplicate departments for ${standardName}:`);
                matchingDepts.forEach(dept => {
                    console.log(`- "${dept.name}"`);
                });
                
                // Keep the standard name department, move fighters from others
                const standardDept = matchingDepts.find(dept => dept.name === standardName);
                const otherDepts = matchingDepts.filter(dept => dept.name !== standardName);
                
                if (standardDept && otherDepts.length > 0) {
                    // Move fighters from other departments to the standard department
                    for (const otherDept of otherDepts) {
                        console.log(`Moving fighters from "${otherDept.name}" to "${standardName}"`);
                        
                        // Update fighters to use the standard department name
                        const result = await Fighter.updateMany(
                            { department: otherDept.name },
                            { department: standardName }
                        );
                        
                        console.log(`Updated ${result.modifiedCount} fighters`);
                        
                        // Delete the duplicate department
                        await Department.deleteOne({ _id: otherDept._id });
                        console.log(`Deleted department "${otherDept.name}"`);
                    }
                } else if (!standardDept) {
                    // If no standard department exists, keep the first one and use its name as standard
                    const firstDept = matchingDepts[0];
                    console.log(`Using "${firstDept.name}" as standard for this group`);
                    
                    const otherDepts = matchingDepts.slice(1);
                    for (const otherDept of otherDepts) {
                        console.log(`Moving fighters from "${otherDept.name}" to "${firstDept.name}"`);
                        
                        // Update fighters
                        const result = await Fighter.updateMany(
                            { department: otherDept.name },
                            { department: firstDept.name }
                        );
                        
                        console.log(`Updated ${result.modifiedCount} fighters`);
                        
                        // Delete the duplicate department
                        await Department.deleteOne({ _id: otherDept._id });
                        console.log(`Deleted department "${otherDept.name}"`);
                    }
                }
            }
        }
        
        console.log('\nDepartments after cleanup:');
        const finalDepartments = await Department.find({});
        finalDepartments.forEach(dept => {
            console.log(`- "${dept.name}"`);
        });
        
    } catch (error) {
        console.error('Error cleaning up departments:', error.message);
    }
};

// Run the cleanup
const runCleanup = async () => {
    await connectDB();
    await cleanupDepartments();
    mongoose.connection.close();
    console.log('Database connection closed');
};

runCleanup();