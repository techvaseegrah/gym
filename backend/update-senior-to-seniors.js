const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const updateSeniorToSeniors = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Find all fighters with 'senior' department and update to 'seniors'
        const fightersWithSenior = await Fighter.find({
            department: 'senior'
        });
        
        console.log(`Found ${fightersWithSenior.length} fighters with 'senior' department`);
        
        if (fightersWithSenior.length > 0) {
            // Update all fighters from 'senior' to 'seniors'
            const result = await Fighter.updateMany(
                { department: 'senior' },
                { $set: { department: 'seniors' } }
            );
            
            console.log(`Successfully updated ${result.modifiedCount} fighters from 'senior' to 'seniors' department`);
            
            // Log the updated fighters
            fightersWithSenior.forEach(fighter => {
                console.log(`Updated fighter: ${fighter.name} (${fighter.rfid}) - changed department from 'senior' to 'seniors'`);
            });
        } else {
            console.log('No fighters found with "senior" department');
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
        
        console.log('\n✅ Senior to Seniors department update completed successfully!');
        console.log('All fighters with "senior" department have been updated to "seniors"');
        
    } catch (error) {
        console.error('Error updating senior to seniors department:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
updateSeniorToSeniors();