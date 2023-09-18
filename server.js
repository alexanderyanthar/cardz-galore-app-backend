// Importing libraries and modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('./configs/passport-config');
const crypto = require('crypto');
const session = require('express-session');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes.js');
const apiRoutes = require('./routes/apiRoutes.js');

// Load the environment variables from .env file
dotenv.config();

const app = express();

const secretKey = crypto.randomBytes(32).toString('hex');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Enable CORS to allow request from front end
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: secretKey,
  resave: true,
  saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);
app.use('/', apiRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});