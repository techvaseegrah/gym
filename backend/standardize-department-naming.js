const mongoose = require('mongoose');
const Department = require('./models/Department');
const Fighter = require('./models/Fighter');

async function standardizeDepartmentNaming() {
  try {
    // Connect to MongoDB using the same URI as the main server
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/gym_management';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to database');
    
    // First, ensure the "seniors" department exists in the department collection
    let seniorsDept = await Department.findOne({ name: 'seniors' });
    
    if (!seniorsDept) {
      console.log("Creating 'seniors' department in department collection...");
      seniorsDept = new Department({
        name: 'seniors',
        feeStructure: {
          totalFee: 4000,
          durationMonths: 3,
          description: 'Senior fighters department'
        },
        isActive: true,
        isDefault: true
      });
      
      await seniorsDept.save();
      console.log('Created "seniors" department in department collection');
    } else {
      // Ensure it's marked as default
      if (!seniorsDept.isDefault) {
        seniorsDept.isDefault = true;
        await seniorsDept.save();
        console.log('Marked "seniors" department as default');
      }
    }
    
    // Find all fighters with various forms of "senior" department
    const fightersWithSenior = await Fighter.find({
      $or: [
        { department: 'Senior' },
        { department: 'senior' },
        { department: 'Seniors' },
        { department: 'seniors' },
        { department: null },
        { department: { $exists: false } },
        { department: "" }
      ]
    });
    
    console.log(`Found ${fightersWithSenior.length} fighters with various senior department forms or no department`);
    
    // Update all variations of "senior" to "seniors" and ensure fighters without department get "seniors"
    const result = await Fighter.updateMany(
      {
        $or: [
          { department: 'Senior' },
          { department: 'senior' },
          { department: 'Seniors' },
          { department: 'senior' },
          { department: null },
          { department: { $exists: false } },
          { department: "" }
        ]
      },
      {
        $set: { department: 'seniors' }
      }
    );
    
    console.log(`Updated ${result.nModified} fighters to use 'seniors' department`);
    
    // Also update any other departments that might be singular to plural if they exist
    const result2 = await Fighter.updateMany(
      { department: 'Junior' },
      { $set: { department: 'junior' } }
    );
    
    if (result2.nModified > 0) {
      console.log(`Updated ${result2.nModified} fighters from 'Junior' to 'junior' department`);
    }
    
    // Show summary of department assignments after update
    const departmentSummary = await Fighter.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\nDepartment assignment summary after update:');
    departmentSummary.forEach(item => {
      console.log(`- ${item._id || 'NO DEPARTMENT'}: ${item.count} fighters`);
    });
    
    // Show sample of fighters to verify the changes
    const sampleFighters = await Fighter.find({})
      .select('name department')
      .limit(10);
    
    console.log('\nSample of fighters after update:');
    sampleFighters.forEach(fighter => {
      console.log(`- ${fighter.name}: ${fighter.department || 'NO DEPARTMENT'}`);
    });
    
    // Show all departments in the department collection
    const allDepartments = await Department.find({});
    console.log('\nDepartments in department collection:');
    allDepartments.forEach(dept => {
      console.log(`- ${dept.name}: default=${dept.isDefault || false}`);
    });
    
    mongoose.connection.close();
    console.log('\nStandardization process completed!');
    console.log('The "seniors" department now exists in the department system and all fighters are properly assigned.');
    
  } catch (error) {
    console.error('Error in department standardization:', error.message);
  }
}

standardizeDepartmentNaming();