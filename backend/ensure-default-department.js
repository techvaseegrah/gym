const mongoose = require('mongoose');
const Department = require('./models/Department');

async function ensureDefaultDepartment() {
  try {
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect('mongodb://localhost:27017/gym_management');
    
    console.log('Connected to database');
    
    // Check if 'seniors' department exists
    let seniorsDept = await Department.findOne({ name: 'seniors' });
    
    if (!seniorsDept) {
      // Create 'seniors' department if it doesn't exist
      console.log("Creating 'seniors' department...");
      seniorsDept = new Department({
        name: 'seniors',
        feeStructure: {
          totalFee: 4000,
          durationMonths: 3,
          description: 'Default senior fighters department'
        },
        isActive: true,
        isDefault: true
      });
      
      await seniorsDept.save();
      console.log('Created "seniors" department and set as default');
    } else {
      // Update 'seniors' department to be the default if it's not already
      if (!seniorsDept.isDefault) {
        console.log("Setting 'seniors' department as default...");
        seniorsDept.isDefault = true;
        await seniorsDept.save();
        console.log('Set "seniors" department as default');
      } else {
        console.log('"seniors" department already exists and is set as default');
      }
    }
    
    // Make sure no other department is set as default (only one should be default)
    await Department.updateMany(
      { name: { $ne: 'seniors' } },
      { $unset: { isDefault: 1 } }
    );
    
    console.log('Successfully ensured default department configuration');
    
    // Show current departments
    const allDepts = await Department.find({});
    console.log('Current departments:');
    allDepts.forEach(dept => {
      console.log(`- ${dept.name}: default=${dept.isDefault || false}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error ensuring default department:', error.message);
  }
}

ensureDefaultDepartment();