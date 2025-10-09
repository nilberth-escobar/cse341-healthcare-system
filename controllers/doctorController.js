const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');

// Create new doctor
const createDoctor = async (req, res) => {
  try {
    const doctorData = req.body;
    
    // Check if user exists
    if (doctorData.userId) {
      const user = await User.findById(doctorData.userId);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      // Check if doctor profile already exists
      const existingDoctor = await Doctor.findOne({ userId: doctorData.userId });
      if (existingDoctor) {
        return res.status(400).json({
          error: 'Duplicate',
          message: 'Doctor profile already exists for this user'
        });
      }
    } else {
      // Create user account if not exists
      const user = new User({
        username: doctorData.contactInfo.email.split('@')[0] + Date.now(),
        email: doctorData.contactInfo.email,
        name: `${doctorData.firstName} ${doctorData.lastName}`,
        role: 'doctor',
        password: Math.random().toString(36).slice(-8) // Temporary password
      });
      await user.save();
      doctorData.userId = user._id;
    }
    
    // Create doctor
    const doctor = new Doctor(doctorData);
    await doctor.save();
    
    // Populate user info
    await doctor.populate('userId', 'username email name');
    
    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({
      error: 'Failed to create doctor',
      message: error.message
    });
  }
};

// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      specialty,
      isActive,
      isAcceptingNewPatients
    } = req.query;
    
    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { doctorId: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (specialty) filter.specialty = specialty;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isAcceptingNewPatients !== undefined) filter.isAcceptingNewPatients = isAcceptingNewPatients === 'true';
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .populate('userId', 'username email name avatar')
        .select('-patients') // Exclude patient list for privacy
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Doctor.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: doctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      error: 'Failed to get doctors',
      message: error.message
    });
  }
};

// Get single doctor
const getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const doctor = await Doctor.findById(doctorId)
      .populate('userId', 'username email name avatar lastLogin')
      .populate({
        path: 'patients',
        select: 'firstName lastName patientId',
        options: { limit: 10 }
      });
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    // Get statistics
    const [appointmentCount, patientCount, avgRating] = await Promise.all([
      Appointment.countDocuments({ doctor: doctorId }),
      Patient.countDocuments({ 
        $or: [
          { primaryCarePhysician: doctorId },
          { assignedDoctors: doctorId }
        ]
      }),
      doctor.ratings.average
    ]);
    
    res.json({
      success: true,
      data: {
        doctor,
        statistics: {
          totalAppointments: appointmentCount,
          totalPatients: patientCount,
          averageRating: avgRating,
          reviewCount: doctor.ratings.count
        }
      }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      error: 'Failed to get doctor',
      message: error.message
    });
  }
};

// Update doctor
const updateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const updates = req.body;
    
    // Remove immutable fields
    delete updates._id;
    delete updates.userId;
    delete updates.doctorId;
    delete updates.createdAt;
    delete updates.ratings;
    delete updates.stats;
    
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'username email name');
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      error: 'Failed to update doctor',
      message: error.message
    });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    // Soft delete - mark as inactive
    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { isActive: false },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    // Also deactivate user account
    if (doctor.userId) {
      await User.findByIdAndUpdate(doctor.userId, { isActive: false });
    }
    
    res.json({
      success: true,
      message: 'Doctor deactivated successfully'
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({
      error: 'Failed to delete doctor',
      message: error.message
    });
  }
};

// Get doctor availability
const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, month } = req.query;
    
    const doctor = await Doctor.findById(doctorId)
      .select('availability consultationDuration bufferTime');
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    if (date) {
      // Get availability for specific date
      const requestedDate = new Date(date);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()];
      
      // Check if doctor works on this day
      const daySchedule = doctor.availability.schedule.find(s => s.dayOfWeek === dayOfWeek);
      
      if (!daySchedule) {
        return res.json({
          success: true,
          data: {
            date: requestedDate,
            available: false,
            slots: []
          }
        });
      }
      
      // Check for vacation
      const isOnVacation = doctor.availability.vacations.some(vacation => {
        return requestedDate >= vacation.startDate && requestedDate <= vacation.endDate;
      });
      
      if (isOnVacation) {
        return res.json({
          success: true,
          data: {
            date: requestedDate,
            available: false,
            reason: 'Doctor is on vacation',
            slots: []
          }
        });
      }
      
      // Get booked appointments for this date
      const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));
      
      const bookedAppointments = await Appointment.find({
        doctor: doctorId,
        dateTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['scheduled', 'confirmed'] }
      }).select('dateTime duration');
      
      // Generate available slots
      const availableSlots = [];
      daySchedule.slots.forEach(slot => {
        if (!slot.isAvailable) return;
        
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        let currentTime = new Date(requestedDate);
        currentTime.setHours(startHour, startMinute, 0, 0);
        
        const slotEnd = new Date(requestedDate);
        slotEnd.setHours(endHour, endMinute, 0, 0);
        
        while (currentTime < slotEnd) {
          const slotStart = new Date(currentTime);
          const slotEndTime = new Date(currentTime.getTime() + doctor.consultationDuration * 60000);
          
          // Check if slot is booked
          const isBooked = bookedAppointments.some(apt => {
            const aptEnd = new Date(apt.dateTime.getTime() + (apt.duration?.scheduled || 30) * 60000);
            return (slotStart >= apt.dateTime && slotStart < aptEnd) ||
                   (slotEndTime > apt.dateTime && slotEndTime <= aptEnd);
          });
          
          if (!isBooked && slotEndTime <= slotEnd) {
            availableSlots.push({
              start: slotStart,
              end: slotEndTime,
              duration: doctor.consultationDuration
            });
          }
          
          currentTime = new Date(currentTime.getTime() + (doctor.consultationDuration + doctor.bufferTime) * 60000);
        }
      });
      
      res.json({
        success: true,
        data: {
          date: requestedDate,
          available: availableSlots.length > 0,
          slots: availableSlots
        }
      });
    } else if (month) {
      // Get availability for entire month
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0);
      
      const monthAvailability = [];
      
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
        const daySchedule = doctor.availability.schedule.find(s => s.dayOfWeek === dayOfWeek);
        
        const isOnVacation = doctor.availability.vacations.some(vacation => {
          return d >= vacation.startDate && d <= vacation.endDate;
        });
        
        monthAvailability.push({
          date: new Date(d),
          available: daySchedule && !isOnVacation && daySchedule.slots.some(s => s.isAvailable)
        });
      }
      
      res.json({
        success: true,
        data: {
          month: `${year}-${monthNum.toString().padStart(2, '0')}`,
          availability: monthAvailability
        }
      });
    } else {
      // Return general availability schedule
      res.json({
        success: true,
        data: doctor.availability
      });
    }
  } catch (error) {
    console.error('Get doctor availability error:', error);
    res.status(500).json({
      error: 'Failed to get availability',
      message: error.message
    });
  }
};

// Update doctor availability
const updateDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { schedule, vacations, consultationDuration, bufferTime } = req.body;
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    if (schedule) doctor.availability.schedule = schedule;
    if (vacations) doctor.availability.vacations = vacations;
    if (consultationDuration) doctor.availability.consultationDuration = consultationDuration;
    if (bufferTime !== undefined) doctor.availability.bufferTime = bufferTime;
    
    await doctor.save();
    
    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: doctor.availability
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      error: 'Failed to update availability',
      message: error.message
    });
  }
};

// Get doctor patients
const getDoctorPatients = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const {
      page = 1,
      limit = 10,
      search
    } = req.query;
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    const filter = {
      $or: [
        { primaryCarePhysician: doctorId },
        { assignedDoctors: doctorId }
      ]
    };
    
    if (search) {
      filter.$and = [
        filter.$or,
        {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { patientId: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete filter.$or;
    }
    
    const skip = (page - 1) * limit;
    
    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .select('patientId firstName lastName dateOfBirth gender contactInfo.phone lastVisit')
        .sort({ lastName: 1, firstName: 1 })
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
    console.error('Get doctor patients error:', error);
    res.status(500).json({
      error: 'Failed to get patients',
      message: error.message
    });
  }
};

// Get doctor appointments
const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const {
      page = 1,
      limit = 10,
      date,
      startDate,
      endDate,
      status
    } = req.query;
    
    const filter = { doctor: doctorId };
    
    if (status) filter.status = status;
    
    if (date) {
      const requestedDate = new Date(date);
      const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));
      filter.dateTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate || endDate) {
      filter.dateTime = {};
      if (startDate) filter.dateTime.$gte = new Date(startDate);
      if (endDate) filter.dateTime.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patient', 'firstName lastName patientId dateOfBirth gender')
        .sort({ dateTime: 1 })
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
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      error: 'Failed to get appointments',
      message: error.message
    });
  }
};

// Add doctor review
const addDoctorReview = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { rating, comment } = req.body;
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    // Check if user is a patient
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only patients can review doctors'
      });
    }
    
    // Check if patient has had appointment with this doctor
    const hasAppointment = await Appointment.findOne({
      doctor: doctorId,
      patient: req.patient._id,
      status: 'completed'
    });
    
    if (!hasAppointment) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only review doctors you have visited'
      });
    }
    
    // Check if already reviewed
    const existingReview = doctor.ratings.reviews.find(
      r => r.patient.toString() === req.patient._id.toString()
    );
    
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.date = new Date();
    } else {
      // Add new review
      await doctor.addReview(req.patient._id, rating, comment);
    }
    
    await doctor.save();
    doctor.updateRating();
    await doctor.save();
    
    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        averageRating: doctor.ratings.average,
        totalReviews: doctor.ratings.count
      }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      error: 'Failed to add review',
      message: error.message
    });
  }
};

// Get doctor statistics
const getDoctorStatistics = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { period = 'month' } = req.query;
    
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Get statistics
    const [
      totalPatients,
      newPatients,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalPrescriptions,
      totalRevenue
    ] = await Promise.all([
      Patient.countDocuments({
        $or: [
          { primaryCarePhysician: doctorId },
          { assignedDoctors: doctorId }
        ]
      }),
      Patient.countDocuments({
        $or: [
          { primaryCarePhysician: doctorId },
          { assignedDoctors: doctorId }
        ],
        createdAt: { $gte: startDate }
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        dateTime: { $gte: startDate, $lte: endDate }
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: 'completed',
        dateTime: { $gte: startDate, $lte: endDate }
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: 'cancelled',
        dateTime: { $gte: startDate, $lte: endDate }
      }),
      Prescription.countDocuments({
        doctor: doctorId,
        issueDate: { $gte: startDate, $lte: endDate }
      }),
      Appointment.aggregate([
        {
          $match: {
            doctor: doctorId,
            status: 'completed',
            dateTime: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$billing.totalAmount' }
          }
        }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        patients: {
          total: totalPatients,
          new: newPatients
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          completionRate: totalAppointments > 0 ? 
            Math.round((completedAppointments / totalAppointments) * 100) : 0
        },
        prescriptions: totalPrescriptions,
        revenue: totalRevenue[0]?.total || 0,
        rating: {
          average: doctor.ratings.average,
          count: doctor.ratings.count
        }
      }
    });
  } catch (error) {
    console.error('Get doctor statistics error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
};

// Get specialties list
const getSpecialties = async (req, res) => {
  try {
    const specialties = [
      'General Practice',
      'Cardiology',
      'Dermatology',
      'Emergency Medicine',
      'Family Medicine',
      'Gastroenterology',
      'Hematology',
      'Internal Medicine',
      'Neurology',
      'Obstetrics and Gynecology',
      'Oncology',
      'Ophthalmology',
      'Orthopedics',
      'Otolaryngology',
      'Pathology',
      'Pediatrics',
      'Psychiatry',
      'Pulmonology',
      'Radiology',
      'Surgery',
      'Urology',
      'Anesthesiology',
      'Endocrinology',
      'Nephrology',
      'Rheumatology'
    ];
    
    // Get count of doctors for each specialty
    const specialtyStats = await Promise.all(
      specialties.map(async (specialty) => {
        const count = await Doctor.countDocuments({ 
          specialty,
          isActive: true 
        });
        return { specialty, count };
      })
    );
    
    res.json({
      success: true,
      data: specialtyStats
    });
  } catch (error) {
    console.error('Get specialties error:', error);
    res.status(500).json({
      error: 'Failed to get specialties',
      message: error.message
    });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorAvailability,
  updateDoctorAvailability,
  getDoctorPatients,
  getDoctorAppointments,
  addDoctorReview,
  getDoctorStatistics,
  getSpecialties
};