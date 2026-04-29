const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    name: { 
        type: String,
        required: true,
        unique: true 
    },
    
    description: {
        type: String,
        required: true
    },
    numberOfRecipes: {
        type: Number,
        required: true
    },
   recipes: [{ // הגדרה כמערך של מזהים
        type: Schema.Types.ObjectId,
        ref: 'Recipe'
    }]
}, { timestamps: true });
module.exports = mongoose.model('Category', categorySchema);