require('dotenv').config();
const mongoose = require('mongoose');
const Fighter = require('./models/Fighter');
const Subscription = require('./models/Subscription');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Find the fighters mentioned
    const fighterNames = ['abd', 'steve', 'bhar'];
    for (const name of fighterNames) {
      const fighter = await Fighter.findOne({ name: new RegExp(name, 'i') });
      if (fighter) {
        console.log(`\nChecking fighter: ${fighter.name} (${fighter.department})`);
        const subs = await Subscription.find({ fighterId: fighter._id });
        console.log(`Subscriptions:`, subs.map(s => ({
          id: s._id,
          planType: s.planType,
          totalFee: s.totalFee,
          paidAmount: s.paidAmount,
          remainingBalance: s.remainingBalance,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status,
          isActive: s.isActive
        })));
      } else {
        console.log(`Fighter '${name}' not found`);
      }
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();