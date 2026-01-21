const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Department = require('./models/Department');

// Load environment variables
dotenv.config();

const updateDepartmentCollection = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Update department names in the Department collection to match fighter records
        const departmentUpdates = [
            { oldName: "Seniors", newName: "seniors" },
            { oldName: "Juniors", newName: "junior" },
            { oldName: "bharathanatyam", newName: "bharatanatyam" }, // already correct
            { oldName: "silambam", newName: "silambam" } // already correct
        ];
        
        for (const update of departmentUpdates) {
            if (update.oldName !== update.newName) {
                const result = await Department.updateOne(
                    { name: update.oldName },
                    { $set: { name: update.newName } }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`Updated department "${update.oldName}" to "${update.newName}"`);
                } else {
                    console.log(`Department "${update.oldName}" not found or no change needed`);
                }
            } else {
                console.log(`Department "${update.newName}" already correct, no update needed`);
            }
        }
        
        // Show updated department collection
        console.log('\n=== Updated Departments in Department Collection ===');
        const departments = await Department.find({});
        departments.forEach(dept => {
            console.log(`- Name: "${dept.name}", ID: ${dept._id}`);
        });
        
        console.log('\n✅ Department collection updated successfully!');
        
    } catch (error) {
        console.error('Error updating department collection:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
updateDepartmentCollection();