const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    address: {
        type: String,
        required: true 
    }
    ,
    role: {
        type: String,
        enum: ['user', 'admin','manager'],
        default: 'user'
    }
    
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// השורה הזו היא הקריטית ביותר:
module.exports = User;