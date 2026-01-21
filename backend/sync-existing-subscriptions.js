require('dotenv').config();
const mongoose = require('mongoose');
const { syncAllFightersWithDepartments } = require('./routes/departmentSync');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for syncing subscriptions with departments');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

const syncExistingSubscriptions = async () => {
    try {
        await connectDB();
        console.log('Starting sync of all fighters with their departments...');
        
        const result = await syncAllFightersWithDepartments();
        
        console.log(`Sync completed successfully!`);
        console.log(`Updated: ${result.updatedCount} fighters`);
        console.log(`Errors: ${result.errorCount}`);
        
    } catch (error) {
        console.error('Error during sync:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the sync
syncExistingSubscriptions();