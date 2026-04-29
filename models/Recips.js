const mongoose = require('mongoose');
const { Schema } = mongoose;
const miniSchemaUser = new Schema({
    name: String
  
});
const recipeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
    },
  timeToPrepare: {
    type: Number,
    required: true
  },
  levelOfDifficulty: {
    type: Number,
    required: true, min: 1, max: 5
  },
  dateOfAddition: {
    type: Date,default: Date.now,
    required: true
  },
  levels: [{
    description: { type: String, required: true },
    ingredients: { type: [String], required: true } // מערך של מחרוזות למצרכים
}],

    image: {
        type: String,
        required: true
    },
    isPublic: { // שיניתי מ-isPrivate ל-isPublic כדי שיתאים ל-Controller
      type: Boolean,
      required: true
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    } 
  });
  
  module.exports = mongoose.model('Recipe', recipeSchema);