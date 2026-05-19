const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('./db');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
        if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        const hash = bcrypt.hashSync(password, 10);
        const newUser = await User.create({ username, password_hash: hash });

        req.session.userId = newUser._id;
        req.session.username = username;
        res.json({ ok: true, username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const user = await User.findOne({ username });
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.userId = user._id;
        req.session.username = user.username;
        res.json({ ok: true, username: user.username, wins: user.wins });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
        const user = await User.findById(req.session.userId).select('username wins games_played');
        if (!user) return res.status(401).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/login.html');
    next();
}

module.exports = { router, requireAuth };
