const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'PAT' + Date.now() + Math.floor(Math.random() * 1000);
    }
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    required: [true, 'Gender is required']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: false
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/, 'Please provide a valid phone number']
    },
    alternatePhone: {
      type: String
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      match: [/^\d{5}(-\d{4})?$/, 'Please provide a valid ZIP code']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'USA'
    }
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    relationship: {
      type: String,
      required: [true, 'Emergency contact relationship is required'],
      enum: ['spouse', 'parent', 'child', 'sibling', 'friend', 'other']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required'],
      match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/, 'Please provide a valid phone number']
    }
  },
  insurance: {
    provider: {
      type: String
    },
    policyNumber: {
      type: String
    },
    groupNumber: {
      type: String
    },
    effectiveDate: {
      type: Date
    },
    expirationDate: {
      type: Date
    }
  },
  medicalHistory: {
    allergies: [{
      allergen: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      reaction: String
    }],
    chronicConditions: [{
      condition: String,
      diagnosedDate: Date,
      status: {
        type: String,
        enum: ['active', 'managed', 'resolved']
      }
    }],
    surgeries: [{
      procedure: String,
      date: Date,
      hospital: String,
      surgeon: String,
      notes: String
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date,
      prescribedBy: String,
      reason: String
    }],
    familyHistory: [{
      relation: String,
      condition: String,
      ageAtDiagnosis: Number
    }],
    immunizations: [{
      vaccine: String,
      date: Date,
      nextDueDate: Date
    }]
  },
  vitalSigns: {
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'ft'],
        default: 'cm'
      },
      lastUpdated: Date
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      },
      lastUpdated: Date
    },
    bmi: {
      value: Number,
      lastUpdated: Date
    }
  },
  lifestyle: {
    smokingStatus: {
      type: String,
      enum: ['never', 'former', 'current', 'occasional']
    },
    alcoholConsumption: {
      type: String,
      enum: ['none', 'occasional', 'moderate', 'heavy']
    },
    exerciseFrequency: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active']
    },
    dietaryRestrictions: [String]
  },
  primaryCarePhysician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  assignedDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }],
  appointments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }],
  medicalRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  }],
  prescriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  }],
  labOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabOrder'
  }],
  notes: [{
    date: {
      type: Date,
      default: Date.now
    },
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  consentForms: [{
    formType: String,
    signedDate: Date,
    expirationDate: Date,
    documentUrl: String
  }],
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  preferredContactMethod: {
    type: String,
    enum: ['phone', 'email', 'sms', 'mail'],
    default: 'phone'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Calculate BMI
patientSchema.methods.calculateBMI = function() {
  if (this.vitalSigns.height.value && this.vitalSigns.weight.value) {
    let height = this.vitalSigns.height.value;
    let weight = this.vitalSigns.weight.value;
    
    // Convert to metric if needed
    if (this.vitalSigns.height.unit === 'ft') {
      height = height * 30.48; // Convert to cm
    }
    if (this.vitalSigns.weight.unit === 'lbs') {
      weight = weight * 0.453592; // Convert to kg
    }
    
    // Calculate BMI
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    this.vitalSigns.bmi = {
      value: Math.round(bmi * 10) / 10,
      lastUpdated: new Date()
    };
    
    return this.vitalSigns.bmi.value;
  }
  return null;
};

// Add medical note
patientSchema.methods.addNote = function(note, userId) {
  this.notes.push({
    note,
    addedBy: userId,
    date: new Date()
  });
  return this.save();
};

// Check if insurance is valid
patientSchema.methods.isInsuranceValid = function() {
  if (!this.insurance.expirationDate) return true;
  return new Date(this.insurance.expirationDate) > new Date();
};

// Indexes
patientSchema.index({ userId: 1 });
patientSchema.index({ patientId: 1 });
patientSchema.index({ 'contactInfo.email': 1 });
patientSchema.index({ 'contactInfo.phone': 1 });
patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ dateOfBirth: 1 });
patientSchema.index({ primaryCarePhysician: 1 });

// Pre-save middleware
patientSchema.pre('save', function(next) {
  if (this.isModified('vitalSigns.height') || this.isModified('vitalSigns.weight')) {
    this.calculateBMI();
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);