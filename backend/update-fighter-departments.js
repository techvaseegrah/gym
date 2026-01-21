const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for updating fighter departments');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

// Update fighter department references to match cleaned department names
const updateFighterDepartments = async () => {
    try {
        const Fighter = require('./models/Fighter');
        const Department = require('./models/Department');
        
        // Get all valid departments after cleanup
        const departments = await Department.find({});
        const validDepartmentNames = departments.map(dept => dept.name);
        
        console.log('Valid department names:', validDepartmentNames);
        
        // Find fighters with invalid department names
        const allFighters = await Fighter.find({});
        console.log(`Found ${allFighters.length} total fighters`);
        
        // Check for fighters with invalid department names
        const invalidDeptFighters = allFighters.filter(fighter => 
            fighter.department && !validDepartmentNames.includes(fighter.department)
        );
        
        console.log(`Found ${invalidDeptFighters.length} fighters with invalid department names`);
        
        if (invalidDeptFighters.length > 0) {
            // Map old department names to new ones
            const deptMapping = {
                'Senior Fighters': 'senior',
                'Junior Fighters': 'junior',
                'Silambam Fighters': 'silambam',  // if such exist
                'Bharatanatyam Fighters': 'bharatanatyam'  // if such exist
            };
            
            for (const fighter of invalidDeptFighters) {
                console.log(`Updating fighter ${fighter.name} from "${fighter.department}"`);
                
                let newDept = fighter.department;
                
                // Try to find a matching department using case-insensitive search
                const matchingDept = validDepartmentNames.find(validDept => 
                    validDept.toLowerCase() === fighter.department.toLowerCase()
                );
                
                if (matchingDept) {
                    newDept = matchingDept;
                    console.log(`  -> Changed to "${newDept}" (case correction)`);
                } else if (deptMapping[fighter.department]) {
                    newDept = deptMapping[fighter.department];
                    console.log(`  -> Changed to "${newDept}" (mapped from old name)`);
                } else {
                    // If no mapping exists, default to 'senior' for backward compatibility
                    newDept = 'senior';
                    console.log(`  -> Changed to "${newDept}" (default fallback)`);
                }
                
                // Update the fighter's department
                await Fighter.updateOne(
                    { _id: fighter._id },
                    { department: newDept }
                );
            }
            
            console.log('Fighter department updates completed');
        } else {
            console.log('No fighters found with invalid department names');
        }
        
        // Count fighters by department to verify
        for (const deptName of validDepartmentNames) {
            const count = await Fighter.countDocuments({ department: deptName });
            console.log(`Fighters in "${deptName}" department: ${count}`);
        }
        
    } catch (error) {
        console.error('Error updating fighter departments:', error.message);
    }
};

// Run the update
const runUpdate = async () => {
    await connectDB();
    await updateFighterDepartments();
    mongoose.connection.close();
    console.log('Database connection closed');
};

runUpdate();