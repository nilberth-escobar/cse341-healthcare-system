const express = require('express');
const router = express.Router();
const { labOrderValidation, searchValidation } = require('../validations/schemas');
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
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/lab-orders
 * @desc    Create new lab order
 * @access  Doctor only
 */
router.post(
  '/',
  authorize('doctor'),
  labOrderValidation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const labOrder = new LabOrder({
        ...req.body,
        doctor: req.doctor._id
      });
      
      await labOrder.save();
      
      // Add to patient record
      const patient = await Patient.findById(req.body.patient);
      if (patient) {
        patient.labOrders.push(labOrder._id);
        await patient.save();
      }
      
      await labOrder.populate('patient doctor', 'firstName lastName');
      
      res.status(201).json({
        success: true,
        message: 'Lab order created successfully',
        data: labOrder
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create lab order',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/lab-orders
 * @desc    Get lab orders
 * @access  Admin, Doctor (own), Patient (own), Lab Technician
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
        priority,
        isUrgent 
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
      if (priority) filter.priority = priority;
      if (isUrgent !== undefined) filter.isUrgent = isUrgent === 'true';
      
      if (req.dateRange) {
        filter.orderDate = {
          $gte: req.dateRange.startDate,
          $lte: req.dateRange.endDate
        };
      }
      
      const skip = (page - 1) * limit;
      
      const [labOrders, total] = await Promise.all([
        LabOrder.find(filter)
          .populate('patient', 'firstName lastName patientId')
          .populate('doctor', 'firstName lastName specialty')
          .sort({ orderDate: -1, priority: 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        LabOrder.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: labOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get lab orders',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/lab-orders/:labOrderId
 * @desc    Get single lab order
 * @access  Admin, Doctor (own), Patient (own), Lab Technician
 */
router.get(
  '/:labOrderId',
  validateObjectId('labOrderId'),
  async (req, res) => {
    try {
      const labOrder = await LabOrder.findById(req.params.labOrderId)
        .populate('patient', 'firstName lastName patientId dateOfBirth gender')
        .populate('doctor', 'firstName lastName specialty')
        .populate('appointment')
        .populate('results.reportedBy', 'name')
        .populate('results.verifiedBy', 'name');
      
      if (!labOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Lab order not found'
        });
      }
      
      // Access control
      if (req.user.role === 'patient' && req.patient) {
        if (labOrder.patient._id.toString() !== req.patient._id.toString()) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own lab orders'
          });
        }
      } else if (req.user.role === 'doctor' && req.doctor) {
        if (labOrder.doctor._id.toString() !== req.doctor._id.toString()) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access lab orders you created'
          });
        }
      }
      
      res.json({
        success: true,
        data: labOrder
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get lab order',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/lab-orders/:labOrderId/collect-specimen
 * @desc    Record specimen collection
 * @access  Lab Technician, Nurse
 */
router.post(
  '/:labOrderId/collect-specimen',
  authorize('lab_technician', 'nurse', 'admin'),
  validateObjectId('labOrderId'),
  labOrderValidation.collectSpecimen,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { specimenIds, collectionSite, notes } = req.body;
      const labOrder = await LabOrder.findById(req.params.labOrderId);
      
      if (!labOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Lab order not found'
        });
      }
      
      if (labOrder.status !== 'ordered') {
        return res.status(400).json({
          error: 'Invalid Status',
          message: 'Specimen can only be collected for ordered tests'
        });
      }
      
      await labOrder.collectSpecimen(req.user._id, specimenIds, notes);
      
      if (collectionSite) {
        labOrder.specimenCollection.collectionSite = collectionSite;
        await labOrder.save();
      }
      
      res.json({
        success: true,
        message: 'Specimen collected successfully',
        data: labOrder.specimenCollection
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to collect specimen',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/lab-orders/:labOrderId/results
 * @desc    Add test results
 * @access  Lab Technician, Admin
 */
router.post(
  '/:labOrderId/results',
  authorize('lab_technician', 'admin'),
  validateObjectId('labOrderId'),
  labOrderValidation.addResults,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { testCode, value, unit, flag, interpretation, comments } = req.body;
      const labOrder = await LabOrder.findById(req.params.labOrderId);
      
      if (!labOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Lab order not found'
        });
      }
      
      const results = {
        value,
        unit,
        flag,
        interpretation,
        comments
      };
      
      await labOrder.addResults(testCode, results, req.user._id);
      
      // Check for critical values
      if (flag === 'critical-high' || flag === 'critical-low') {
        await labOrder.flagCriticalValue(testCode, value, req.user._id);
      }
      
      res.json({
        success: true,
        message: 'Results added successfully',
        data: labOrder.results
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to add results',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/lab-orders/:labOrderId/critical/:criticalId/acknowledge
 * @desc    Acknowledge critical value
 * @access  Doctor, Admin
 */
router.post(
  '/:labOrderId/critical/:criticalId/acknowledge',
  authorize('doctor', 'admin'),
  validateObjectId('labOrderId'),
  async (req, res) => {
    try {
      const labOrder = await LabOrder.findById(req.params.labOrderId);
      
      if (!labOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Lab order not found'
        });
      }
      
      await labOrder.acknowledgeCritical(
        req.params.criticalId, 
        req.user.name || req.user.username
      );
      
      res.json({
        success: true,
        message: 'Critical value acknowledged',
        data: labOrder.results.criticalValues
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to acknowledge critical value',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/lab-orders/:labOrderId/cancel
 * @desc    Cancel lab order
 * @access  Doctor (own), Admin
 */
router.post(
  '/:labOrderId/cancel',
  authorize('doctor', 'admin'),
  validateObjectId('labOrderId'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const labOrder = await LabOrder.findById(req.params.labOrderId);
      
      if (!labOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Lab order not found'
        });
      }
      
      if (req.user.role === 'doctor' && req.doctor) {
        if (labOrder.doctor.toString() !== req.doctor._id.toString()) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only cancel your own lab orders'
          });
        }
      }
      
      if (labOrder.status === 'completed' || labOrder.status === 'cancelled') {
        return res.status(400).json({
          error: 'Cannot Cancel',
          message: 'Cannot cancel completed or already cancelled orders'
        });
      }
      
      await labOrder.cancelOrder(req.user._id, reason);
      
      res.json({
        success: true,
        message: 'Lab order cancelled successfully',
        data: labOrder
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to cancel lab order',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/lab-orders/:labOrderId/comments
 * @desc    Add comment to lab order
 * @access  Doctor, Lab Technician, Admin
 */
router.post(
  '/:labOrderId/comments',
  authorize('doctor', 'lab_technician', 'admin'),
  validateObjectId('labOrderId'),
  async (req, res) => {
    try {
      const { comment } = req.body;
      const labOrder = await LabOrder.findById(req.params.labOrderId);
      
      if (!labOrder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Lab order not found'
        });
      }
      
      await labOrder.addComment(comment, req.user._id);
      
      res.json({
        success: true,
        message: 'Comment added successfully',
        data: labOrder.comments[labOrder.comments.length - 1]
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to add comment',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/lab-orders/pending
 * @desc    Get pending lab orders
 * @access  Lab Technician, Admin
 */
router.get(
  '/pending',
  authorize('lab_technician', 'admin'),
  validatePagination,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, priority } = req.query;
      
      const filter = {
        status: { $in: ['ordered', 'specimen-collected'] }
      };
      
      if (priority) filter.priority = priority;
      
      const skip = (page - 1) * limit;
      
      const [labOrders, total] = await Promise.all([
        LabOrder.find(filter)
          .populate('patient', 'firstName lastName patientId')
          .populate('doctor', 'firstName lastName')
          .sort({ priority: 1, orderDate: 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        LabOrder.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: labOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get pending lab orders',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/lab-orders/critical
 * @desc    Get lab orders with unacknowledged critical values
 * @access  Doctor, Admin
 */
router.get(
  '/critical',
  authorize('doctor', 'admin'),
  validatePagination,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const filter = {
        'results.criticalValues': { $exists: true, $ne: [] },
        'results.criticalValues.acknowledgment.acknowledged': false
      };
      
      if (req.user.role === 'doctor' && req.doctor) {
        filter.doctor = req.doctor._id;
      }
      
      const skip = (page - 1) * limit;
      
      const [labOrders, total] = await Promise.all([
        LabOrder.find(filter)
          .populate('patient', 'firstName lastName patientId')
          .populate('doctor', 'firstName lastName')
          .sort({ 'results.criticalValues.notifiedAt': -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        LabOrder.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: labOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get critical lab orders',
        message: error.message
      });
    }
  }
);

module.exports = router;