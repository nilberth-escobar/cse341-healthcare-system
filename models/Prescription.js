const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'RX' + Date.now() + Math.floor(Math.random() * 1000);
    }
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  medicalRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    default: function() {
      const date = new Date();
      date.setMonth(date.getMonth() + 6); // Default 6 months validity
      return date;
    }
  },
  status: {
    type: String,
    enum: ['active', 'filled', 'partial-fill', 'expired', 'cancelled', 'on-hold'],
    default: 'active'
  },
  medicationDetails: [{
    drugName: {
      type: String,
      required: [true, 'Drug name is required']
    },
    genericName: String,
    brandName: String,
    drugCode: String,
    ndc: String, // National Drug Code
    form: {
      type: String,
      enum: ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'suppository', 'other'],
      required: [true, 'Drug form is required']
    },
    strength: {
      value: {
        type: Number,
        required: [true, 'Strength value is required']
      },
      unit: {
        type: String,
        required: [true, 'Strength unit is required'],
        enum: ['mg', 'mcg', 'g', 'ml', 'L', 'IU', '%', 'units']
      }
    },
    dosage: {
      amount: {
        type: Number,
        required: [true, 'Dosage amount is required']
      },
      unit: {
        type: String,
        required: [true, 'Dosage unit is required']
      },
      instructions: String
    },
    route: {
      type: String,
      enum: ['oral', 'sublingual', 'buccal', 'rectal', 'vaginal', 'topical', 'transdermal', 'inhalation', 'nasal', 'ophthalmic', 'otic', 'intramuscular', 'intravenous', 'subcutaneous', 'intradermal', 'other'],
      required: [true, 'Route of administration is required'],
      default: 'oral'
    },
    frequency: {
      times: {
        type: Number,
        required: [true, 'Frequency times is required']
      },
      period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'as-needed', 'hourly', 'every-other-day', 'twice-daily', 'three-times-daily', 'four-times-daily'],
        required: [true, 'Frequency period is required']
      },
      specificTimes: [String], // e.g., ['08:00', '14:00', '20:00']
      instructions: String // e.g., 'with meals', 'before bed'
    },
    duration: {
      value: {
        type: Number,
        required: [true, 'Duration value is required']
      },
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months', 'ongoing', 'as-directed'],
        required: [true, 'Duration unit is required']
      }
    },
    quantity: {
      prescribed: {
        type: Number,
        required: [true, 'Prescribed quantity is required']
      },
      dispensed: {
        type: Number,
        default: 0
      },
      unit: {
        type: String,
        required: [true, 'Quantity unit is required']
      }
    },
    refills: {
      authorized: {
        type: Number,
        default: 0,
        min: 0,
        max: 12
      },
      remaining: {
        type: Number,
        default: function() {
          return this.authorized || 0;
        }
      },
      lastRefillDate: Date
    },
    substitutionAllowed: {
      type: Boolean,
      default: true
    },
    indication: {
      type: String,
      required: [true, 'Indication is required'],
      maxlength: 500
    },
    controlledSubstance: {
      isControlled: {
        type: Boolean,
        default: false
      },
      schedule: {
        type: String,
        enum: ['I', 'II', 'III', 'IV', 'V']
      },
      deaNumber: String
    }
  }],
  instructions: {
    patient: {
      type: String,
      maxlength: 1000
    },
    pharmacist: {
      type: String,
      maxlength: 500
    }
  },
  warnings: [{
    type: String
  }],
  interactions: [{
    drug: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'contraindicated']
    },
    description: String
  }],
  allergiesConsidered: [{
    allergen: String,
    consideration: String
  }],
  pharmacy: {
    name: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    pharmacistName: String,
    ncpdpId: String // National Council for Prescription Drug Programs ID
  },
  dispensingHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    quantity: Number,
    pharmacist: String,
    pharmacy: String,
    notes: String
  }],
  priorAuthorization: {
    required: {
      type: Boolean,
      default: false
    },
    authorizationNumber: String,
    approvedDate: Date,
    expiryDate: Date,
    insuranceProvider: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'not-required']
    },
    notes: String
  },
  insurance: {
    covered: {
      type: Boolean,
      default: false
    },
    copayAmount: Number,
    insuranceProvider: String,
    policyNumber: String,
    groupNumber: String,
    bin: String, // Bank Identification Number
    pcn: String  // Processor Control Number
  },
  electronicPrescription: {
    sent: {
      type: Boolean,
      default: false
    },
    sentDate: Date,
    transmissionId: String,
    recipientPharmacy: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'received', 'filled', 'error', 'cancelled']
    },
    errorMessage: String
  },
  discontinuation: {
    discontinued: {
      type: Boolean,
      default: false
    },
    discontinuedDate: Date,
    discontinuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    reason: String
  },
  modification: [{
    modifiedDate: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    changeType: {
      type: String,
      enum: ['dosage', 'frequency', 'duration', 'medication', 'instructions', 'other']
    },
    previousValue: String,
    newValue: String,
    reason: String
  }],
  compliance: {
    tracking: {
      type: Boolean,
      default: false
    },
    adherenceRate: Number, // Percentage
    missedDoses: [{
      date: Date,
      reason: String
    }],
    sideEffects: [{
      effect: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      reportedDate: Date,
      action: String
    }]
  },
  signature: {
    doctorSignature: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      signatureData: String // Base64 encoded signature or digital signature ID
    },
    patientAcknowledgment: {
      acknowledged: {
        type: Boolean,
        default: false
      },
      acknowledgedAt: Date,
      method: {
        type: String,
        enum: ['electronic', 'verbal', 'written']
      }
    }
  },
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
  isPrintable: {
    type: Boolean,
    default: true
  },
  printedCopies: [{
    printedAt: Date,
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    purpose: String
  }],
  qrCode: String, // For prescription verification
  barcode: String,
  confidential: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for is expired
prescriptionSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date() || this.status === 'expired';
});

// Virtual for days until expiry
prescriptionSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for can be refilled
prescriptionSchema.virtual('canBeRefilled').get(function() {
  return !this.isExpired && 
         this.status === 'active' && 
         this.medicationDetails.some(med => med.refills.remaining > 0);
});

// Method to process refill
prescriptionSchema.methods.processRefill = function(medicationIndex, quantity, pharmacy) {
  if (this.isExpired) {
    throw new Error('Prescription is expired');
  }
  
  const medication = this.medicationDetails[medicationIndex];
  if (!medication) {
    throw new Error('Medication not found');
  }
  
  if (medication.refills.remaining <= 0) {
    throw new Error('No refills remaining');
  }
  
  medication.refills.remaining--;
  medication.refills.lastRefillDate = new Date();
  medication.quantity.dispensed += quantity;
  
  this.dispensingHistory.push({
    date: new Date(),
    quantity,
    pharmacy: pharmacy || this.pharmacy.name
  });
  
  return this.save();
};

// Method to discontinue prescription
prescriptionSchema.methods.discontinue = function(doctorId, reason) {
  this.status = 'cancelled';
  this.discontinuation = {
    discontinued: true,
    discontinuedDate: new Date(),
    discontinuedBy: doctorId,
    reason
  };
  return this.save();
};

// Method to modify prescription
prescriptionSchema.methods.modifyPrescription = function(doctorId, changeType, previousValue, newValue, reason) {
  this.modification.push({
    modifiedBy: doctorId,
    changeType,
    previousValue,
    newValue,
    reason
  });
  return this.save();
};

// Method to add note
prescriptionSchema.methods.addNote = function(note, userId) {
  this.notes.push({
    note,
    addedBy: userId
  });
  return this.save();
};

// Method to check drug interactions
prescriptionSchema.methods.checkInteractions = async function(patientId) {
  // This would typically integrate with a drug interaction API
  // For now, returning a placeholder
  const interactions = [];
  
  // Check against patient's current medications
  const Patient = mongoose.model('Patient');
  const patient = await Patient.findById(patientId);
  
  if (patient && patient.medicalHistory.medications) {
    // Simple interaction check logic would go here
    // This is a simplified example
    this.medicationDetails.forEach(newMed => {
      patient.medicalHistory.medications.forEach(existingMed => {
        if (existingMed.name && newMed.drugName) {
          // In real implementation, check against interaction database
          // This is just a placeholder
        }
      });
    });
  }
  
  return interactions;
};

// Generate prescription QR code
prescriptionSchema.methods.generateQRCode = function() {
  // This would generate a QR code for prescription verification
  // Using prescription ID and a hash for security
  const crypto = require('crypto');
  const data = {
    id: this.prescriptionId,
    patient: this.patient,
    date: this.issueDate,
    hash: crypto.createHash('sha256').update(this.prescriptionId + this.issueDate).digest('hex')
  };
  this.qrCode = JSON.stringify(data);
  return this.save();
};

// Indexes
prescriptionSchema.index({ patient: 1, issueDate: -1 });
prescriptionSchema.index({ doctor: 1, issueDate: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ expiryDate: 1 });
prescriptionSchema.index({ 'medicationDetails.drugName': 1 });

// Pre-save middleware
prescriptionSchema.pre('save', function(next) {
  // Check if prescription should be expired
  if (this.expiryDate < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  // Update refills remaining
  this.medicationDetails.forEach(med => {
    if (med.refills.remaining === undefined) {
      med.refills.remaining = med.refills.authorized;
    }
  });
  
  next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);