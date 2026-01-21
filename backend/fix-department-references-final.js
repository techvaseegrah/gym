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
        
        // Update each fighter individually to map ObjectId to department name
        let updatedCount = 0;
        for (const fighter of fighters) {
            const deptId = fighter.department.toString();
            
            // Find matching department by ID
            const matchingDept = departments.find(d => d._id.toString() === deptId);
            
            if (matchingDept) {
                // Update this specific fighter with the department name
                await Fighter.findByIdAndUpdate(
                    fighter._id,
                    { $set: { department: matchingDept.name } }
                );
                
                console.log(`Updated fighter "${fighter.name}" from ID "${deptId}" to department "${matchingDept.name}"`);
                updatedCount++;
            } else {
                // If no matching department found, default to 'seniors'
                await Fighter.findByIdAndUpdate(
                    fighter._id,
                    { $set: { department: 'seniors' } }
                );
                
                console.log(`Updated fighter "${fighter.name}" from ID "${deptId}" to default department "seniors" (no matching department found)`);
                updatedCount++;
            }
        }
        
        console.log(`\n✅ Successfully updated ${updatedCount} fighters' department references!`);
        
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