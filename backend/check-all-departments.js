const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Department = require('./models/Department');
const Fighter = require('./models/Fighter');

// Load environment variables
dotenv.config();

const checkAllDepartments = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Check departments in Department collection
        console.log('\n=== Departments in Department Collection ===');
        const departments = await Department.find({});
        departments.forEach(dept => {
            console.log(`- Name: "${dept.name}", ID: ${dept._id}`);
        });
        
        // Check fighters by department
        console.log('\n=== Fighters by Department ===');
        const fighters = await Fighter.find({}, 'name department');
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
            fightersList.forEach(fighter => {
                console.log(`  - ${fighter.name}`);
            });
        }
        
        // Count active subscriptions by department
        console.log('\n=== Active Subscriptions by Department ===');
        const fightersWithDepts = await Fighter.find({ department: { $exists: true, $ne: null, $ne: '' } }).populate('currentSubscription');
        const subCountByDept = {};
        
        for (const fighter of fightersWithDepts) {
            const dept = fighter.department;
            if (!subCountByDept[dept]) {
                subCountByDept[dept] = { total: 0, active: 0 };
            }
            subCountByDept[dept].total++;
            
            // Check if they have an active subscription
            if (fighter.currentSubscription) {
                // Assuming active subscription has certain criteria
                subCountByDept[dept].active++;
            }
        }
        
        for (const [dept, counts] of Object.entries(subCountByDept)) {
            console.log(`${dept}: ${counts.active} active / ${counts.total} total`);
        }
        
    } catch (error) {
        console.error('Error checking departments:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
};

// Run the function
checkAllDepartments();