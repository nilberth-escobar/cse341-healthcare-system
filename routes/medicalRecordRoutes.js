const express = require('express');
const router = express.Router();
const { medicalRecordValidation } = require('../validations/schemas');
const {
  handleValidationErrors,
  validatePagination,
  validateDateRange,
  validateObjectId
} = require('../middleware/validationMiddleware');
const {
  verifyToken,
  authorize,
  canAccessPatient,
  canAccessMedicalRecord
} = require('../middleware/authMiddleware');
const medicalRecordController = require('../controllers/medicalRecordController');

// Require authentication for all medical record routes
router.use(verifyToken);

/**
 * @route   POST /api/medical-records
 * @desc    Create a new medical record for a patient
 * @access  Admin, Doctor
 */
router.post(
  '/',
  authorize('admin', 'doctor'),
  medicalRecordValidation.create,
  handleValidationErrors,
  canAccessPatient,
  medicalRecordController.createMedicalRecord
);

/**
 * @route   GET /api/medical-records
 * @desc    Get medical records with optional filters
 * @access  Admin, Doctor, Patient (own records)
 */
router.get(
  '/',
  authorize('admin', 'doctor', 'patient'),
  validatePagination,
  validateDateRange,
  handleValidationErrors,
  medicalRecordController.getMedicalRecords
);

/**
 * @route   GET /api/medical-records/:recordId
 * @desc    Get detailed information for a single medical record
 * @access  Admin, Doctor (assigned), Patient (own)
 */
router.get(
  '/:recordId',
  validateObjectId('recordId'),
  handleValidationErrors,
  canAccessMedicalRecord,
  medicalRecordController.getMedicalRecordById
);

/**
 * @route   PUT /api/medical-records/:recordId
 * @desc    Update an existing medical record
 * @access  Admin, Doctor
 */
router.put(
  '/:recordId',
  authorize('admin', 'doctor'),
  validateObjectId('recordId'),
  handleValidationErrors,
  canAccessMedicalRecord,
  medicalRecordController.updateMedicalRecord
);

/**
 * @route   DELETE /api/medical-records/:recordId
 * @desc    Delete a medical record
 * @access  Admin
 */
router.delete(
  '/:recordId',
  authorize('admin'),
  validateObjectId('recordId'),
  handleValidationErrors,
  medicalRecordController.deleteMedicalRecord
);

/**
 * @route   POST /api/medical-records/:recordId/finalize
 * @desc    Finalize a medical record to prevent further modifications
 * @access  Admin, Doctor
 */
router.post(
  '/:recordId/finalize',
  authorize('admin', 'doctor'),
  medicalRecordValidation.finalize,
  handleValidationErrors,
  canAccessMedicalRecord,
  medicalRecordController.finalizeMedicalRecord
);

module.exports = router;
