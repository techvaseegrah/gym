const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Fighter = require('../models/Fighter');
const Subscription = require('../models/Subscription');
const Department = require('../models/Department');

// @route   GET api/departments
// @desc    Get all departments
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    try {
        // Get all departments with their fee structures
        const departments = await Department.find({});
        
        // For each department, get fighter count and other stats
        const departmentStats = await Promise.all(departments.map(async (dept) => {
            const fighterCount = await Fighter.countDocuments({ department: dept.name });
            const activeSubscriptions = await Subscription.countDocuments({
                fighterId: { $in: await Fighter.find({ department: dept.name }).distinct('_id') },
                isActive: true,
                endDate: { $gte: new Date() }
            });
            
            return {
                name: dept.name,
                fighterCount,
                activeSubscriptions,
                feeStructure: dept.feeStructure,
                isActive: dept.isActive,
                isDefault: dept.isDefault
            };
        }));
        
        res.json(departmentStats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/departments
// @desc    Add a new department
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { name, feeStructure } = req.body;
    
    // Check if department already exists
    if (!name) {
        return res.status(400).json({ msg: 'Department name is required' });
    }
    
    // Check if department already exists
    const existingDept = await Department.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existingDept) {
        return res.status(400).json({ msg: 'Department already exists' });
    }
    
    try {
        // Create new department
        const newDepartment = new Department({
            name,
            feeStructure: {
                totalFee: feeStructure?.totalFee || 4000,
                durationMonths: feeStructure?.durationMonths || 3,
                description: feeStructure?.description || ''
            }
        });
        
        await newDepartment.save();
        
        res.json({ msg: `Department ${name} created successfully`, department: newDepartment });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/departments/:deptName
// @desc    Update a department
// @access  Private (Admin only)
router.put('/:deptName', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { deptName } = req.params;
    const { feeStructure } = req.body;
    
    // Check if the department exists in the database (case-insensitive)
    const existingDept = await Department.findOne({ 
        name: { $regex: new RegExp(`^${deptName}$`, 'i') } 
    });
    if (!existingDept) {
        return res.status(400).json({ msg: 'Department not found' });
    }
    
    // Use the actual department name from the database
    const normalizedDeptName = existingDept.name;
    
    try {
        // Find the department using the actual name from the database
        const department = await Department.findOne({ name: normalizedDeptName });
        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }
        
        // Update fee structure if provided
        if (feeStructure) {
            department.feeStructure.totalFee = feeStructure.totalFee || department.feeStructure.totalFee;
            department.feeStructure.durationMonths = feeStructure.durationMonths || department.feeStructure.durationMonths;
            department.feeStructure.description = feeStructure.description || department.feeStructure.description;
        }
        
        await department.save();
        
        res.json({ msg: `Department ${normalizedDeptName} updated successfully`, department });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/departments/:deptName/fighters
// @desc    Get all fighters in a specific department
// @access  Private (Admin only)
router.get('/:deptName/fighters', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { deptName } = req.params;
    
    // Check if the department exists in the database (case-insensitive)
    const existingDept = await Department.findOne({ 
        name: { $regex: new RegExp(`^${deptName}$`, 'i') } 
    });
    if (!existingDept) {
        return res.status(400).json({ msg: 'Department not found' });
    }
    
    // Use the actual department name from the database
    const normalizedDeptName = existingDept.name;
    
    try {
        const fighters = await Fighter.find({ department: normalizedDeptName }).select('-password');
        
        res.json(fighters);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/departments/:deptName/set-default
// @desc    Set a department as default
// @access  Private (Admin only)
router.put('/:deptName/set-default', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { deptName } = req.params;
    
    try {
        // First, unset all departments as default
        await Department.updateMany({}, { $unset: { isDefault: 1 } });
        
        // Then set the specified department as default
        const dept = await Department.findOneAndUpdate(
            { name: { $regex: new RegExp(`^${deptName}$`, 'i') } },
            { isDefault: true },
            { new: true }
        );
        
        if (!dept) {
            return res.status(404).json({ msg: 'Department not found' });
        }
        
        res.json({ msg: `Department ${dept.name} set as default`, department: dept });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/departments/:deptName
// @desc    Delete a department
// @access  Private (Admin only)
router.delete('/:deptName', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { deptName } = req.params;
    
    // Check if the department exists in the database (case-insensitive)
    const existingDept = await Department.findOne({ 
        name: { $regex: new RegExp(`^${deptName}$`, 'i') } 
    });
    if (!existingDept) {
        return res.status(400).json({ msg: 'Department not found' });
    }
    
    // Use the actual department name from the database
    const normalizedDeptName = existingDept.name;
    
    try {
        // Check if there are fighters in this department (using normalized name)
        const fighterCount = await Fighter.countDocuments({ department: normalizedDeptName });

        if (fighterCount > 0) {
            return res.status(400).json({ msg: `Cannot delete department ${normalizedDeptName} because it has ${fighterCount} fighter(s) assigned to it. Move fighters to another department first.` });
        }
        
        // Delete the department (using normalized name)
        const result = await Department.deleteOne({ name: normalizedDeptName });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ msg: 'Department not found' });
        }
        
        res.json({ msg: `Department ${normalizedDeptName} deleted successfully` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;