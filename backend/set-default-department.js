const mongoose = require('mongoose');
const Department = require('./models/Department');

async function setDefaultDepartment() {
  try {
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect('mongodb://localhost:27017/gym_management');
    
    console.log('Connected to database');
    
    // First, check if "senior" department exists
    let seniorDept = await Department.findOne({ name: 'senior' });
    
    if (!seniorDept) {
      // If "senior" doesn't exist, check for "seniors" 
      seniorDept = await Department.findOne({ name: 'seniors' });
      
      if (!seniorDept) {
        // Create "senior" department if neither exists
        seniorDept = new Department({
          name: 'senior',
          feeStructure: {
            totalFee: 4000,
            durationMonths: 3,
            description: 'Senior fighters department'
          },
          isActive: true,
          isDefault: true
        });
        
        await seniorDept.save();
        console.log('Created "senior" department and set as default');
      } else {
        // Update "seniors" to be the default
        seniorDept.isDefault = true;
        await seniorDept.save();
        console.log('Set "seniors" department as default');
      }
    } else {
      // Update "senior" to be the default
      seniorDept.isDefault = true;
      await seniorDept.save();
      console.log('Set "senior" department as default');
    }
    
    // Now make sure no other department is set as default
    await Department.updateMany(
      { name: { $ne: seniorDept.name } },
      { $unset: { isDefault: 1 } }
    );
    
    console.log('Successfully set default department');
    
    // Show current departments
    const allDepts = await Department.find({});
    console.log('Current departments:');
    allDepts.forEach(dept => {
      console.log(`- ${dept.name}: default=${dept.isDefault || false}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error setting default department:', error.message);
  }
}

setDefaultDepartment();