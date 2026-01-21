// Test script to debug department creation
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for testing');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

const testDepartmentCreation = async () => {
    try {
        const Department = require('./models/Department');
        
        // Test creating a department manually
        console.log("Testing department creation logic...");
        
        const testName = "Test Department";
        const testFeeStructure = {
            totalFee: 3000,
            durationMonths: 2,
            description: "Test department for debugging"
        };
        
        // Check if department already exists (case-insensitive)
        const existingDept = await Department.findOne({ 
            name: { $regex: new RegExp(`^${testName}$`, 'i') } 
        });
        
        if (existingDept) {
            console.log(`Department ${testName} already exists`);
            return;
        }
        
        // Create new department
        const newDepartment = new Department({
            name: testName,
            feeStructure: testFeeStructure
        });
        
        await newDepartment.save();
        console.log("Department created successfully:", newDepartment);
        
        // Clean up - delete the test department
        await Department.deleteOne({ name: testName });
        console.log("Test department cleaned up");
        
    } catch (error) {
        console.error("Error in department creation test:", error.message);
    }
};

const runTest = async () => {
    await connectDB();
    await testDepartmentCreation();
    mongoose.connection.close();
    console.log("Test completed");
};

runTest();