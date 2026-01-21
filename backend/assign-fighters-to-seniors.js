const mongoose = require('mongoose');
const Fighter = require('./models/Fighter');

async function assignFightersToSeniors() {
  try {
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect('mongodb://localhost:27017/gym_management');
    
    console.log('Connected to database');
    
    // Find all fighters that don't have a department assigned (null, undefined, or empty string)
    const fightersWithoutDept = await Fighter.find({
      $or: [
        { department: null },
        { department: { $exists: false } },
        { department: "" }
      ]
    });
    
    console.log(`Found ${fightersWithoutDept.length} fighters without a department`);
    
    if (fightersWithoutDept.length > 0) {
      // Update all fighters without a department to be assigned to 'seniors'
      const result = await Fighter.updateMany(
        {
          $or: [
            { department: null },
            { department: { $exists: false } },
            { department: "" }
          ]
        },
        {
          $set: { department: 'seniors' }
        }
      );
      
      console.log(`Updated ${result.nModified} fighters to be assigned to 'seniors' department`);
      console.log(`Matched ${result.n} fighters for update`);
    } else {
      console.log('No fighters found without a department');
    }
    
    // Also update fighters that might have 'senior' instead of 'seniors'
    const result2 = await Fighter.updateMany(
      { department: 'senior' },
      { $set: { department: 'seniors' } }
    );
    
    if (result2.nModified > 0) {
      console.log(`Updated ${result2.nModified} fighters from 'senior' to 'seniors' department`);
    }
    
    // Show a sample of fighters to verify the changes
    const sampleFighters = await Fighter.find({}).select('name department').limit(10);
    console.log('\nSample of fighters after update:');
    sampleFighters.forEach(fighter => {
      console.log(`- ${fighter.name}: ${fighter.department || 'NO DEPARTMENT'}`);
    });
    
    mongoose.connection.close();
    console.log('Assignment process completed!');
  } catch (error) {
    console.error('Error assigning fighters to seniors department:', error.message);
  }
}

assignFightersToSeniors();