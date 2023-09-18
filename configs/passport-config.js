const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { User } = require('../models/user.js');

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    
    // Serialize the entire user object (including _id) into the session
    return done(null, user);
  } catch(err) {
    console.error('Error in User.findOne:', err); // Log the error
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  // Serialize the user's entire object (including _id) into the session
  done(null, user);
});

passport.deserializeUser(async (user, done) => {
  try {
    // Since the entire user object is stored in the session, no need to findById
    done(null, user);
  } catch (err) {
    done(err);
  }
})

module.exports = passport;