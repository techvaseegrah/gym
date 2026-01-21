const Fighter = require('../models/Fighter');
const Subscription = require('../models/Subscription');
const Department = require('../models/Department');

/**
 * Synchronize a fighter's subscription with their department's fee structure
 * This function updates the subscription based on the fighter's current department
 */
const syncFighterSubscriptionWithDepartment = async (fighterId) => {
    try {
        // Get the fighter with their department
        const fighter = await Fighter.findById(fighterId).populate('department', 'name feeStructure');
        
        if (!fighter) {
            throw new Error('Fighter not found');
        }

        // Get the fighter's current active subscription
        const now = new Date();
        const currentSubscription = await Subscription.findOne({
            fighterId: fighter._id,
            isActive: true,
            endDate: { $gte: now }
        }).sort({ createdAt: -1 });

        if (!currentSubscription) {
            console.log(`No active subscription found for fighter ${fighter.name}`);
            return null;
        }

        // Get department fee structure
        let deptFeeStructure = null;
        if (fighter.department && fighter.department.feeStructure) {
            deptFeeStructure = fighter.department.feeStructure;
        } else {
            // Fallback to default fee structures based on department name
            const deptName = fighter.department ? fighter.department.name : fighter.department;
            if (['seniors', 'senior', 'junior', 'silambam'].includes(deptName)) {
                deptFeeStructure = { totalFee: 4000, durationMonths: 3 };
            } else if (deptName === 'bharatanatyam') {
                deptFeeStructure = { totalFee: 4000, durationMonths: 3 };
            }
        }

        if (deptFeeStructure) {
            // Update subscription details based on department
            currentSubscription.totalFee = deptFeeStructure.totalFee || 4000;
            currentSubscription.remainingBalance = Math.max(0, currentSubscription.totalFee - currentSubscription.paidAmount);

            // Update end date based on department duration
            const newEndDate = new Date(currentSubscription.startDate);
            newEndDate.setMonth(newEndDate.getMonth() + (deptFeeStructure.durationMonths || 3));
            currentSubscription.endDate = newEndDate;

            await currentSubscription.save();
            console.log(`Successfully updated subscription for fighter ${fighter.name} based on department ${fighter.department?.name || fighter.department}`);
            
            return currentSubscription;
        } else {
            console.log(`No fee structure found for department ${fighter.department?.name || fighter.department}`);
            return currentSubscription;
        }
    } catch (error) {
        console.error('Error syncing fighter subscription with department:', error.message);
        throw error;
    }
};

/**
 * Bulk synchronize all fighters' subscriptions with their departments
 */
const syncAllFightersWithDepartments = async () => {
    try {
        const fighters = await Fighter.find({}).select('_id name department');
        let updatedCount = 0;
        let errorCount = 0;

        for (const fighter of fighters) {
            try {
                await syncFighterSubscriptionWithDepartment(fighter._id);
                updatedCount++;
            } catch (error) {
                console.error(`Error syncing fighter ${fighter.name}:`, error.message);
                errorCount++;
            }
        }

        console.log(`Sync completed: ${updatedCount} fighters updated, ${errorCount} errors`);
        return { updatedCount, errorCount };
    } catch (error) {
        console.error('Error in bulk sync:', error.message);
        throw error;
    }
};

module.exports = {
    syncFighterSubscriptionWithDepartment,
    syncAllFightersWithDepartments
};