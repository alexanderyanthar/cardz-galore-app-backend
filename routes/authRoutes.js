const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { User } = require('../models/user');

const router = express.Router();

// Route to handle user registration
router.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Backend validation for username and password
        const usernameRegex = /^[a-zA-Z0-9_]{4,16}$/; // Example regex for username
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+"';\[\]])[A-Za-z\d!@#$%^&*()_+"';\[\]]{8,}$/;  // Example regex for password

        if (!usernameRegex.test(username)) {
            return res.status(400).json('Username must be 4-16 characters long and can only contain letters, numbers, and underscores.');
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json('Password must be at least 8 characters long, contain at least one lowercase letter, one uppercase letter, one digit, and one special character.');
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json('Username already taken');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            username,
            passwordHash,
            role: 'user',
        });

        await newUser.save();

        req.login(newUser, (err) => {
            if (err) {
                console.error('Error logging in user:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to check if the user is authenticated
router.get('/api/check-authentication', (req, res) => {
    if (req.isAuthenticated()) {
        res.status(200).end();
    } else {
        res.sendStatus(204);
    }
});

// Route to handle user login
router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureMessage: true,
}), (req, res) => {
    res.status(200).json({ message: 'Login successful!', user: req.user });
});

// Route to handle user logout
router.post('/api/logout', (req, res) => {
    req.logout(() => {
        res.status(200).json({ message: 'Logout Successful!' });
    });
});

module.exports = router;
