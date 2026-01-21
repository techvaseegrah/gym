const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const fixSeniorToSeniorsFinal = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Update any remaining "senior" departments to "seniors"
        const result = await Fighter.updateMany(
            { department: "senior" },
            { $set: { department: "seniors" } }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`Updated ${result.modifiedCount} fighters from "senior" to "seniors"`);
        } else {
            console.log('No fighters found with "senior" department to update');
        }
        
        // Verify the fix
        const fighters = await Fighter.find({}, 'name department');
        const deptMap = {};
        fighters.forEach(fighter => {
            const dept = fighter.department || 'null/undefined';
            if (!deptMap[dept]) {
                deptMap[dept] = [];
            }
            deptMap[dept].push(fighter);
        });
        
        console.log('\nFinal department breakdown:');
        for (const [dept, fightersList] of Object.entries(deptMap)) {
            console.log(`${dept}: ${fightersList.length} fighters`);
        }
        
        console.log('\n✅ Final department alignment completed successfully!');
        
    } catch (error) {
        console.error('Error fixing senior to seniors:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
fixSeniorToSeniorsFinal();