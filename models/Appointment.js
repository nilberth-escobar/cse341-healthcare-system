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
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    await appointment.populate(['patient', 'doctor', 'createdBy']);
    
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while creating the appointment'
    });
  }
};

// Get all appointments with filters
const getAllAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      patient,
      doctor,
      startDate,
      endDate,
      sortBy = 'dateTime',
      sortOrder = 'asc'
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (patient) query.patient = patient;
    if (doctor) query.doctor = doctor;
    
    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) query.dateTime.$gte = new Date(startDate);
      if (endDate) query.dateTime.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName specialization email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Appointment.countDocuments(query);
    
    res.json({
      appointments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while fetching appointments'
    });
  }
};

// Get single appointment
const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('medicalRecord')
      .populate('createdBy', 'name email');
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    res.json({ appointment });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid appointment ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while fetching the appointment'
    });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    // Check if appointment can be modified
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: `Cannot update ${appointment.status} appointment`
      });
    }
    
    // If changing date/time or doctor, check for conflicts
    if (req.body.dateTime || req.body.doctor || req.body.duration) {
      const doctorId = req.body.doctor || appointment.doctor;
      const dateTime = req.body.dateTime ? new Date(req.body.dateTime) : appointment.dateTime;
      const duration = req.body.duration?.scheduled || appointment.duration.scheduled;
      
      const conflict = await Appointment.checkConflict(
        doctorId,
        dateTime,
        duration,
        appointment._id
      );
      
      if (conflict) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This time slot is already booked'
        });
      }
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'appointmentId') {
        appointment[key] = req.body[key];
      }
    });
    
    appointment.updatedAt = Date.now();
    await appointment.save();
    
    await appointment.populate(['patient', 'doctor', 'createdBy']);
    
    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while updating the appointment'
    });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    // Check if appointment can be deleted
    if (appointment.status === 'completed') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Cannot delete completed appointment'
      });
    }
    
    await Appointment.findByIdAndDelete(req.params.id);
    
    res.json({
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid appointment ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while deleting the appointment'
    });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (appointment.status === 'completed') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Cannot cancel completed appointment'
      });
    }
    
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Appointment is already cancelled'
      });
    }
    
    appointment.status = 'cancelled';
    appointment.cancellation = {
      cancelledAt: Date.now(),
      cancelledBy: req.user._id,
      reason: req.body.reason || 'Not specified'
    };
    
    await appointment.save();
    await appointment.populate(['patient', 'doctor', 'createdBy']);
    
    res.json({
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while cancelling the appointment'
    });
  }
};

// Check-in appointment
const checkInAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: `Cannot check-in ${appointment.status} appointment`
      });
    }
    
    appointment.status = 'checked-in';
    appointment.checkIn = {
      time: Date.now(),
      checkedInBy: req.user._id
    };
    
    await appointment.save();
    await appointment.populate(['patient', 'doctor', 'createdBy']);
    
    res.json({
      message: 'Patient checked in successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred during check-in'
    });
  }
};

// Start appointment
const startAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (appointment.status !== 'checked-in') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Patient must be checked in before starting appointment'
      });
    }
    
    appointment.status = 'in-progress';
    appointment.duration.actual = {
      start: Date.now()
    };
    
    await appointment.save();
    await appointment.populate(['patient', 'doctor', 'createdBy']);
    
    res.json({
      message: 'Appointment started successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while starting the appointment'
    });
  }
};

// Complete appointment
const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    if (appointment.status !== 'in-progress') {
      return res.status(400).json({
        error: 'Invalid Operation',
        message: 'Appointment must be in progress to complete'
      });
    }
    
    appointment.status = 'completed';
    
    if (appointment.duration.actual && appointment.duration.actual.start) {
      appointment.duration.actual.end = Date.now();
    }
    
    if (req.body.notes) {
      appointment.notes = req.body.notes;
    }
    
    await appointment.save();
    await appointment.populate(['patient', 'doctor', 'createdBy']);
    
    res.json({
      message: 'Appointment completed successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while completing the appointment'
    });
  }
};

// Get appointments by patient
const getAppointmentsByPatient = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { patient: req.params.patientId };
    
    if (status) query.status = status;
    
    const skip = (page - 1) * limit;
    
    const appointments = await Appointment.find(query)
      .populate('doctor', 'firstName lastName specialization')
      .populate('createdBy', 'name email')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Appointment.countDocuments(query);
    
    res.json({
      appointments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while fetching appointments'
    });
  }
};

// Get appointments by doctor
const getAppointmentsByDoctor = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    const query = { doctor: req.params.doctorId };
    
    if (status) query.status = status;
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.dateTime = { $gte: startOfDay, $lte: endOfDay };
    }
    
    const skip = (page - 1) * limit;
    
    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('createdBy', 'name email')
      .sort({ dateTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Appointment.countDocuments(query);
    
    res.json({
      appointments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while fetching appointments'
    });
  }
};

// Get available time slots for a doctor
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Date is required'
      });
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    const requestedDate = new Date(date);
    const availableSlots = doctor.getAvailableSlots(requestedDate);
    
    // Get existing appointments for this doctor on this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'confirmed', 'checked-in', 'in-progress'] }
    });
    
    // Filter out booked slots
    const bookedSlots = existingAppointments.map(apt => ({
      start: apt.dateTime,
      end: new Date(apt.dateTime.getTime() + apt.duration.scheduled * 60000)
    }));
    
    const freeSlots = availableSlots.filter(slot => {
      return !bookedSlots.some(booked => {
        return (slot.start >= booked.start && slot.start < booked.end) ||
               (slot.end > booked.start && slot.end <= booked.end);
      });
    });
    
    res.json({
      doctor: {
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization
      },
      date: requestedDate.toISOString().split('T')[0],
      availableSlots: freeSlots
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred while fetching available slots'
    });
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  cancelAppointment,
  checkInAppointment,
  startAppointment,
  completeAppointment,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  getAvailableSlots
};