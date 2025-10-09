const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Check for token in cookies
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password -githubAccessToken');
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is deactivated'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is locked due to multiple failed login attempts'
      });
    }
    
    // Attach user to request
    req.user = user;
    
    // Load role-specific profile if exists
    if (user.role === 'doctor') {
      req.doctor = await Doctor.findOne({ userId: user._id });
    } else if (user.role === 'patient') {
      req.patient = await Patient.findOne({ userId: user._id });
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error verifying token'
    });
  }
};

// Check if user is authenticated (for optional auth routes)
const isAuthenticated = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = await User.findById(decoded.id).select('-password -githubAccessToken');
      
      if (req.user && req.user.role === 'doctor') {
        req.doctor = await Doctor.findOne({ userId: req.user._id });
      } else if (req.user && req.user.role === 'patient') {
        req.patient = await Patient.findOne({ userId: req.user._id });
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

// Permission-based access control
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`
      });
    }
    
    next();
  };
};

// Check if user can access patient data
const canAccessPatient = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.body.patient;
    
    if (!patientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Patient ID is required'
      });
    }
    
    // Admins can access all patients
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Patients can only access their own data
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || patient._id.toString() !== patientId.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own patient data'
        });
      }
      return next();
    }
    
    // Doctors can access their assigned patients
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      const patient = await Patient.findById(patientId);
      
      if (!patient) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Patient not found'
        });
      }
      
      // Check if doctor is assigned to patient or is primary care physician
      const isAssigned = patient.assignedDoctors.some(d => d.toString() === doctor._id.toString());
      const isPrimary = patient.primaryCarePhysician && patient.primaryCarePhysician.toString() === doctor._id.toString();
      
      if (!isAssigned && !isPrimary) {
        // Check if doctor has any appointments with this patient
        const Appointment = require('../models/Appointment');
        const hasAppointment = await Appointment.findOne({
          doctor: doctor._id,
          patient: patient._id
        });
        
        if (!hasAppointment) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You are not authorized to access this patient\'s data'
          });
        }
      }
      
      return next();
    }
    
    // Lab technicians and receptionists have limited access
    if (req.user.role === 'lab_technician' || req.user.role === 'receptionist') {
      // They can view basic patient info but not modify
      if (req.method !== 'GET') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only view patient data'
        });
      }
      return next();
    }
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error checking patient access'
    });
  }
};

// Check if user can access doctor data
const canAccessDoctor = async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId || req.body.doctor;
    
    if (!doctorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Doctor ID is required'
      });
    }
    
    // Everyone can view doctor profiles (GET)
    if (req.method === 'GET') {
      return next();
    }
    
    // Only admins and the doctor themselves can modify
    if (req.user.role === 'admin') {
      return next();
    }
    
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor._id.toString() !== doctorId.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only modify your own profile'
        });
      }
      return next();
    }
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error checking doctor access'
    });
  }
};

// Check if user can access appointment
const canAccessAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.appointmentId;
    const Appointment = require('../models/Appointment');
    
    if (!appointmentId) {
      // For creating appointments, check if user can book for the patient
      if (req.method === 'POST') {
        return canAccessPatient(req, res, next);
      }
      return next();
    }
    
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }
    
    // Admins can access all appointments
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user is the patient
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (appointment.patient.toString() !== patient._id.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own appointments'
        });
      }
      return next();
    }
    
    // Check if user is the doctor
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (appointment.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own appointments'
        });
      }
      return next();
    }
    
    // Receptionists can view and update appointment status
    if (req.user.role === 'receptionist') {
      return next();
    }
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error checking appointment access'
    });
  }
};

// Check if user can access medical records
const canAccessMedicalRecord = async (req, res, next) => {
  try {
    const recordId = req.params.recordId;
    const MedicalRecord = require('../models/MedicalRecord');
    
    if (recordId) {
      const record = await MedicalRecord.findById(recordId);
      
      if (!record) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Medical record not found'
        });
      }
      
      // Check if record is restricted
      if (record.access.isRestricted && req.user.role !== 'admin') {
        // Check if user has been granted access
        const hasAccess = record.access.sharedWith.some(
          share => share.user.toString() === req.user._id.toString() &&
                  (!share.expiryDate || share.expiryDate > new Date())
        );
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'This medical record is restricted'
          });
        }
      }
      
      req.medicalRecord = record;
    }
    
    // Use patient access control
    return canAccessPatient(req, res, next);
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error checking medical record access'
    });
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }
    
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    
    if (!tokenExists) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new access token
    const newAccessToken = user.generateAuthToken();
    
    res.json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token'
      });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error refreshing token'
    });
  }
};

// Rate limiting for sensitive operations
const rateLimitSensitive = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = `${req.ip}_${req.user ? req.user._id : 'anonymous'}`;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }
    
    const userAttempts = attempts.get(key).filter(timestamp => now - timestamp < windowMs);
    
    if (userAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    next();
  };
};

module.exports = {
  verifyToken,
  isAuthenticated,
  authorize,
  requirePermission,
  canAccessPatient,
  canAccessDoctor,
  canAccessAppointment,
  canAccessMedicalRecord,
  refreshToken,
  rateLimitSensitive
};