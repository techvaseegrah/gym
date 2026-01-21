const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Fighter = require('./models/Fighter');
const Department = require('./models/Department');

// Load environment variables
dotenv.config();

const fixDepartmentReferences = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // First, let's see what departments exist in the Department collection
        const departments = await Department.find({});
        console.log('Available departments in Department collection:');
        departments.forEach(dept => {
            console.log(`- ${dept.name} (ID: ${dept._id})`);
        });
        
        // Get all fighters with ObjectId-like department values
        const fighters = await Fighter.find({}, 'name department rfid _id');
        
        console.log(`\nTotal fighters: ${fighters.length}`);
        
        // Group by department and count
        const deptMap = {};
        fighters.forEach(fighter => {
            const dept = fighter.department || 'null/undefined';
            if (!deptMap[dept.toString()]) {
                deptMap[dept.toString()] = [];
            }
            deptMap[dept.toString()].push(fighter);
        });
        
        console.log('\nCurrent department values (likely ObjectIds):');
        for (const [dept, fightersList] of Object.entries(deptMap)) {
            console.log(`${dept}: ${fightersList.length} fighters`);
        }
        
        // Map each ObjectId to a department name if possible
        for (const [deptId, fightersList] of Object.entries(deptMap)) {
            // Check if this is actually a department ObjectId
            let deptName = 'unknown';
            const deptDoc = departments.find(d => d._id.toString() === deptId);
            if (deptDoc) {
                deptName = deptDoc.name;
            } else {
                // If not found in departments, maybe it was meant to be a default
                deptName = 'seniors'; // Default to seniors
            }
            
            console.log(`\nUpdating ${fightersList.length} fighters with department ID '${deptId}' to department name '${deptName}'`);
            
            // Update all fighters with this department ID to use the department name
            const result = await Fighter.updateMany(
                { department: deptId },
                { $set: { department: deptName } }
            );
            
            console.log(`  Successfully updated ${result.modifiedCount} fighters`);
        }
        
        // Verify the fix
        const updatedFighters = await Fighter.find({}, 'name department rfid _id');
        const updatedDeptMap = {};
        updatedFighters.forEach(fighter => {
            const dept = fighter.department || 'null/undefined';
            if (!updatedDeptMap[dept]) {
                updatedDeptMap[dept] = [];
            }
            updatedDeptMap[dept].push(fighter);
        });
        
        console.log('\nUpdated department breakdown:');
        for (const [dept, fightersList] of Object.entries(updatedDeptMap)) {
            console.log(`${dept}: ${fightersList.length} fighters`);
        }
        
        console.log('\n✅ Department reference fix completed successfully!');
        
    } catch (error) {
        console.error('Error fixing department references:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the function
fixDepartmentReferences();