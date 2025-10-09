const express = require('express');
const router = express.Router();
const { patientValidation, searchValidation } = require('../validations/schemas');
const { 
  handleValidationErrors, 
  validatePagination, 
  validateDateRange,
  validateObjectId 
} = require('../middleware/validationMiddleware');
const { 
  verifyToken, 
  authorize, 
  canAccessPatient 
} = require('../middleware/authMiddleware');
const patientController = require('../controllers/patientController');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/patients
 * @desc    Create new patient
 * @access  Admin, Doctor
 */
router.post(
  '/',
  authorize('admin', 'doctor'),
  patientValidation.create,
  handleValidationErrors,
  patientController.createPatient
);

/**
 * @route   GET /api/patients
 * @desc    Get all patients
 * @access  Admin, Doctor
 */
router.get(
  '/',
  authorize('admin', 'doctor', 'receptionist'),
  validatePagination,
  searchValidation.general,
  handleValidationErrors,
  patientController.getAllPatients
);

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get single patient
 * @access  Admin, Doctor, Patient (own), Receptionist
 */
router.get(
  '/:patientId',
  validateObjectId('patientId'),
  canAccessPatient,
  patientController.getPatientById
);

/**
 * @route   PUT /api/patients/:patientId
 * @desc    Update patient
 * @access  Admin, Patient (own)
 */
router.put(
  '/:patientId',
  validateObjectId('patientId'),
  canAccessPatient,
  patientValidation.update,
  handleValidationErrors,
  patientController.updatePatient
);

/**
 * @route   DELETE /api/patients/:patientId
 * @desc    Delete (deactivate) patient
 * @access  Admin only
 */
router.delete(
  '/:patientId',
  authorize('admin'),
  validateObjectId('patientId'),
  patientController.deletePatient
);

/**
 * @route   GET /api/patients/:patientId/medical-history
 * @desc    Get patient medical history
 * @access  Admin, Doctor (assigned), Patient (own)
 */
router.get(
  '/:patientId/medical-history',
  validateObjectId('patientId'),
  canAccessPatient,
  validatePagination,
  validateDateRange,
  patientController.getPatientMedicalHistory
);

/**
 * @route   GET /api/patients/:patientId/appointments
 * @desc    Get patient appointments
 * @access  Admin, Doctor (assigned), Patient (own)
 */
router.get(
  '/:patientId/appointments',
  validateObjectId('patientId'),
  canAccessPatient,
  validatePagination,
  validateDateRange,
  patientController.getPatientAppointments
);

/**
 * @route   GET /api/patients/:patientId/prescriptions
 * @desc    Get patient prescriptions
 * @access  Admin, Doctor (assigned), Patient (own)
 */
router.get(
  '/:patientId/prescriptions',
  validateObjectId('patientId'),
  canAccessPatient,
  validatePagination,
  patientController.getPatientPrescriptions
);

/**
 * @route   GET /api/patients/:patientId/lab-orders
 * @desc    Get patient lab orders
 * @access  Admin, Doctor (assigned), Patient (own), Lab Technician
 */
router.get(
  '/:patientId/lab-orders',
  validateObjectId('patientId'),
  canAccessPatient,
  validatePagination,
  patientController.getPatientLabOrders
);

/**
 * @route   POST /api/patients/:patientId/allergies
 * @desc    Add allergy to patient
 * @access  Admin, Doctor (assigned)
 */
router.post(
  '/:patientId/allergies',
  authorize('admin', 'doctor'),
  validateObjectId('patientId'),
  canAccessPatient,
  patientValidation.addAllergy,
  handleValidationErrors,
  patientController.addAllergy
);

/**
 * @route   PUT /api/patients/:patientId/vital-signs
 * @desc    Update patient vital signs
 * @access  Admin, Doctor, Nurse
 */
router.put(
  '/:patientId/vital-signs',
  authorize('admin', 'doctor', 'nurse'),
  validateObjectId('patientId'),
  canAccessPatient,
  patientController.updateVitalSigns
);

/**
 * @route   POST /api/patients/:patientId/notes
 * @desc    Add note to patient record
 * @access  Admin, Doctor (assigned)
 */
router.post(
  '/:patientId/notes',
  authorize('admin', 'doctor'),
  validateObjectId('patientId'),
  canAccessPatient,
  patientController.addNote
);

/**
 * @route   POST /api/patients/:patientId/assign-doctor
 * @desc    Assign doctor to patient
 * @access  Admin
 */
router.post(
  '/:patientId/assign-doctor',
  authorize('admin'),
  validateObjectId('patientId'),
  patientController.assignDoctor
);

/**
 * @route   GET /api/patients/:patientId/summary
 * @desc    Get patient summary
 * @access  Admin, Doctor (assigned), Patient (own)
 */
router.get(
  '/:patientId/summary',
  validateObjectId('patientId'),
  canAccessPatient,
  patientController.getPatientSummary
);

module.exports = router;