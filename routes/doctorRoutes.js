const express = require('express');
const router = express.Router();
const { doctorValidation, searchValidation } = require('../validations/schemas');
const { 
  handleValidationErrors, 
  validatePagination,
  validateObjectId 
} = require('../middleware/validationMiddleware');
const { 
  verifyToken, 
  authorize, 
  canAccessDoctor,
  isAuthenticated 
} = require('../middleware/authMiddleware');
const doctorController = require('../controllers/doctorController');

/**
 * @route   GET /api/doctors/specialties
 * @desc    Get list of specialties with doctor count
 * @access  Public
 */
router.get(
  '/specialties',
  doctorController.getSpecialties
);

// Apply authentication to routes below
router.use(isAuthenticated);

/**
 * @route   GET /api/doctors
 * @desc    Get all doctors
 * @access  Public (basic info), Private (full info)
 */
router.get(
  '/',
  validatePagination,
  searchValidation.general,
  handleValidationErrors,
  doctorController.getAllDoctors
);

/**
 * @route   GET /api/doctors/availability/:doctorId
 * @desc    Get doctor availability
 * @access  Public
 */
router.get(
  '/availability/:doctorId',
  validateObjectId('doctorId'),
  doctorController.getDoctorAvailability
);

/**
 * @route   GET /api/doctors/:doctorId
 * @desc    Get single doctor
 * @access  Public (basic info), Private (full info)
 */
router.get(
  '/:doctorId',
  validateObjectId('doctorId'),
  doctorController.getDoctorById
);

// All routes below require authentication
router.use(verifyToken);

/**
 * @route   POST /api/doctors
 * @desc    Create new doctor
 * @access  Admin only
 */
router.post(
  '/',
  authorize('admin'),
  doctorValidation.create,
  handleValidationErrors,
  doctorController.createDoctor
);

/**
 * @route   PUT /api/doctors/:doctorId
 * @desc    Update doctor
 * @access  Admin, Doctor (own)
 */
router.put(
  '/:doctorId',
  validateObjectId('doctorId'),
  canAccessDoctor,
  handleValidationErrors,
  doctorController.updateDoctor
);

/**
 * @route   DELETE /api/doctors/:doctorId
 * @desc    Delete (deactivate) doctor
 * @access  Admin only
 */
router.delete(
  '/:doctorId',
  authorize('admin'),
  validateObjectId('doctorId'),
  doctorController.deleteDoctor
);

/**
 * @route   PUT /api/doctors/:doctorId/availability
 * @desc    Update doctor availability
 * @access  Admin, Doctor (own)
 */
router.put(
  '/:doctorId/availability',
  validateObjectId('doctorId'),
  canAccessDoctor,
  doctorValidation.updateAvailability,
  handleValidationErrors,
  doctorController.updateDoctorAvailability
);

/**
 * @route   GET /api/doctors/:doctorId/patients
 * @desc    Get doctor's patients
 * @access  Admin, Doctor (own)
 */
router.get(
  '/:doctorId/patients',
  validateObjectId('doctorId'),
  canAccessDoctor,
  validatePagination,
  doctorController.getDoctorPatients
);

/**
 * @route   GET /api/doctors/:doctorId/appointments
 * @desc    Get doctor's appointments
 * @access  Admin, Doctor (own), Receptionist
 */
router.get(
  '/:doctorId/appointments',
  validateObjectId('doctorId'),
  authorize('admin', 'doctor', 'receptionist'),
  validatePagination,
  doctorController.getDoctorAppointments
);

/**
 * @route   POST /api/doctors/:doctorId/reviews
 * @desc    Add review for doctor
 * @access  Patient only
 */
router.post(
  '/:doctorId/reviews',
  validateObjectId('doctorId'),
  authorize('patient'),
  doctorController.addDoctorReview
);

/**
 * @route   GET /api/doctors/:doctorId/statistics
 * @desc    Get doctor statistics
 * @access  Admin, Doctor (own)
 */
router.get(
  '/:doctorId/statistics',
  validateObjectId('doctorId'),
  canAccessDoctor,
  doctorController.getDoctorStatistics
);

module.exports = router;