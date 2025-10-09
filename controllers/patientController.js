const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');

// Create new patient
const createPatient = async (req, res) => {
  try {
    const patientData = req.body;
    
    // Check if user exists
    if (patientData.userId) {
      const user = await User.findById(patientData.userId);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      // Check if patient profile already exists
      const existingPatient = await Patient.findOne({ userId: patientData.userId });
      if (existingPatient) {
        return res.status(400).json({
          error: 'Duplicate',
          message: 'Patient profile already exists for this user'
        });
      }
    } else {
      // Create user account if not exists
      const user = new User({
        username: patientData.contactInfo.email.split('@')[0] + Date.now(),
        email: patientData.contactInfo.email,
        name: `${patientData.firstName} ${patientData.lastName}`,
        role: 'patient',
        password: Math.random().toString(36).slice(-8) // Temporary password
      });
      await user.save();
      patientData.userId = user._id;
    }
    
    // Create patient
    const patient = new Patient(patientData);
    await patient.save();
    
    // Populate user info
    await patient.populate('userId', 'username email name');
    
    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      error: 'Failed to create patient',
      message: error.message
    });
  }
};

// Get all patients
const getAllPatients = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      bloodGroup,
      gender,
      isActive
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (gender) filter.gender = gender;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // For doctors, only show their patients
    if (req.user.role === 'doctor' && req.doctor) {
      filter.$or = [
        { primaryCarePhysician: req.doctor._id },
        { assignedDoctors: req.doctor._id }
      ];
    }
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .populate('userId', 'username email name avatar')
        .populate('primaryCarePhysician', 'firstName lastName specialty')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Patient.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      error: 'Failed to get patients',
      message: error.message
    });
  }
};

// Get single patient
const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await Patient.findById(patientId)
      .populate('userId', 'username email name avatar lastLogin')
      .populate('primaryCarePhysician', 'firstName lastName specialty contactInfo')
      .populate('assignedDoctors', 'firstName lastName specialty')
      .populate({
        path: 'appointments',
        options: { limit: 5, sort: { dateTime: -1 } },
        populate: { path: 'doctor', select: 'firstName lastName' }
      })
      .populate({
        path: 'medicalRecords',
        options: { limit: 5, sort: { visitDate: -1 } },
        populate: { path: 'doctor', select: 'firstName lastName' }
      });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    // Get summary statistics
    const [appointmentCount, recordCount, prescriptionCount, labOrderCount] = await Promise.all([
      Appointment.countDocuments({ patient: patientId }),
      MedicalRecord.countDocuments({ patient: patientId }),
      Prescription.countDocuments({ patient: patientId }),
      LabOrder.countDocuments({ patient: patientId })
    ]);
    
    res.json({
      success: true,
      data: {
        patient,
        statistics: {
          totalAppointments: appointmentCount,
          totalMedicalRecords: recordCount,
          totalPrescriptions: prescriptionCount,
          totalLabOrders: labOrderCount
        }
      }
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      error: 'Failed to get patient',
      message: error.message
    });
  }
};

// Update patient
const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = req.body;
    
    // Remove immutable fields
    delete updates._id;
    delete updates.userId;
    delete updates.patientId;
    delete updates.createdAt;
    
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'username email name');
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      error: 'Failed to update patient',
      message: error.message
    });
  }
};

// Delete patient
const deletePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Soft delete - mark as inactive
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { isActive: false },
      { new: true }
    );
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    // Also deactivate user account
    if (patient.userId) {
      await User.findByIdAndUpdate(patient.userId, { isActive: false });
    }
    
    res.json({
      success: true,
      message: 'Patient deactivated successfully'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      error: 'Failed to delete patient',
      message: error.message
    });
  }
};

// Get patient medical history
const getPatientMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      type
    } = req.query;
    
    const filter = { patient: patientId };
    
    if (startDate || endDate) {
      filter.visitDate = {};
      if (startDate) filter.visitDate.$gte = new Date(startDate);
      if (endDate) filter.visitDate.$lte = new Date(endDate);
    }
    
    if (type) filter.visitType = type;
    
    const skip = (page - 1) * limit;
    
    const [records, total] = await Promise.all([
      MedicalRecord.find(filter)
        .populate('doctor', 'firstName lastName specialty')
        .populate('appointment', 'appointmentId dateTime')
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalRecord.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({
      error: 'Failed to get medical history',
      message: error.message
    });
  }
};

// Get patient appointments
const getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      upcoming
    } = req.query;
    
    const filter = { patient: patientId };
    
    if (status) filter.status = status;
    
    if (upcoming === 'true') {
      filter.dateTime = { $gte: new Date() };
    } else if (startDate || endDate) {
      filter.dateTime = {};
      if (startDate) filter.dateTime.$gte = new Date(startDate);
      if (endDate) filter.dateTime.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    const sort = upcoming === 'true' ? { dateTime: 1 } : { dateTime: -1 };
    
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('doctor', 'firstName lastName specialty contactInfo')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({
      error: 'Failed to get appointments',
      message: error.message
    });
  }
};

// Get patient prescriptions
const getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      active
    } = req.query;
    
    const filter = { patient: patientId };
    
    if (status) filter.status = status;
    if (active === 'true') {
      filter.status = 'active';
      filter.expiryDate = { $gte: new Date() };
    }
    
    const skip = (page - 1) * limit;
    
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate('doctor', 'firstName lastName specialty')
        .populate('appointment', 'appointmentId dateTime')
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
    console.error('Get patient prescriptions error:', error);
    res.status(500).json({
      error: 'Failed to get prescriptions',
      message: error.message
    });
  }
};

// Get patient lab orders
const getPatientLabOrders = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      priority
    } = req.query;
    
    const filter = { patient: patientId };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    const skip = (page - 1) * limit;
    
    const [labOrders, total] = await Promise.all([
      LabOrder.find(filter)
        .populate('doctor', 'firstName lastName specialty')
        .populate('appointment', 'appointmentId dateTime')
        .sort({ orderDate: -1 })
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
    console.error('Get patient lab orders error:', error);
    res.status(500).json({
      error: 'Failed to get lab orders',
      message: error.message
    });
  }
};

// Add allergy
const addAllergy = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { allergen, severity, reaction } = req.body;
    
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    // Check if allergy already exists
    const existingAllergy = patient.medicalHistory.allergies.find(
      a => a.allergen.toLowerCase() === allergen.toLowerCase()
    );
    
    if (existingAllergy) {
      return res.status(400).json({
        error: 'Duplicate',
        message: 'Allergy already recorded'
      });
    }
    
    patient.medicalHistory.allergies.push({
      allergen,
      severity,
      reaction
    });
    
    await patient.save();
    
    res.json({
      success: true,
      message: 'Allergy added successfully',
      data: patient.medicalHistory.allergies
    });
  } catch (error) {
    console.error('Add allergy error:', error);
    res.status(500).json({
      error: 'Failed to add allergy',
      message: error.message
    });
  }
};

// Update vital signs
const updateVitalSigns = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { height, weight } = req.body;
    
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    if (height) {
      patient.vitalSigns.height = {
        ...height,
        lastUpdated: new Date()
      };
    }
    
    if (weight) {
      patient.vitalSigns.weight = {
        ...weight,
        lastUpdated: new Date()
      };
    }
    
    // Calculate BMI if both height and weight are present
    if (patient.vitalSigns.height.value && patient.vitalSigns.weight.value) {
      patient.calculateBMI();
    }
    
    await patient.save();
    
    res.json({
      success: true,
      message: 'Vital signs updated successfully',
      data: patient.vitalSigns
    });
  } catch (error) {
    console.error('Update vital signs error:', error);
    res.status(500).json({
      error: 'Failed to update vital signs',
      message: error.message
    });
  }
};

// Add note
const addNote = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { note } = req.body;
    
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    await patient.addNote(note, req.user._id);
    
    res.json({
      success: true,
      message: 'Note added successfully',
      data: patient.notes[patient.notes.length - 1]
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      error: 'Failed to add note',
      message: error.message
    });
  }
};

// Assign doctor
const assignDoctor = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { doctorId, isPrimary } = req.body;
    
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    if (isPrimary) {
      patient.primaryCarePhysician = doctorId;
    } else {
      // Add to assigned doctors if not already present
      if (!patient.assignedDoctors.includes(doctorId)) {
        patient.assignedDoctors.push(doctorId);
      }
    }
    
    // Add patient to doctor's patient list
    if (!doctor.patients.includes(patientId)) {
      doctor.patients.push(patientId);
      await doctor.save();
    }
    
    await patient.save();
    
    await patient.populate('primaryCarePhysician assignedDoctors', 'firstName lastName specialty');
    
    res.json({
      success: true,
      message: `Doctor ${isPrimary ? 'assigned as primary care physician' : 'assigned'} successfully`,
      data: {
        primaryCarePhysician: patient.primaryCarePhysician,
        assignedDoctors: patient.assignedDoctors
      }
    });
  } catch (error) {
    console.error('Assign doctor error:', error);
    res.status(500).json({
      error: 'Failed to assign doctor',
      message: error.message
    });
  }
};

// Get patient summary
const getPatientSummary = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await Patient.findById(patientId)
      .select('firstName lastName dateOfBirth gender bloodGroup vitalSigns medicalHistory')
      .populate('primaryCarePhysician', 'firstName lastName specialty');
    
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    // Get recent data
    const [
      recentAppointments,
      activePrescriptions,
      pendingLabOrders,
      lastMedicalRecord
    ] = await Promise.all([
      Appointment.find({ 
        patient: patientId,
        dateTime: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .limit(3)
      .sort({ dateTime: 1 })
      .populate('doctor', 'firstName lastName'),
      
      Prescription.find({
        patient: patientId,
        status: 'active',
        expiryDate: { $gte: new Date() }
      })
      .limit(5)
      .select('prescriptionId medicationDetails issueDate'),
      
      LabOrder.find({
        patient: patientId,
        status: { $in: ['ordered', 'specimen-collected', 'in-progress'] }
      })
      .limit(5)
      .select('labOrderId testsRequested orderDate priority'),
      
      MedicalRecord.findOne({ patient: patientId })
        .sort({ visitDate: -1 })
        .select('visitDate visitType assessment.diagnosis')
        .populate('doctor', 'firstName lastName')
    ]);
    
    res.json({
      success: true,
      data: {
        patient,
        summary: {
          age: patient.age,
          bmi: patient.vitalSigns.bmi?.value,
          allergiesCount: patient.medicalHistory.allergies.length,
          chronicConditionsCount: patient.medicalHistory.chronicConditions.length,
          upcomingAppointments: recentAppointments,
          activePrescriptions,
          pendingLabOrders,
          lastVisit: lastMedicalRecord
        }
      }
    });
  } catch (error) {
    console.error('Get patient summary error:', error);
    res.status(500).json({
      error: 'Failed to get patient summary',
      message: error.message
    });
  }
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientMedicalHistory,
  getPatientAppointments,
  getPatientPrescriptions,
  getPatientLabOrders,
  addAllergy,
  updateVitalSigns,
  addNote,
  assignDoctor,
  getPatientSummary
};