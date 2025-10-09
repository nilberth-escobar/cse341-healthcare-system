const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  doctorId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'DOC' + Date.now() + Math.floor(Math.random() * 1000);
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
  title: {
    type: String,
    enum: ['Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.'],
    default: 'Dr.'
  },
  specialty: {
    type: String,
    required: [true, 'Specialty is required'],
    enum: [
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
    ]
  },
  subSpecialties: [String],
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  licenseState: {
    type: String,
    required: [true, 'License state is required']
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'License expiry date is required']
  },
  npiNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  deaNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  education: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    yearCompleted: {
      type: Number,
      required: true
    },
    field: String
  }],
  residency: [{
    hospital: String,
    department: String,
    startDate: Date,
    endDate: Date,
    completed: Boolean
  }],
  fellowships: [{
    institution: String,
    specialty: String,
    startDate: Date,
    endDate: Date,
    completed: Boolean
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateNumber: String
  }],
  experience: {
    yearsOfPractice: {
      type: Number,
      required: true,
      min: 0
    },
    previousPositions: [{
      hospital: String,
      position: String,
      department: String,
      startDate: Date,
      endDate: Date,
      responsibilities: String
    }]
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/, 'Please provide a valid phone number']
    },
    alternatePhone: String,
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    officeAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'USA'
      }
    }
  },
  availability: {
    schedule: [{
      dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      slots: [{
        startTime: String,
        endTime: String,
        isAvailable: {
          type: Boolean,
          default: true
        }
      }]
    }],
    vacations: [{
      startDate: Date,
      endDate: Date,
      reason: String
    }],
    consultationDuration: {
      type: Number,
      default: 30, // minutes
      min: 15,
      max: 120
    },
    bufferTime: {
      type: Number,
      default: 5, // minutes between appointments
      min: 0,
      max: 30
    }
  },
  consultationFees: {
    initial: {
      type: Number,
      required: true,
      min: 0
    },
    followUp: {
      type: Number,
      required: true,
      min: 0
    },
    emergency: {
      type: Number,
      min: 0
    },
    virtual: {
      type: Number,
      min: 0
    }
  },
  acceptedInsurance: [{
    provider: String,
    planTypes: [String]
  }],
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['Native', 'Fluent', 'Intermediate', 'Basic']
    }
  }],
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    reviews: [{
      patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  }],
  appointments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }],
  specializations: {
    procedures: [String],
    conditions: [String],
    technologies: [String]
  },
  emergencyAvailable: {
    type: Boolean,
    default: false
  },
  telemedicineAvailable: {
    type: Boolean,
    default: false
  },
  hospitalAffiliations: [{
    hospital: String,
    position: String,
    department: String,
    startDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  publications: [{
    title: String,
    journal: String,
    year: Number,
    doi: String,
    pmid: String
  }],
  awards: [{
    title: String,
    organization: String,
    year: Number,
    description: String
  }],
  professionalMemberships: [{
    organization: String,
    position: String,
    startDate: Date,
    endDate: Date,
    isActive: Boolean
  }],
  bio: {
    type: String,
    maxlength: 2000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAcceptingNewPatients: {
    type: Boolean,
    default: true
  },
  maxPatientsPerDay: {
    type: Number,
    default: 20,
    min: 1,
    max: 50
  },
  stats: {
    totalPatientsSeen: {
      type: Number,
      default: 0
    },
    totalAppointments: {
      type: Number,
      default: 0
    },
    totalPrescriptions: {
      type: Number,
      default: 0
    },
    lastAppointmentDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
doctorSchema.virtual('fullName').get(function() {
  return `${this.title} ${this.firstName} ${this.lastName}`;
});

// Virtual for display name
doctorSchema.virtual('displayName').get(function() {
  return `${this.title} ${this.firstName} ${this.lastName}, ${this.specialty}`;
});

// Check if license is valid
doctorSchema.methods.isLicenseValid = function() {
  return new Date(this.licenseExpiry) > new Date();
};

// Get available slots for a date
doctorSchema.methods.getAvailableSlots = function(date) {
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  const daySchedule = this.availability.schedule.find(s => s.dayOfWeek === dayOfWeek);
  
  if (!daySchedule) return [];
  
  // Check if doctor is on vacation
  const isOnVacation = this.availability.vacations.some(vacation => {
    return date >= vacation.startDate && date <= vacation.endDate;
  });
  
  if (isOnVacation) return [];
  
  return daySchedule.slots.filter(slot => slot.isAvailable);
};

// Calculate rating
doctorSchema.methods.updateRating = function() {
  if (this.ratings.reviews.length > 0) {
    const sum = this.ratings.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.ratings.average = Math.round((sum / this.ratings.reviews.length) * 10) / 10;
    this.ratings.count = this.ratings.reviews.length;
  }
};

// Add review
doctorSchema.methods.addReview = function(patientId, rating, comment) {
  this.ratings.reviews.push({
    patient: patientId,
    rating,
    comment,
    date: new Date()
  });
  this.updateRating();
  return this.save();
};

// Indexes
doctorSchema.index({ userId: 1 });
doctorSchema.index({ doctorId: 1 });
doctorSchema.index({ licenseNumber: 1 });
doctorSchema.index({ specialty: 1 });
doctorSchema.index({ 'contactInfo.email': 1 });
doctorSchema.index({ lastName: 1, firstName: 1 });
doctorSchema.index({ 'ratings.average': -1 });
doctorSchema.index({ isActive: 1, isAcceptingNewPatients: 1 });

// Pre-save middleware
doctorSchema.pre('save', function(next) {
  if (this.isModified('ratings.reviews')) {
    this.updateRating();
  }
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);