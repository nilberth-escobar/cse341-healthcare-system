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



// middleware/validationMiddleware.js
const { validationResult, param, query } = require('express-validator');

// Utilidad: Luhn para NPI / checks
function luhnCheck(numStr) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let digit = parseInt(numStr[i], 10);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// DEA: 2 letras + 7 dígitos, con checksum
// Algoritmo: (suma dígitos posiciones impares + 2 * suma dígitos posiciones pares) % 10 === último dígito
function isValidDEANumber(value) {
  const re = /^[A-Z]{2}\d{7}$/i;
  if (!re.test(value)) return false;
  const digits = value.slice(2).split('').map(d => parseInt(d, 10));
  const odd = digits[0] + digits[2] + digits[4];
  const even = digits[1] + digits[3] + digits[5];
  const check = (odd + even * 2) % 10;
  return check === digits[6];
}

// NPI: 10 dígitos. Validación oficial usa Luhn sobre "80840" + 9 dígitos base; el último es el check digit.
// Aquí seguimos la regla estándar aceptada.
function isValidNPINumber(value) {
  const re = /^\d{10}$/;
  if (!re.test(value)) return false;
  const prefix = '80840';
  const payload = prefix + value.slice(0, 9);
  const checkDigit = parseInt(value[9], 10);
  const total = (function () {
    let sum = 0;
    // Luhn con el payload (sin el check digit del NPI original)
    let shouldDouble = true; // porque agregamos el check digit al final, ajustamos inicio
    for (let i = payload.length - 1; i >= 0; i--) {
      let d = parseInt(payload[i], 10);
      if (shouldDouble) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum;
  })();
  const calcCheck = (10 - (total % 10)) % 10;
  return calcCheck === checkDigit;
}

const customValidators = {
  // >= 8 chars, al menos 1 mayúscula, 1 minúscula, 1 número, 1 caracter especial
  isStrongPassword: (value) => {
    if (typeof value !== 'string') return false;
    return /[A-Z]/.test(value) &&
           /[a-z]/.test(value) &&
           /\d/.test(value) &&
           /[^\w\s]/.test(value) &&
           value.length >= 8;
  },

  isPastDate: (value) => {
    const d = new Date(value);
    if (isNaN(d)) return false;
    const today = new Date();
    return d < today;
  },

  isFutureDate: (value) => {
    const d = new Date(value);
    if (isNaN(d)) return false;
    const now = new Date();
    return d > now;
  },

  isValidPhone: (value) => {
    if (typeof value !== 'string') return false;
    // Permite +, espacios, -, (), . y de 7 a 20 caracteres
    return /^\+?[0-9\s\-().]{7,20}$/.test(value);
  },

  isValidZipCode: (value) => {
    if (typeof value !== 'string') return false;
    // Genérico: 3–10 (letras/números/espacio/-)
    return /^[A-Za-z0-9\- ]{3,10}$/.test(value);
  },

  isValidLicenseNumber: (value) => {
    if (typeof value !== 'string') return false;
    return /^[A-Za-z0-9\-]{5,20}$/.test(value);
  },

  isValidNPINumber,

  isValidDEANumber,

  isValidTime: (value) => {
    if (typeof value !== 'string') return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value); // HH:MM 24h
  },

  // Entre ahora y 1 año
  isValidAppointmentDate: (value) => {
    const d = new Date(value);
    if (isNaN(d)) return false;
    const now = new Date();
    const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    return d >= now && d <= oneYear;
  },

  // ICD-10 común: Letra (no U), 2 alfanum, opcional . + 1–4 alfanum
  isValidICD10Code: (value) => {
    if (typeof value !== 'string') return false;
    return /^[A-TV-Z][0-9][0-9A-TV-Z](\.[0-9A-TV-Z]{1,4})?$/.test(value);
  }
};

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        return new Date(value) >= new Date(req.query.startDate);
      }
      return true;
    })
    .withMessage('End date must be after start date')
];

const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`)
];

const validateAppointmentSlot = (req, res, next) => {
  try {
    const { dateTime, newDateTime } = req.body || {};
    const requiresDateValidation = req.method !== 'PUT' || Boolean(dateTime);
    const targetDate = dateTime || newDateTime;

    if (!targetDate) {
      if (!requiresDateValidation) {
        return next();
      }

      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Appointment date and time is required'
      });
    }

    const appointmentDate = new Date(targetDate);

    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid Date',
        message: 'Appointment date and time must be a valid date'
      });
    }

    const now = new Date();
    if (requiresDateValidation && appointmentDate < now) {
      return res.status(400).json({
        error: 'Invalid Time',
        message: 'Appointments must be scheduled for a future time'
      });
    }

    const minutes = appointmentDate.getMinutes();
    if (minutes % 5 !== 0) {
      return res.status(400).json({
        error: 'Invalid Time Slot',
        message: 'Appointment start times must align with 5 minute increments'
      });
    }

    return next();
  } catch (error) {
    console.error('validateAppointmentSlot error:', error);
    return res.status(500).json({
      error: 'Validation Error',
      message: 'Failed to validate appointment slot'
    });
  }
};

// Middleware para devolver errores de express-validator de forma uniforme
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map(e => ({
      field: e.param,
      msg: e.msg
    }))
  });
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
  rateLimitSensitive,
  customValidators,
  validatePagination,
  validateDateRange,
  validateObjectId,
  validateAppointmentSlot,
  handleValidationErrors
};
