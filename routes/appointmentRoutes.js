const express = require('express');
const router = express.Router();
const { appointmentValidation, searchValidation } = require('../validations/schemas');
const { 
  handleValidationErrors, 
  validatePagination,
  validateDateRange,
  validateObjectId,
  validateAppointmentSlot 
} = require('../middleware/validationMiddleware');
const { 
  verifyToken, 
  authorize, 
  canAccessAppointment 
} = require('../middleware/authMiddleware');
const appointmentController = require('../controllers/appointmentController');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Admin, Doctor, Patient, Receptionist
 */
router.post(
  '/',
  appointmentValidation.create,
  handleValidationErrors,
  validateAppointmentSlot,
  appointmentController.createAppointment
);

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments
 * @access  Admin (all), Doctor (own), Patient (own), Receptionist (all)
 */
router.get(
  '/',
  validatePagination,
  validateDateRange,
  searchValidation.general,
  handleValidationErrors,
  appointmentController.getAllAppointments
);

/**
 * @route   GET /api/appointments/summary
 * @desc    Get appointment summary statistics
 * @access  Admin, Doctor (own), Receptionist
 */
router.get(
  '/summary',
  authorize('admin', 'doctor', 'receptionist'),
  appointmentController.getAppointmentSummary
);

/**
 * @route   GET /api/appointments/search
 * @desc    Search appointments
 * @access  Admin, Doctor (own), Patient (own), Receptionist
 */
router.get(
  '/search',
  validatePagination,
  searchValidation.general,
  handleValidationErrors,
  appointmentController.searchAppointments
);

/**
 * @route   GET /api/appointments/:appointmentId
 * @desc    Get single appointment
 * @access  Admin, Doctor (assigned), Patient (own), Receptionist
 */
router.get(
  '/:appointmentId',
  validateObjectId('appointmentId'),
  canAccessAppointment,
  appointmentController.getAppointmentById
);

/**
 * @route   PUT /api/appointments/:appointmentId
 * @desc    Update appointment
 * @access  Admin, Doctor (assigned), Receptionist
 */
router.put(
  '/:appointmentId',
  validateObjectId('appointmentId'),
  canAccessAppointment,
  appointmentValidation.update,
  handleValidationErrors,
  validateAppointmentSlot,
  appointmentController.updateAppointment
);

/**
 * @route   DELETE /api/appointments/:appointmentId
 * @desc    Cancel appointment
 * @access  Admin, Doctor (assigned), Patient (own), Receptionist
 */
router.delete(
  '/:appointmentId',
  validateObjectId('appointmentId'),
  canAccessAppointment,
  appointmentController.cancelAppointment
);

/**
 * @route   POST /api/appointments/:appointmentId/reschedule
 * @desc    Reschedule appointment
 * @access  Admin, Doctor (assigned), Patient (own), Receptionist
 */
router.post(
  '/:appointmentId/reschedule',
  validateObjectId('appointmentId'),
  canAccessAppointment,
  validateAppointmentSlot,
  appointmentController.rescheduleAppointment
);

/**
 * @route   POST /api/appointments/:appointmentId/check-in
 * @desc    Check in patient for appointment
 * @access  Admin, Receptionist, Nurse
 */
router.post(
  '/:appointmentId/check-in',
  validateObjectId('appointmentId'),
  authorize('admin', 'receptionist', 'nurse'),
  appointmentValidation.checkIn,
  handleValidationErrors,
  appointmentController.checkInPatient
);

/**
 * @route   POST /api/appointments/:appointmentId/check-out
 * @desc    Check out patient from appointment
 * @access  Admin, Doctor, Receptionist, Nurse
 */
router.post(
  '/:appointmentId/check-out',
  validateObjectId('appointmentId'),
  authorize('admin', 'doctor', 'receptionist', 'nurse'),
  appointmentController.checkOutPatient
);

/**
 * @route   POST /api/appointments/:appointmentId/vitals
 * @desc    Record vital signs for appointment
 * @access  Admin, Doctor, Nurse
 */
router.post(
  '/:appointmentId/vitals',
  validateObjectId('appointmentId'),
  authorize('admin', 'doctor', 'nurse'),
  appointmentValidation.recordVitals,
  handleValidationErrors,
  appointmentController.recordVitals
);

/**
 * @route   POST /api/appointments/:appointmentId/diagnosis
 * @desc    Add diagnosis to appointment
 * @access  Doctor only
 */
router.post(
  '/:appointmentId/diagnosis',
  validateObjectId('appointmentId'),
  authorize('doctor'),
  appointmentController.addDiagnosis
);

/**
 * @route   POST /api/appointments/:appointmentId/complete
 * @desc    Complete appointment
 * @access  Doctor only
 */
router.post(
  '/:appointmentId/complete',
  validateObjectId('appointmentId'),
  authorize('doctor'),
  appointmentController.completeAppointment
);

module.exports = router;