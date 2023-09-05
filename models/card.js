const mongoose = require("mongoose");

const setSchema = new mongoose.Schema({
    set_name: String,
    set_code: String,
    set_rarity: String,
    set_rarity_code: String,
    set_price: String,
    quantity: {
        type: Number,
        default: 0
    }
});

const cardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    attribute: String,
    level: Number,
    atk: Number,
    def: Number,
    quantity: {
        type: Number,
        default: 0
    },
    sets: {
        type: [setSchema],
        required: true
    },
    images: {
        type: [String],
        required: true
    }
});

const Card = mongoose.model('Card', cardSchema);

module.exports = { Card };
