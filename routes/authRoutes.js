const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userValidation } = require('../validations/schemas');
const { handleValidationErrors } = require('../middleware/validationMiddleware');
const { verifyToken, rateLimitSensitive } = require('../middleware/validationMiddleware');
const authController = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  userValidation.register,
  handleValidationErrors,
  rateLimitSensitive(5, 15 * 60 * 1000),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  userValidation.login,
  handleValidationErrors,
  rateLimitSensitive(5, 15 * 60 * 1000),
  authController.login
);

/**
 * @route   GET /api/auth/github
 * @desc    Authenticate with GitHub
 * @access  Public
 */
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub authentication callback
 * @access  Public
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  authController.githubCallback
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  verifyToken,
  authController.logout
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  authController.refreshAccessToken
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  verifyToken,
  authController.getCurrentUser
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  verifyToken,
  userValidation.updateProfile,
  handleValidationErrors,
  authController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post(
  '/change-password',
  verifyToken,
  userValidation.changePassword,
  handleValidationErrors,
  rateLimitSensitive(3, 15 * 60 * 1000),
  authController.changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  rateLimitSensitive(3, 60 * 60 * 1000),
  authController.requestPasswordReset
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  rateLimitSensitive(3, 60 * 60 * 1000),
  authController.resetPassword
);

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get(
  '/verify/:token',
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  rateLimitSensitive(3, 60 * 60 * 1000),
  authController.resendVerificationEmail
);

module.exports = router;