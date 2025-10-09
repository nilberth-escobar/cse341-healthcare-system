const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key'
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id).select('-password');
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ githubId: profile.id });
    
    if (user) {
      // Update user info
      user.lastLogin = new Date();
      user.githubAccessToken = accessToken;
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    const newUser = new User({
      githubId: profile.id,
      username: profile.username,
      email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
      name: profile.displayName || profile.username,
      avatar: profile.photos?.[0]?.value,
      role: 'patient', // Default role
      provider: 'github',
      githubAccessToken: accessToken,
      isVerified: true, // GitHub users are pre-verified
      lastLogin: new Date()
    });
    
    await newUser.save();
    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password -githubAccessToken');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;