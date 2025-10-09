const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');

// Create appointment
const createAppointment = async (req, res) => {
  try {
    const appointmentData = {
      ...req.body,
      createdBy: req.user._id
    };
    
    // Verify patient exists
    const patient = await Patient.findById(appointmentData.patient);
    if (!patient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Patient not found'
      });
    }
    
    // Verify doctor exists
    const doctor = await Doctor.findById(appointmentData.doctor);
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    // Check for appointment conflicts
    const conflict = await Appointment.checkConflict(
      appointmentData.doctor,
      new Date(appointmentData.dateTime),
      appointmentData.duration?.scheduled || 30
    );
    
    if (conflict) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This time slot is already booked'
      });
    }
    
    // Check if appointment is within doctor's working hours
    const appointmentDate = new Date(appointmentData.dateTime);
    const availableSlots = doctor.getAvailableSlots(appointmentDate);
    
    if (availableSlots.length === 0) {
      return res.status(400).json({
        error: 'Invalid Time',
        message: 'Doctor is not available at this time'
      });
    }
    
    // Create appointment
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    // Add appointment to patient and doctor records
    patient.appointments.push(appointment._id);
    doctor.appointments.push(appointment._id);
    doctor.stats.totalAppointments++;
    
    await Promise.all([patient.save(), doctor.save()]);
    
    // Populate references
    await appointment.populate([
      { path: 'patient', select: 'firstName lastName patientId' },
      { path: 'doctor', select: 'firstName lastName specialty' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      error: 'Failed to create appointment',
      message: error.message
    });
  }
};

// Get all appointments
const getAllAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      startDate,
      endDate,
      doctor: doctorId,
      patient: patientId
    } = req.query;
    
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'doctor' && req.doctor) {
      filter.doctor = req.doctor._id;
    } else if (req.user.role === 'patient' && req.patient) {
      filter.patient = req.patient._id;
    }
    
    // Apply query filters
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (doctorId && req.user.role === 'admin') filter.doctor = doctorId;
    if (patientId && (req.user.role === 'admin' || req.user.role === 'doctor')) {
      filter.patient = patientId;
    }
    
    if (startDate || endDate) {
      filter.dateTime = {};
      if (startDate) filter.dateTime.$gte = new Date(startDate);
      if (endDate) filter.dateTime.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patient', 'firstName lastName patientId dateOfBirth')
        .populate('doctor', 'firstName lastName specialty')
        .sort({ dateTime: -1 })
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
    console.error('Get appointments error:', error);
    res.status(500).json({
      error: 'Failed to get appointments',
      message: error.message
    });
  }
};

// Get single appointment
const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'firstName lastName patientId dateOfBirth gender contactInfo')
      .populate('doctor', 'firstName lastName specialty contactInfo')
      .populate('prescriptions')
      .populate('labOrders')
      .populate('createdBy', 'name email');
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      error: 'Failed to get appointment',
      message: error.message
    });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updates = req.body;
    
    // Remove immutable fields
    delete updates._id;
    delete updates.appointmentId;
    delete updates.patient;
    delete updates.doctor;
    delete updates.createdAt;
    delete updates.createdBy;
    
    // If updating dateTime, check for conflicts
    if (updates.dateTime) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Appointment not found'
        });
      }
      
      const conflict = await Appointment.checkConflict(
        appointment.doctor,
        new Date(updates.dateTime),
        updates.duration?.scheduled || appointment.duration.scheduled || 30,
        appointmentId
      );
      
      if (conflict) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This time slot is already booked'
        });
      }
    }
    
    updates.lastModifiedBy = req.user._id;
    
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updates,
      { new: true, runValidators: true }
    ).populate('patient doctor', 'firstName lastName');
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      error: 'Failed to update appointment',
      message: error.message
    });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason, reschedule } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        error: 'Cannot Cancel',
        message: 'This appointment cannot be cancelled. Appointments must be cancelled at least 24 hours in advance.'
      });
    }
    
    await appointment.cancelAppointment(req.user._id, reason, reschedule);
    
    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      error: 'Failed to cancel appointment',
      message: error.message
    });
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDateTime, reason } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (!appointment.canBeRescheduled()) {
      return res.status(400).json({
        error: 'Cannot Reschedule',
        message: 'This appointment cannot be rescheduled. Appointments must be rescheduled at least 24 hours in advance.'
      });
    }
    
    // Check for conflicts with new time
    const conflict = await Appointment.checkConflict(
      appointment.doctor,
      new Date(newDateTime),
      appointment.duration.scheduled || 30
    );
    
    if (conflict) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'The new time slot is already booked'
      });
    }
    
    // Create new appointment
    const newAppointment = new Appointment({
      patient: appointment.patient,
      doctor: appointment.doctor,
      dateTime: newDateTime,
      type: appointment.type,
      priority: appointment.priority,
      reason: appointment.reason,
      duration: appointment.duration,
      createdBy: req.user._id,
      notes: {
        internalNotes: `Rescheduled from ${appointment.dateTime}. Reason: ${reason}`
      }
    });
    
    await newAppointment.save();
    
    // Cancel old appointment
    await appointment.cancelAppointment(req.user._id, `Rescheduled to ${newDateTime}`, true);
    appointment.cancellation.newAppointmentId = newAppointment._id;
    await appointment.save();
    
    await newAppointment.populate('patient doctor', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        oldAppointment: appointment,
        newAppointment
      }
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({
      error: 'Failed to reschedule appointment',
      message: error.message
    });
  }
};

// Check in patient
const checkInPatient = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Only scheduled appointments can be checked in'
      });
    }
    
    await appointment.checkInPatient(req.user._id);
    
    res.json({
      success: true,
      message: 'Patient checked in successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({
      error: 'Failed to check in patient',
      message: error.message
    });
  }
};

// Check out patient
const checkOutPatient = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (!appointment.checkIn.time) {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Patient must be checked in first'
      });
    }
    
    await appointment.checkOutPatient(req.user._id);
    
    res.json({
      success: true,
      message: 'Patient checked out successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      error: 'Failed to check out patient',
      message: error.message
    });
  }
};

// Record vitals
const recordVitals = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const vitals = req.body.vitalsRecorded;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    appointment.vitalsRecorded = {
      ...vitals,
      recordedAt: new Date(),
      recordedBy: req.user._id
    };
    
    await appointment.save();
    
    // Also update patient's vital signs
    const patient = await Patient.findById(appointment.patient);
    if (patient) {
      if (vitals.height) {
        patient.vitalSigns.height = {
          value: vitals.height.value,
          unit: vitals.height.unit,
          lastUpdated: new Date()
        };
      }
      if (vitals.weight) {
        patient.vitalSigns.weight = {
          value: vitals.weight.value,
          unit: vitals.weight.unit,
          lastUpdated: new Date()
        };
      }
      patient.calculateBMI();
      await patient.save();
    }
    
    res.json({
      success: true,
      message: 'Vitals recorded successfully',
      data: appointment.vitalsRecorded
    });
  } catch (error) {
    console.error('Record vitals error:', error);
    res.status(500).json({
      error: 'Failed to record vitals',
      message: error.message
    });
  }
};

// Add diagnosis
const addDiagnosis = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { diagnosis } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only doctors can add diagnosis'
      });
    }
    
    appointment.diagnosis = diagnosis;
    await appointment.save();
    
    res.json({
      success: true,
      message: 'Diagnosis added successfully',
      data: appointment.diagnosis
    });
  } catch (error) {
    console.error('Add diagnosis error:', error);
    res.status(500).json({
      error: 'Failed to add diagnosis',
      message: error.message
    });
  }
};

// Complete appointment
const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { notes, diagnosis, followUp } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only doctors can complete appointments'
      });
    }
    
    if (notes) appointment.notes.doctorNotes = notes;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (followUp) appointment.followUp = followUp;
    
    appointment.status = 'completed';
    
    // If patient was checked in, check them out
    if (appointment.checkIn.time && !appointment.checkOut.time) {
      await appointment.checkOutPatient(req.user._id);
    }
    
    await appointment.save();
    
    // Create medical record
    const medicalRecord = new MedicalRecord({
      patient: appointment.patient,
      doctor: appointment.doctor,
      appointment: appointment._id,
      visitDate: appointment.dateTime,
      visitType: appointment.type,
      chiefComplaint: appointment.reason,
      assessment: {
        diagnosis: appointment.diagnosis,
        clinicalImpression: notes
      },
      physicalExamination: {
        vitalSigns: appointment.vitalsRecorded
      }
    });
    
    await medicalRecord.save();
    
    res.json({
      success: true,
      message: 'Appointment completed successfully',
      data: {
        appointment,
        medicalRecord: medicalRecord._id
      }
    });
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({
      error: 'Failed to complete appointment',
      message: error.message
    });
  }
};

// Get appointment summary
const getAppointmentSummary = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    const filter = {};
    const now = new Date();
    
    // Role-based filtering
    if (req.user.role === 'doctor' && req.doctor) {
      filter.doctor = req.doctor._id;
    } else if (req.user.role === 'patient' && req.patient) {
      filter.patient = req.patient._id;
    }
    
    // Period filtering
    switch (period) {
      case 'today':
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        filter.dateTime = { $gte: startOfDay, $lte: endOfDay };
        break;
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        filter.dateTime = { $gte: startOfWeek };
        break;
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filter.dateTime = { $gte: startOfMonth };
        break;
    }
    
    const [
      scheduled,
      confirmed,
      completed,
      cancelled,
      noShow
    ] = await Promise.all([
      Appointment.countDocuments({ ...filter, status: 'scheduled' }),
      Appointment.countDocuments({ ...filter, status: 'confirmed' }),
      Appointment.countDocuments({ ...filter, status: 'completed' }),
      Appointment.countDocuments({ ...filter, status: 'cancelled' }),
      Appointment.countDocuments({ ...filter, status: 'no-show' })
    ]);
    
    const total = scheduled + confirmed + completed + cancelled + noShow;
    
    res.json({
      success: true,
      data: {
        period,
        summary: {
          total,
          scheduled,
          confirmed,
          completed,
          cancelled,
          noShow
        },
        percentages: {
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
          noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get appointment summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: error.message
    });
  }
};

// Search appointments
const searchAppointments = async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 10
    } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Invalid Search',
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const filter = {
      $or: [
        { appointmentId: { $regex: q, $options: 'i' } },
        { reason: { $regex: q, $options: 'i' } },
        { 'notes.patientNotes': { $regex: q, $options: 'i' } },
        { 'notes.doctorNotes': { $regex: q, $options: 'i' } }
      ]
    };
    
    // Role-based filtering
    if (req.user.role === 'doctor' && req.doctor) {
      filter.doctor = req.doctor._id;
    } else if (req.user.role === 'patient' && req.patient) {
      filter.patient = req.patient._id;
    }
    
    const skip = (page - 1) * limit;
    
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName specialty')
        .sort({ dateTime: -1 })
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
    console.error('Search appointments error:', error);
    res.status(500).json({
      error: 'Failed to search appointments',
      message: error.message
    });
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  checkInPatient,
  checkOutPatient,
  recordVitals,
  addDiagnosis,
  completeAppointment,
  getAppointmentSummary,
  searchAppointments
};