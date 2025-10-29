const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Admin = require('./models/Admin'); 

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully.');

    const email = 'techvaseegrah@gmail.com';
    const password = '123456';

    // Check if the admin user already exists to avoid duplicates
    let admin = await Admin.findOne({ email });
    if (admin) {
      console.log('Admin user already exists.');
      return;
    }

    // Hash the password for security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save the new admin user
    admin = new Admin({
      email,
      password: hashedPassword,
      role: 'admin',
    });
    await admin.save();

    console.log('Admin user created successfully!');
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin();