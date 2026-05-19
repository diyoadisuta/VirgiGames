const mongoose = require('mongoose');
require('dotenv').config();

// Mongoose connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virgigames';

let connectionError = null;

mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => console.log('[MongoDB] Connected to database'))
    .catch(err => {
        console.error('[MongoDB] Connection error:', err);
        connectionError = err.message || err.toString();
    });

// Define User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    wins: { type: Number, default: 0 },
    games_played: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = { User, getConnectionError: () => connectionError };
