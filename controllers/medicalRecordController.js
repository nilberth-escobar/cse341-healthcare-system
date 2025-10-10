const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const recordPopulation = [
  { path: 'patient', select: 'firstName lastName patientId dateOfBirth gender contactInfo' },
  { path: 'doctor', select: 'firstName lastName specialty doctorId' },
  { path: 'appointment', select: 'appointmentId dateTime status type' },
  { path: 'finalizedBy', select: 'firstName lastName specialty doctorId' },
  { path: 'lastReviewedBy', select: 'name email role' },
  { path: 'access.sharedWith.user', select: 'name email role' }
];

const populateRecord = (query) => query.populate(recordPopulation);

const buildMedicalRecordFilter = (req) => {
  const {
    patient,
    doctor,
    visitType,
    status,
    q,
    startDate,
    endDate
  } = req.query;

  const filter = {};

  if (patient) {
    filter.patient = patient;
  }

  if (doctor) {
    filter.doctor = doctor;
  }

  if (visitType) {
    filter.visitType = visitType;
  }

  if (status === 'finalized') {
    filter.isFinalized = true;
  } else if (status === 'draft') {
    filter.isFinalized = false;
  }

  if (startDate || endDate) {
    filter.visitDate = {};

    if (startDate) {
      filter.visitDate.$gte = new Date(startDate);
    }

    if (endDate) {
      filter.visitDate.$lte = new Date(endDate);
    }
  }

  if (q) {
    filter.$or = [
      { chiefComplaint: { $regex: q, $options: 'i' } },
      { 'assessment.diagnosis.description': { $regex: q, $options: 'i' } },
      { 'plan.treatmentPlan': { $regex: q, $options: 'i' } }
    ];
  }

  // Apply role-based restrictions
  if (req.user.role === 'patient' && req.patient) {
    filter.patient = req.patient._id;
  }

  if (req.user.role === 'doctor' && req.doctor) {
    filter.doctor = req.doctor._id;
  }

  return filter;
};

const getPaginationOptions = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const sortBy = req.query.sortBy || 'visitDate';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { [sortBy]: sortOrder }
  };
};

// Create new medical record
const createMedicalRecord = async (req, res) => {
  try {
    const { patient: patientId, doctor: doctorId } = req.body;

    const [patient, doctor] = await Promise.all([
      Patient.findById(patientId),
      Doctor.findById(doctorId)
    ]);

    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }

    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }

    const record = new MedicalRecord({
      ...req.body,
      lastReviewedBy: req.user._id,
      lastReviewedAt: new Date()
    });

    await record.save();
    await record.populate(recordPopulation);

    return res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: record
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    return res.status(500).json({
      error: 'Failed to create medical record',
      message: error.message
    });
  }
};

// Get medical records with filters and pagination
const getMedicalRecords = async (req, res) => {
  try {
    const filter = buildMedicalRecordFilter(req);
    const { page, limit, skip, sort } = getPaginationOptions(req);

    const [records, total] = await Promise.all([
      populateRecord(
        MedicalRecord.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
      ),
      MedicalRecord.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    return res.status(500).json({
      error: 'Failed to fetch medical records',
      message: error.message
    });
  }
};

// Get single medical record
const getMedicalRecordById = async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await populateRecord(MedicalRecord.findById(recordId));

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Medical record not found'
      });
    }

    return res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    return res.status(500).json({
      error: 'Failed to fetch medical record',
      message: error.message
    });
  }
};

// Update medical record
const updateMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await MedicalRecord.findById(recordId);

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Medical record not found'
      });
    }

    if (record.isFinalized && req.user.role !== 'admin') {
      return res.status(400).json({
        error: 'Record Finalized',
        message: 'Finalized medical records can only be modified by an administrator'
      });
    }

    record.set({
      ...req.body,
      lastReviewedBy: req.user._id,
      lastReviewedAt: new Date()
    });

    await record.save();
    await record.populate(recordPopulation);

    return res.json({
      success: true,
      message: 'Medical record updated successfully',
      data: record
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    return res.status(500).json({
      error: 'Failed to update medical record',
      message: error.message
    });
  }
};

// Delete medical record
const deleteMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await MedicalRecord.findById(recordId);

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Medical record not found'
      });
    }

    await record.deleteOne();

    return res.json({
      success: true,
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    console.error('Delete medical record error:', error);
    return res.status(500).json({
      error: 'Failed to delete medical record',
      message: error.message
    });
  }
};

// Finalize medical record
const finalizeMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const record = await MedicalRecord.findById(recordId);

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Medical record not found'
      });
    }

    if (record.isFinalized) {
      return res.status(400).json({
        error: 'Already Finalized',
        message: 'Medical record has already been finalized'
      });
    }

    let doctorId = req.doctor ? req.doctor._id : null;

    if (!doctorId && req.body.doctor) {
      doctorId = req.body.doctor;
    }

    if (!doctorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Doctor information is required to finalize the record'
      });
    }

    await record.finalize(doctorId);
    record.lastReviewedBy = req.user._id;
    record.lastReviewedAt = new Date();
    await record.save();
    await record.populate(recordPopulation);

    return res.json({
      success: true,
      message: 'Medical record finalized successfully',
      data: record
    });
  } catch (error) {
    console.error('Finalize medical record error:', error);
    return res.status(500).json({
      error: 'Failed to finalize medical record',
      message: error.message
    });
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
  finalizeMedicalRecord
};
