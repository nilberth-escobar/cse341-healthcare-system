const express = require('express');
const router = express.Router();
const { prescriptionValidation, searchValidation } = require('../validations/schemas');
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
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/prescriptions
 * @desc    Create new prescription
 * @access  Doctor only
 */
router.post(
  '/',
  authorize('doctor'),
  prescriptionValidation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const prescription = new Prescription({
        ...req.body,
        doctor: req.doctor._id
      });
      
      // Check drug interactions
      const interactions = await prescription.checkInteractions(req.body.patient);
      if (interactions.length > 0) {
        prescription.interactions = interactions;
      }
      
      await prescription.save();
      
      // Add to patient record
      const patient = await Patient.findById(req.body.patient);
      if (patient) {
        patient.prescriptions.push(prescription._id);
        await patient.save();
      }
      
      await prescription.populate('patient doctor', 'firstName lastName');
      
      res.status(201).json({
        success: true,
        message: 'Prescription created successfully',
        data: prescription,
        warnings: interactions.length > 0 ? interactions : undefined
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create prescription',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/prescriptions
 * @desc    Get prescriptions
 * @access  Admin, Doctor (own), Patient (own), Pharmacist
 */
router.get(
  '/',
  validatePagination,
  validateDateRange,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        patient, 
        doctor,
        status, 
        active 
      } = req.query;
      
      const filter = {};
      
      // Role-based filtering
      if (req.user.role === 'patient' && req.patient) {
        filter.patient = req.patient._id;
      } else if (req.user.role === 'doctor' && req.doctor) {
        filter.doctor = req.doctor._id;
      }
      
      if (patient && req.user.role !== 'patient') filter.patient = patient;
      if (doctor && req.user.role !== 'doctor') filter.doctor = doctor;
      if (status) filter.status = status;
      
      if (active === 'true') {
        filter.status = 'active';
        filter.expiryDate = { $gte: new Date() };
      }
      
      if (req.dateRange) {
        filter.issueDate = {
          $gte: req.dateRange.startDate,
          $lte: req.dateRange.endDate
        };
      }
      
      const skip = (page - 1) * limit;
      
      const [prescriptions, total] = await Promise.all([
        Prescription.find(filter)
          .populate('patient', 'firstName lastName patientId')
          .populate('doctor', 'firstName lastName specialty')
          .sort({ issueDate: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Prescription.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: prescriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get prescriptions',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/prescriptions/:prescriptionId
 * @desc    Get single prescription
 * @access  Admin, Doctor (own), Patient (own), Pharmacist
 */
router.get(
  '/:prescriptionId',
  validateObjectId('prescriptionId'),
  async (req, res) => {
    try {
      const prescription = await Prescription.findById(req.params.prescriptionId)
        .populate('patient', 'firstName lastName patientId dateOfBirth gender')
        .populate('doctor', 'firstName lastName specialty licenseNumber')
        .populate('appointment')
        .populate('medicalRecord');
      
      if (!prescription) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Prescription not found'
        });
      }
      
      // Access control
      if (req.user.role === 'patient' && req.patient) {
        if (prescription.patient._id.toString() !== req.patient._id.toString()) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own prescriptions'
          });
        }
      } else if (req.user.role === 'doctor' && req.doctor) {
        if (prescription.doctor._id.toString() !== req.doctor._id.toString()) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access prescriptions you created'
          });
        }
      }
      
      res.json({
        success: true,
        data: prescription
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get prescription',
        message: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/prescriptions/:prescriptionId
 * @desc    Update prescription
 * @access  Doctor (own) only
 */
router.put(
  '/:prescriptionId',
  authorize('doctor'),
  validateObjectId('prescriptionId'),
  async (req, res) => {
    try {
      const prescription = await Prescription.findById(req.params.prescriptionId);
      
      if (!prescription) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Prescription not found'
        });
      }
      
      if (prescription.doctor.toString() !== req.doctor._id.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update your own prescriptions'
        });
      }
      
      if (prescription.status === 'filled' || prescription.isExpired) {
        return res.status(400).json({
          error: 'Cannot Update',
          message: 'Cannot update filled or expired prescriptions'
        });
      }
      
      const updates = req.body;
      delete updates._id;
      delete updates.prescriptionId;
      delete updates.patient;
      delete updates.doctor;
      delete updates.issueDate;
      
      // Track modifications
      const changeType = Object.keys(updates)[0];
      const previousValue = JSON.stringify(prescription[changeType]);
      const newValue = JSON.stringify(updates[changeType]);
      
      await prescription.modifyPrescription(
        req.doctor._id,
        changeType,
        previousValue,
        newValue,
        req.body.reason || 'Updated by doctor'
      );
      
      Object.assign(prescription, updates);
      await prescription.save();
      
      res.json({
        success: true,
        message: 'Prescription updated successfully',
        data: prescription
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update prescription',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/prescriptions/:prescriptionId/refill
 * @desc    Process prescription refill
 * @access  Pharmacist, Admin
 */
router.post(
  '/:prescriptionId/refill',
  authorize('admin', 'pharmacist'),
  validateObjectId('prescriptionId'),
  prescriptionValidation.refill,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { medicationIndex, quantity, pharmacy } = req.body;
      const prescription = await Prescription.findById(req.params.prescriptionId);
      
      if (!prescription) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Prescription not found'
        });
      }
      
      await prescription.processRefill(medicationIndex, quantity, pharmacy);
      
      res.json({
        success: true,
        message: 'Refill processed successfully',
        data: {
          remainingRefills: prescription.medicationDetails[medicationIndex].refills.remaining,
          lastRefillDate: prescription.medicationDetails[medicationIndex].refills.lastRefillDate
        }
      });
    } catch (error) {
      res.status(400).json({
        error: 'Refill Failed',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/prescriptions/:prescriptionId/discontinue
 * @desc    Discontinue prescription
 * @access  Doctor (own) only
 */
router.post(
  '/:prescriptionId/discontinue',
  authorize('doctor'),
  validateObjectId('prescriptionId'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const prescription = await Prescription.findById(req.params.prescriptionId);
      
      if (!prescription) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Prescription not found'
        });
      }
      
      if (prescription.doctor.toString() !== req.doctor._id.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only discontinue your own prescriptions'
        });
      }
      
      await prescription.discontinue(req.doctor._id, reason);
      
      res.json({
        success: true,
        message: 'Prescription discontinued successfully',
        data: prescription
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to discontinue prescription',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/prescriptions/:prescriptionId/verify
 * @desc    Verify prescription authenticity
 * @access  Public (with prescription ID and verification code)
 */
router.post(
  '/:prescriptionId/verify',
  async (req, res) => {
    try {
      const { verificationCode } = req.body;
      const prescription = await Prescription.findOne({
        prescriptionId: req.params.prescriptionId
      })
        .select('prescriptionId issueDate expiryDate status patient doctor')
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName licenseNumber');
      
      if (!prescription) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Prescription not found'
        });
      }
      
      // Verify code (simplified - in production, use proper cryptographic verification)
      const expectedCode = prescription.qrCode || prescription.barcode;
      
      if (verificationCode !== expectedCode) {
        return res.status(401).json({
          error: 'Invalid',
          message: 'Invalid verification code'
        });
      }
      
      res.json({
        success: true,
        message: 'Prescription verified',
        data: {
          prescriptionId: prescription.prescriptionId,
          issueDate: prescription.issueDate,
          expiryDate: prescription.expiryDate,
          status: prescription.status,
          isValid: !prescription.isExpired && prescription.status === 'active',
          patient: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
          doctor: `Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
          licenseNumber: prescription.doctor.licenseNumber
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to verify prescription',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/prescriptions/:prescriptionId/print
 * @desc    Get printable prescription
 * @access  Admin, Doctor (own), Patient (own)
 */
router.get(
  '/:prescriptionId/print',
  verifyToken,
  validateObjectId('prescriptionId'),
  async (req, res) => {
    try {
      const prescription = await Prescription.findById(req.params.prescriptionId)
        .populate('patient', 'firstName lastName dateOfBirth gender patientId address contactInfo')
        .populate('doctor', 'firstName lastName title specialty licenseNumber deaNumber contactInfo')
        .populate('appointment', 'appointmentId dateTime');
      
      if (!prescription) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Prescription not found'
        });
      }
      
      // Access control
      const hasAccess = 
        req.user.role === 'admin' ||
        (req.user.role === 'doctor' && prescription.doctor._id.toString() === req.doctor._id.toString()) ||
        (req.user.role === 'patient' && prescription.patient._id.toString() === req.patient._id.toString());
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
      
      if (!prescription.isPrintable) {
        return res.status(400).json({
          error: 'Not Printable',
          message: 'This prescription is not printable'
        });
      }
      
      // Generate QR code if not exists
      if (!prescription.qrCode) {
        await prescription.generateQRCode();
      }
      
      // Log print
      prescription.printedCopies.push({
        printedAt: new Date(),
        printedBy: req.user._id,
        purpose: req.query.purpose || 'Patient copy'
      });
      await prescription.save();
      
      res.json({
        success: true,
        data: prescription,
        printUrl: `/api/prescriptions/${prescription._id}/pdf`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get printable prescription',
        message: error.message
      });
    }
  }
);

module.exports = router;