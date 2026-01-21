const mongoose = require('mongoose');
require('dotenv').config();

// Fighter Schema (simplified)
const fighterSchema = new mongoose.Schema({
    name: String,
    email: String,
    fighterBatchNo: String,
    rfid: String,
    dateOfJoining: Date,
    height: String,
    weight: String,
    bloodGroup: String,
    phNo: String,
    occupation: String,
    address: String,
    goals: [String],
    achievements: String,
    motto: String,
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }
});

const Fighter = mongoose.model('Fighter', fighterSchema);

async function diagnoseFighterData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get all fighters
        const fighters = await Fighter.find({ role: 'fighter' });
        console.log(`Found ${fighters.length} fighters in database`);

        if (fighters.length > 0) {
            console.log('\n=== Fighter Data Analysis ===');
            
            fighters.forEach((fighter, index) => {
                console.log(`\nFighter ${index + 1}: ${fighter.name}`);
                console.log('------------------------');
                console.log(`fighterBatchNo: ${fighter.fighterBatchNo || 'NULL/UNDEFINED'}`);
                console.log(`rfid: ${fighter.rfid || 'NULL/UNDEFINED'}`);
                console.log(`dateOfJoining: ${fighter.dateOfJoining || 'NULL/UNDEFINED'}`);
                console.log(`height: ${fighter.height || 'NULL/UNDEFINED'}`);
                console.log(`weight: ${fighter.weight || 'NULL/UNDEFINED'}`);
                console.log(`bloodGroup: ${fighter.bloodGroup || 'NULL/UNDEFINED'}`);
                console.log(`phNo: ${fighter.phNo || 'NULL/UNDEFINED'}`);
                console.log(`occupation: ${fighter.occupation || 'NULL/UNDEFINED'}`);
                console.log(`address: ${fighter.address || 'NULL/UNDEFINED'}`);
                console.log(`goals: ${Array.isArray(fighter.goals) ? fighter.goals.join(', ') || 'EMPTY ARRAY' : 'NOT AN ARRAY'}`);
                console.log(`achievements: ${fighter.achievements || 'NULL/UNDEFINED'}`);
                console.log(`motto: ${fighter.motto || 'NULL/UNDEFINED'}`);
                console.log(`profile_completed: ${fighter.profile_completed}`);
                console.log(`role: ${fighter.role}`);
                
                // Check for problematic display strings in the database
                const fieldsToCheck = ['fighterBatchNo', 'rfid', 'height', 'weight', 'bloodGroup', 'phNo', 'occupation', 'address', 'achievements', 'motto'];
                const problematicValues = [];
                
                fieldsToCheck.forEach(field => {
                    const value = fighter[field];
                    if (value && (value.includes('N/A') || value.includes('--') || value.includes('No '))) {
                        problematicValues.push(`${field}: ${value}`);
                    }
                });
                
                if (problematicValues.length > 0) {
                    console.log('⚠️  PROBLEMATIC VALUES FOUND (display strings in DB):');
                    problematicValues.forEach(problem => console.log(`  ${problem}`));
                } else {
                    console.log('✅ No display strings found in DB for this fighter');
                }
            });
        } else {
            console.log('No fighters found in database');
        }

    } catch (error) {
        console.error('Error connecting to database:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

diagnoseFighterData();