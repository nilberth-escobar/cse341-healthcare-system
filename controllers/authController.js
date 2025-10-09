const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const user = userDoc.toObject({ virtuals: true });
  delete user.password;
  delete user.refreshTokens;
  delete user.githubAccessToken;
  delete user.verificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.twoFactorSecret;
  return user;
};

const register = async (req, res) => {
  try {
    const { username, email, password, name, role = 'patient' } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username or email already in use'
      });
    }

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');

    const user = new User({
      username,
      email,
      password,
      name,
      role,
      provider: 'local',
      verificationToken: hashedVerificationToken,
      isVerified: false
    });

    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken,
          verificationToken: rawVerificationToken
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password +loginAttempts +lockUntil +refreshTokens'
    );

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is deactivated'
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        error: 'Locked',
        message: 'Account locked due to multiple failed login attempts'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();

    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate user'
    });
  }
};

const githubCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'GitHub authentication failed'
      });
    }

    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    await user.save();

    res.json({
      success: true,
      message: 'GitHub authentication successful',
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'GitHub authentication failed'
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken && req.user) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { refreshTokens: { token: refreshToken } } }
      );
    }

    if (res.clearCookie) {
      res.clearCookie('token');
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout user'
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token type'
      });
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);

    if (!tokenExists) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token not recognized'
      });
    }

    const accessToken = user.generateAuthToken();
    await user.save();

    res.json({
      success: true,
      token: accessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh access token'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user._id).populate('profile');

    res.json({
      success: true,
      data: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch current user'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['name', 'email', 'avatar'];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.email) {
      const existing = await User.findOne({
        _id: { $ne: req.user._id },
        email: updates.email.toLowerCase()
      });

      if (existing) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already in use'
        });
      }

      updates.email = updates.email.toLowerCase();
      updates.isVerified = false;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).populate('profile');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email address exists, a reset token has been sent'
      });
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(rawResetToken)
      .digest('hex');

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Password reset token generated',
      data: {
        resetToken: rawResetToken
      }
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initiate password reset'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token and new password are required'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ verificationToken: hashedToken });

    if (!user) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid verification token'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify email'
    });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is already verified'
      });
    }

    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(rawVerificationToken)
      .digest('hex');

    user.verificationToken = hashedVerificationToken;

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Verification token regenerated',
      data: {
        verificationToken: rawVerificationToken
      }
    });
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resend verification email'
    });
  }
};

module.exports = {
  register,
  login,
  githubCallback,
  logout,
  refreshAccessToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerificationEmail
};
