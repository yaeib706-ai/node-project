const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // חשוב להשתמש ב-await
        await mongoose.connect(process.env.MONGO_URI);
    } catch (err) {
        console.error('Connection Failed! ', err.message);
    }
};

connectDB();