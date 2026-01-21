const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const checkDepartments = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Get all fighters with department info
        const fighters = await Fighter.find({}, 'name department rfid');
        
        console.log(`Total fighters: ${fighters.length}`);
        
        // Group by department and count
        const deptMap = {};
        fighters.forEach(fighter => {
            const dept = fighter.department || 'null/undefined';
            if (!deptMap[dept]) {
                deptMap[dept] = [];
            }
            deptMap[dept].push(fighter);
        });
        
        console.log('\nDepartment breakdown:');
        for (const [dept, fightersList] of Object.entries(deptMap)) {
            console.log(`${dept}: ${fightersList.length} fighters`);
            // Show a sample of fighters in each department
            fightersList.slice(0, 3).forEach(fighter => {
                console.log(`  - ${fighter.name} (${fighter.rfid})`);
            });
            if (fightersList.length > 3) {
                console.log(`  ... and ${fightersList.length - 3} more`);
            }
        }
        
        console.log('\n✅ Department check completed!');
        
    } catch (error) {
        console.error('Error checking departments:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
checkDepartments();