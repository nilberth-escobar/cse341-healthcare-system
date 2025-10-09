const { body, param, query, check } = require('express-validator');
const { customValidators } = require('../middleware/validationMiddleware');

// User validation schemas
const userValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
    
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    
    body('role')
      .optional()
      .isIn(['admin', 'doctor', 'patient', 'lab_technician', 'receptionist'])
      .withMessage('Invalid role')
  ],
  
  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail()
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match')
  ]
};

// Patient validation schemas
const patientValidation = {
  create: [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 50 })
      .withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 50 })
      .withMessage('Last name cannot exceed 50 characters'),
    
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Valid date of birth is required')
      .custom(customValidators.isPastDate)
      .withMessage('Date of birth must be in the past'),
    
    body('gender')
      .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
      .withMessage('Invalid gender'),
    
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    
    body('contactInfo.phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid phone number format'),
    
    body('contactInfo.email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    
    body('address.street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),
    
    body('address.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    
    body('address.state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),
    
    body('address.zipCode')
      .trim()
      .custom(customValidators.isValidZipCode)
      .withMessage('Invalid ZIP code'),
    
    body('emergencyContact.name')
      .trim()
      .notEmpty()
      .withMessage('Emergency contact name is required'),
    
    body('emergencyContact.relationship')
      .isIn(['spouse', 'parent', 'child', 'sibling', 'friend', 'other'])
      .withMessage('Invalid relationship'),
    
    body('emergencyContact.phone')
      .trim()
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid emergency contact phone number')
  ],
  
  update: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Last name cannot exceed 50 characters'),
    
    body('contactInfo.phone')
      .optional()
      .trim()
      .custom(customValidators.isValidPhone)
      .withMessage('Invalid phone number format'),
    
    body('contactInfo.email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail()
  ],
  
  addAllergy: [
    body('allergen')
      .trim()
      .notEmpty()
      .withMessage('Allergen is required'),
    
    body('severity')
      .isIn(['mild', 'moderate', 'severe'])
      .withMessage('Invalid severity level'),
    
    body('reaction')
      .trim()
      .notEmpty()
      .withMessage('Reaction description is required')
  ]
};

// Doctor validation schemas
const doctorValidation = {
  create: [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    
    body('specialty')
      .notEmpty()
      .withMessage('Specialty is required')
      .isIn([
        'General Practice', 'Cardiology', 'Dermatology', 'Emergency Medicine',
        'Family Medicine', 'Gastroenterology', 'Hematology', 'Internal Medicine',
        'Neurology', 'Obstetrics and Gynecology', 'Oncology', 'Ophthalmology',
        'Orthopedics', 'Otolaryngology', 'Pathology', 'Pediatrics', 'Psychiatry',
        'Pulmonology', 'Radiology', 'Surgery', 'Urology', 'Anesthesiology',
        'Endocrinology', 'Nephrology', 'Rheumatology'
      ])
      .withMessage('Invalid specialty'),
    
    body('licenseNumber')
      .trim()
      .notEmpty()
      .withMessage('License number is required')
      .custom(customValidators.isValidLicenseNumber)
      .withMessage('Invalid license number format'),
    
    body('licenseState')
      .trim()
      .notEmpty()
      .withMessage('License state is required'),
    
    body('licenseExpiry')
      .isISO8601()
      .withMessage('Valid license expiry date is required')
      .custom(customValidators.isFutureDate)
      .withMessage('License expiry must be in the future'),
    
    body('npiNumber')
      .optional()
      .custom(customValidators.isValidNPINumber)
      .withMessage('Invalid NPI number'),
    
    body('deaNumber')
      .optional()
      .custom(customValidators.isValidDEANumber)
      .withMessage('Invalid DEA number'),
    
    body('experience.yearsOfPractice')
      .isInt({ min: 0 })
      .withMessage('Years of practice must be a non-negative number'),
    
    body('consultationFees.initial')
      .isFloat({ min: 0 })
      .withMessage('Initial consultation fee must be a positive number'),
    
    body('consultationFees.followUp')
      .isFloat({ min: 0 })
      .withMessage('Follow-up consultation fee must be a positive number')
  ],
  
  updateAvailability: [
    body('schedule.*.dayOfWeek')
      .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Invalid day of week'),
    
    body('schedule.*.slots.*.startTime')
      .custom(customValidators.isValidTime)
      .withMessage('Invalid start time format (HH:MM)'),
    
    body('schedule.*.slots.*.endTime')
      .custom(customValidators.isValidTime)
      .withMessage('Invalid end time format (HH:MM)')
  ]
};

// Appointment validation schemas
const appointmentValidation = {
  create: [
    body('patient')
      .notEmpty()
      .withMessage('Patient ID is required')
      .isMongoId()
      .withMessage('Invalid patient ID'),
    
    body('doctor')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isMongoId()
      .withMessage('Invalid doctor ID'),
    
    body('dateTime')
      .isISO8601()
      .withMessage('Valid appointment date and time is required')
      .custom(customValidators.isValidAppointmentDate)
      .withMessage('Appointment must be scheduled between now and 1 year in the future'),
    
    body('type')
      .isIn(['initial', 'follow-up', 'emergency', 'virtual', 'routine', 'consultation'])
      .withMessage('Invalid appointment type'),
    
    body('reason')
      .trim()
      .notEmpty()
      .withMessage('Reason for appointment is required')
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),
    
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    
    body('duration.scheduled')
      .optional()
      .isInt({ min: 15, max: 120 })
      .withMessage('Duration must be between 15 and 120 minutes')
  ],
  
  update: [
    body('status')
      .optional()
      .isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'])
      .withMessage('Invalid status'),
    
    body('dateTime')
      .optional()
      .isISO8601()
      .withMessage('Valid appointment date and time is required')
      .custom(customValidators.isValidAppointmentDate)
      .withMessage('Appointment must be scheduled between now and 1 year in the future')
  ],
  
  checkIn: [
    param('appointmentId')
      .isMongoId()
      .withMessage('Invalid appointment ID')
  ],
  
  recordVitals: [
    body('vitalsRecorded.bloodPressure.systolic')
      .optional()
      .isInt({ min: 60, max: 250 })
      .withMessage('Systolic pressure must be between 60 and 250'),
    
    body('vitalsRecorded.bloodPressure.diastolic')
      .optional()
      .isInt({ min: 40, max: 150 })
      .withMessage('Diastolic pressure must be between 40 and 150'),
    
    body('vitalsRecorded.heartRate')
      .optional()
      .isInt({ min: 30, max: 200 })
      .withMessage('Heart rate must be between 30 and 200'),
    
    body('vitalsRecorded.temperature.value')
      .optional()
      .isFloat({ min: 95, max: 107 })
      .withMessage('Temperature must be between 95°F and 107°F'),
    
    body('vitalsRecorded.oxygenSaturation')
      .optional()
      .isInt({ min: 70, max: 100 })
      .withMessage('Oxygen saturation must be between 70 and 100')
  ]
};

// Medical Record validation schemas
const medicalRecordValidation = {
  create: [
    body('patient')
      .notEmpty()
      .withMessage('Patient ID is required')
      .isMongoId()
      .withMessage('Invalid patient ID'),
    
    body('doctor')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isMongoId()
      .withMessage('Invalid doctor ID'),
    
    body('visitType')
      .isIn(['routine', 'follow-up', 'emergency', 'consultation', 'procedure', 'surgery'])
      .withMessage('Invalid visit type'),
    
    body('chiefComplaint')
      .trim()
      .notEmpty()
      .withMessage('Chief complaint is required')
      .isLength({ max: 500 })
      .withMessage('Chief complaint cannot exceed 500 characters'),
    
    body('assessment.diagnosis.*.code')
      .notEmpty()
      .withMessage('Diagnosis code is required')
      .custom(customValidators.isValidICD10Code)
      .withMessage('Invalid ICD-10 code format'),
    
    body('assessment.diagnosis.*.description')
      .notEmpty()
      .withMessage('Diagnosis description is required')
  ],
  
  finalize: [
    param('recordId')
      .isMongoId()
      .withMessage('Invalid medical record ID')
  ]
};

// Prescription validation schemas
const prescriptionValidation = {
  create: [
    body('patient')
      .notEmpty()
      .withMessage('Patient ID is required')
      .isMongoId()
      .withMessage('Invalid patient ID'),
    
    body('doctor')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isMongoId()
      .withMessage('Invalid doctor ID'),
    
    body('medicationDetails.*.drugName')
      .trim()
      .notEmpty()
      .withMessage('Drug name is required'),
    
    body('medicationDetails.*.form')
      .isIn(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'suppository', 'other'])
      .withMessage('Invalid drug form'),
    
    body('medicationDetails.*.strength.value')
      .isFloat({ min: 0 })
      .withMessage('Strength value must be a positive number'),
    
    body('medicationDetails.*.strength.unit')
      .isIn(['mg', 'mcg', 'g', 'ml', 'L', 'IU', '%', 'units'])
      .withMessage('Invalid strength unit'),
    
    body('medicationDetails.*.dosage.amount')
      .isFloat({ min: 0 })
      .withMessage('Dosage amount must be a positive number'),
    
    body('medicationDetails.*.route')
      .isIn(['oral', 'sublingual', 'buccal', 'rectal', 'vaginal', 'topical', 'transdermal', 'inhalation', 'nasal', 'ophthalmic', 'otic', 'intramuscular', 'intravenous', 'subcutaneous', 'intradermal', 'other'])
      .withMessage('Invalid route of administration'),
    
    body('medicationDetails.*.frequency.times')
      .isInt({ min: 1 })
      .withMessage('Frequency times must be at least 1'),
    
    body('medicationDetails.*.frequency.period')
      .isIn(['daily', 'weekly', 'monthly', 'as-needed', 'hourly', 'every-other-day', 'twice-daily', 'three-times-daily', 'four-times-daily'])
      .withMessage('Invalid frequency period'),
    
    body('medicationDetails.*.duration.value')
      .isInt({ min: 1 })
      .withMessage('Duration value must be at least 1'),
    
    body('medicationDetails.*.duration.unit')
      .isIn(['days', 'weeks', 'months', 'ongoing', 'as-directed'])
      .withMessage('Invalid duration unit'),
    
    body('medicationDetails.*.quantity.prescribed')
      .isInt({ min: 1 })
      .withMessage('Prescribed quantity must be at least 1'),
    
    body('medicationDetails.*.indication')
      .trim()
      .notEmpty()
      .withMessage('Indication is required')
      .isLength({ max: 500 })
      .withMessage('Indication cannot exceed 500 characters'),
    
    body('medicationDetails.*.refills.authorized')
      .optional()
      .isInt({ min: 0, max: 12 })
      .withMessage('Authorized refills must be between 0 and 12')
  ],
  
  refill: [
    param('prescriptionId')
      .isMongoId()
      .withMessage('Invalid prescription ID'),
    
    body('medicationIndex')
      .isInt({ min: 0 })
      .withMessage('Invalid medication index'),
    
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1')
  ]
};

// Lab Order validation schemas
const labOrderValidation = {
  create: [
    body('patient')
      .notEmpty()
      .withMessage('Patient ID is required')
      .isMongoId()
      .withMessage('Invalid patient ID'),
    
    body('doctor')
      .notEmpty()
      .withMessage('Doctor ID is required')
      .isMongoId()
      .withMessage('Invalid doctor ID'),
    
    body('priority')
      .isIn(['routine', 'urgent', 'stat'])
      .withMessage('Invalid priority'),
    
    body('testsRequested.*.testCode')
      .trim()
      .notEmpty()
      .withMessage('Test code is required'),
    
    body('testsRequested.*.testName')
      .trim()
      .notEmpty()
      .withMessage('Test name is required'),
    
    body('testsRequested.*.category')
      .isIn(['hematology', 'chemistry', 'microbiology', 'immunology', 'pathology', 'radiology', 'cardiology', 'urology', 'genetics', 'other'])
      .withMessage('Invalid test category'),
    
    body('testsRequested.*.specimen.type')
      .isIn(['blood', 'urine', 'stool', 'sputum', 'tissue', 'fluid', 'swab', 'other'])
      .withMessage('Invalid specimen type')
  ],
  
  collectSpecimen: [
    param('labOrderId')
      .isMongoId()
      .withMessage('Invalid lab order ID'),
    
    body('specimenIds')
      .isArray()
      .withMessage('Specimen IDs must be an array')
      .notEmpty()
      .withMessage('At least one specimen ID is required')
  ],
  
  addResults: [
    param('labOrderId')
      .isMongoId()
      .withMessage('Invalid lab order ID'),
    
    body('testCode')
      .trim()
      .notEmpty()
      .withMessage('Test code is required'),
    
    body('value')
      .notEmpty()
      .withMessage('Test result value is required'),
    
    body('flag')
      .optional()
      .isIn(['normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal'])
      .withMessage('Invalid flag value')
  ]
};

// Search and filter validation
const searchValidation = {
  general: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'name', 'date', 'status'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  
  dateRange: [
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
  ]
};

module.exports = {
  userValidation,
  patientValidation,
  doctorValidation,
  appointmentValidation,
  medicalRecordValidation,
  prescriptionValidation,
  labOrderValidation,
  searchValidation
};