const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for department initialization');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

// Initialize default departments
const initializeDepartments = async () => {
    try {
        const Department = require('./models/Department');
        
        // Define default departments with their fee structures
        const defaultDepartments = [
            {
                name: 'senior',
                feeStructure: {
                    totalFee: 4000,
                    durationMonths: 3,
                    description: 'Senior fighters - Standard 3-month plan'
                }
            },
            {
                name: 'junior',
                feeStructure: {
                    totalFee: 4000,
                    durationMonths: 3,
                    description: 'Junior fighters - Standard 3-month plan'
                }
            },
            {
                name: 'silambam',
                feeStructure: {
                    totalFee: 4000,
                    durationMonths: 3,
                    description: 'Silambam department - Standard 3-month plan'
                }
            },
            {
                name: 'bharatanatyam',
                feeStructure: {
                    totalFee: 4000, // Same as others for now, can be customized later
                    durationMonths: 3,
                    description: 'Bharatanatyam department - Standard 3-month plan'
                }
            }
        ];
        
        // Check if departments already exist
        for (const dept of defaultDepartments) {
            const existingDept = await Department.findOne({ name: dept.name });
            
            if (!existingDept) {
                const newDept = new Department(dept);
                await newDept.save();
                console.log(`Created department: ${dept.name}`);
            } else {
                console.log(`Department ${dept.name} already exists`);
            }
        }
        
        console.log('Department initialization completed');
        
    } catch (error) {
        console.error('Error initializing departments:', error.message);
    }
};

// Run the initialization
const runInitialization = async () => {
    await connectDB();
    await initializeDepartments();
    mongoose.connection.close();
    console.log('Database connection closed');
};

runInitialization();