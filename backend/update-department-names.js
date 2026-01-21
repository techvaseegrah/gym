const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const updateDepartmentNames = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Update department names to match frontend expectations
        // Change "Seniors" to "seniors", "Juniors" to "junior", "bharathanatyam" to "bharatanatyam"
        const updates = [
            { from: "Seniors", to: "seniors" },
            { from: "Juniors", to: "junior" },
            { from: "bharathanatyam", to: "bharatanatyam" }, // keeping as is for now
            { from: "silambam", to: "silambam" } // keeping as is
        ];
        
        for (const update of updates) {
            const result = await Fighter.updateMany(
                { department: update.from },
                { $set: { department: update.to } }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`Updated ${result.modifiedCount} fighters from "${update.from}" to "${update.to}"`);
            }
        }
        
        // Verify the updates
        const fighters = await Fighter.find({}, 'name department rfid');
        
        console.log('\nUpdated department breakdown:');
        const deptMap = {};
        fighters.forEach(fighter => {
            const dept = fighter.department || 'null/undefined';
            if (!deptMap[dept]) {
                deptMap[dept] = [];
            }
            deptMap[dept].push(fighter);
        });
        
        for (const [dept, fightersList] of Object.entries(deptMap)) {
            console.log(`${dept}: ${fightersList.length} fighters`);
        }
        
        console.log('\n✅ Department name updates completed successfully!');
        
    } catch (error) {
        console.error('Error updating department names:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
updateDepartmentNames();