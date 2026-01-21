const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const assignSeniorDepartment = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Find all fighters without a department or with null/empty department
        const fightersToUpdate = await Fighter.find({
            $or: [
                { department: { $exists: false } },
                { department: null },
                { department: "" },
                { department: { $eq: undefined } }
            ]
        });
        
        console.log(`Found ${fightersToUpdate.length} fighters without a department`);
        
        if (fightersToUpdate.length > 0) {
            // Update all fighters to have 'seniors' department
            const result = await Fighter.updateMany(
                {
                    $or: [
                        { department: { $exists: false } },
                        { department: null },
                        { department: "" },
                        { department: { $eq: undefined } }
                    ]
                },
                { 
                    $set: { department: 'seniors' } 
                }
            );
            
            console.log(`Successfully updated ${result.modifiedCount} fighters to 'seniors' department`);
            
            // Log the updated fighters
            fightersToUpdate.forEach(fighter => {
                console.log(`Updated fighter: ${fighter.name} (${fighter.rfid}) - set department to 'seniors'`);
            });
        } else {
            console.log('No fighters found without a department');
        }
        
        // Verify the update by counting fighters in each department
        const departmentCounts = await Fighter.aggregate([
            {
                $group: {
                    _id: "$department",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);
        
        console.log('\nDepartment distribution after update:');
        departmentCounts.forEach(dept => {
            console.log(`${dept._id || 'Unassigned'}: ${dept.count} fighters`);
        });
        
        console.log('\n✅ Senior department assignment completed successfully!');
        console.log('All existing fighters without a department have been assigned to "seniors"');
        console.log('New fighters can still be assigned to specific departments during creation/editing');
        
    } catch (error) {
        console.error('Error assigning senior department:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
assignSeniorDepartment();