const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gym_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Function to update installment counts based on payment history
async function updateInstallmentCounts() {
    try {
        console.log('Updating installment counts for all subscriptions...');
        
        // Get all subscriptions that might need updating
        const subscriptions = await Subscription.find({
            planType: { $in: ['fixed_commitment', 'custom'] } // Only plans that use installments
        });
        
        let updatedCount = 0;
        
        for (const subscription of subscriptions) {
            // Calculate installment count based on payment history
            const paymentHistoryCount = subscription.paymentHistory ? subscription.paymentHistory.length : 0;
            
            // Only update if the current installmentCount doesn't match payment history
            if (subscription.installmentCount !== paymentHistoryCount) {
                console.log(`Updating subscription ${subscription._id}: installmentCount ${subscription.installmentCount} -> ${paymentHistoryCount}`);
                
                subscription.installmentCount = paymentHistoryCount;
                await subscription.save();
                updatedCount++;
            }
        }
        
        console.log(`Updated ${updatedCount} subscriptions with correct installment counts.`);
        
        // Close the connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Error updating installment counts:', error);
        mongoose.connection.close();
    }
}

// Run the update function
updateInstallmentCounts();
