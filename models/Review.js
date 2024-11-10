const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    review: { type: String, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
});

module.exports = mongoose.model('Review', reviewSchema);
