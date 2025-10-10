const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'MR' + Date.now() + Math.floor(Math.random() * 1000);
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
  visitDate: {
    type: Date,
    required: [true, 'Visit date is required'],
    default: Date.now
  },
  visitType: {
    type: String,
    enum: ['routine', 'follow-up', 'emergency', 'consultation', 'procedure', 'surgery'],
    required: [true, 'Visit type is required']
  },
  chiefComplaint: {
    type: String,
    required: [true, 'Chief complaint is required'],
    maxlength: [500, 'Chief complaint cannot exceed 500 characters']
  },
  historyOfPresentIllness: {
    onset: String,
    location: String,
    duration: String,
    characteristics: String,
    aggravatingFactors: String,
    relievingFactors: String,
    timing: String,
    severity: {
      type: Number,
      min: 0,
      max: 10
    },
    associatedSymptoms: [String]
  },
  reviewOfSystems: {
    general: {
      fever: Boolean,
      chills: Boolean,
      nightSweats: Boolean,
      weightLoss: Boolean,
      weightGain: Boolean,
      fatigue: Boolean,
      weakness: Boolean,
      notes: String
    },
    cardiovascular: {
      chestPain: Boolean,
      palpitations: Boolean,
      shortnessOfBreath: Boolean,
      orthopnea: Boolean,
      edema: Boolean,
      notes: String
    },
    respiratory: {
      cough: Boolean,
      sputum: Boolean,
      hemoptysis: Boolean,
      dyspnea: Boolean,
      wheezing: Boolean,
      notes: String
    },
    gastrointestinal: {
      nausea: Boolean,
      vomiting: Boolean,
      diarrhea: Boolean,
      constipation: Boolean,
      abdominalPain: Boolean,
      bloodInStool: Boolean,
      notes: String
    },
    genitourinary: {
      dysuria: Boolean,
      frequency: Boolean,
      urgency: Boolean,
      hematuria: Boolean,
      incontinence: Boolean,
      notes: String
    },
    musculoskeletal: {
      jointPain: Boolean,
      stiffness: Boolean,
      swelling: Boolean,
      decreasedRangeOfMotion: Boolean,
      muscleWeakness: Boolean,
      notes: String
    },
    neurological: {
      headache: Boolean,
      dizziness: Boolean,
      syncope: Boolean,
      seizures: Boolean,
      numbness: Boolean,
      tingling: Boolean,
      weaknessNeuro: Boolean,
      notes: String
    },
    psychiatric: {
      depression: Boolean,
      anxiety: Boolean,
      insomnia: Boolean,
      hallucinations: Boolean,
      suicidalIdeation: Boolean,
      notes: String
    },
    endocrine: {
      polyuria: Boolean,
      polydipsia: Boolean,
      polyphagia: Boolean,
      heatIntolerance: Boolean,
      coldIntolerance: Boolean,
      notes: String
    },
    hematologic: {
      easyBruising: Boolean,
      bleeding: Boolean,
      lymphadenopathy: Boolean,
      anemia: Boolean,
      notes: String
    },
    allergicImmunologic: {
      rash: Boolean,
      hives: Boolean,
      itching: Boolean,
      swellingAllergic: Boolean,
      environmentalAllergies: Boolean,
      notes: String
    }
  },
  physicalExamination: {
    vitalSigns: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number
      },
      heartRate: Number,
      respiratoryRate: Number,
      temperature: {
        value: Number,
        unit: {
          type: String,
          enum: ['C', 'F'],
          default: 'F'
        }
      },
      oxygenSaturation: Number,
      height: {
        value: Number,
        unit: {
          type: String,
          enum: ['cm', 'ft']
        }
      },
      weight: {
        value: Number,
        unit: {
          type: String,
          enum: ['kg', 'lbs']
        }
      },
      bmi: Number,
      pain: {
        score: {
          type: Number,
          min: 0,
          max: 10
        },
        location: String,
        quality: String
      }
    },
    generalAppearance: {
      appearance: String,
      distress: {
        type: String,
        enum: ['no acute distress', 'mild distress', 'moderate distress', 'severe distress']
      },
      notes: String
    },
    heent: {
      head: String,
      eyes: String,
      ears: String,
      nose: String,
      throat: String,
      notes: String
    },
    neck: {
      inspection: String,
      palpation: String,
      lymphNodes: String,
      thyroid: String,
      notes: String
    },
    cardiovascular: {
      heartSounds: String,
      rhythm: {
        type: String,
        enum: ['regular', 'irregular']
      },
      murmurs: String,
      peripheralPulses: String,
      edema: String,
      notes: String
    },
    respiratory: {
      inspection: String,
      palpation: String,
      percussion: String,
      auscultation: String,
      breathSounds: String,
      notes: String
    },
    abdomen: {
      inspection: String,
      auscultation: String,
      palpation: String,
      percussion: String,
      tenderness: String,
      masses: String,
      organomegaly: String,
      notes: String
    },
    musculoskeletal: {
      inspection: String,
      rangeOfMotion: String,
      strength: String,
      stability: String,
      notes: String
    },
    neurological: {
      mentalStatus: String,
      cranialNerves: String,
      motor: String,
      sensory: String,
      reflexes: String,
      cerebellar: String,
      gait: String,
      notes: String
    },
    skin: {
      inspection: String,
      lesions: String,
      rashes: String,
      notes: String
    },
    psychiatric: {
      mood: String,
      affect: String,
      behavior: String,
      thoughtProcess: String,
      notes: String
    }
  },
  assessment: {
    diagnosis: [{
      code: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['primary', 'secondary', 'rule-out', 'differential'],
        default: 'primary'
      },
      status: {
        type: String,
        enum: ['active', 'resolved', 'chronic', 'acute'],
        default: 'active'
      },
      onsetDate: Date
    }],
    clinicalImpression: {
      type: String,
      maxlength: 2000
    },
    prognosis: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'guarded', 'unknown']
    }
  },
  plan: {
    medications: [{
      name: String,
      dosage: String,
      route: String,
      frequency: String,
      duration: String,
      instructions: String,
      prescriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
      }
    }],
    procedures: [{
      name: String,
      scheduledDate: Date,
      priority: {
        type: String,
        enum: ['routine', 'urgent', 'emergency']
      },
      notes: String
    }],
    labTests: [{
      testName: String,
      reason: String,
      urgency: {
        type: String,
        enum: ['routine', 'urgent', 'stat']
      },
      labOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LabOrder'
      }
    }],
    imaging: [{
      type: String,
      bodyPart: String,
      reason: String,
      urgency: {
        type: String,
        enum: ['routine', 'urgent', 'stat']
      },
      scheduledDate: Date
    }],
    referrals: [{
      specialty: String,
      doctorName: String,
      reason: String,
      urgency: {
        type: String,
        enum: ['routine', 'urgent', 'emergency']
      }
    }],
    followUp: {
      required: Boolean,
      timeframe: String,
      reason: String,
      withWhom: {
        type: String,
        enum: ['same-doctor', 'any-doctor', 'specialist', 'emergency']
      }
    },
    patientEducation: [{
      topic: String,
      materials: String,
      instructions: String
    }],
    lifestyle: [{
      category: {
        type: String,
        enum: ['diet', 'exercise', 'smoking', 'alcohol', 'stress', 'sleep', 'other']
      },
      recommendation: String
    }],
    additionalInstructions: {
      type: String,
      maxlength: 1000
    }
  },
  attachments: [{
    name: String,
    type: {
      type: String,
      enum: ['lab-result', 'imaging', 'ekg', 'report', 'other']
    },
    fileUrl: String,
    uploadedDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String
  }],
  treatmentNotes: {
    type: String,
    maxlength: 3000
  },
  confidentialNotes: {
    type: String,
    maxlength: 2000,
    select: false // Hidden by default
  },
  codeStatus: {
    type: String,
    enum: ['full-code', 'dnr', 'dni', 'limited-intervention', 'comfort-care'],
    default: 'full-code'
  },
  allergiesReviewed: {
    type: Boolean,
    default: false
  },
  medicationsReviewed: {
    type: Boolean,
    default: false
  },
  socialHistory: {
    occupation: String,
    education: String,
    maritalStatus: String,
    livingArrangement: String,
    tobacco: {
      status: {
        type: String,
        enum: ['never', 'former', 'current']
      },
      amount: String,
      duration: String,
      quitDate: Date
    },
    alcohol: {
      status: {
        type: String,
        enum: ['never', 'occasional', 'moderate', 'heavy']
      },
      amount: String,
      frequency: String
    },
    drugs: {
      status: {
        type: String,
        enum: ['never', 'former', 'current']
      },
      types: [String],
      lastUse: Date
    },
    exercise: {
      frequency: String,
      type: String,
      duration: String
    },
    diet: {
      type: String,
      restrictions: [String]
    },
    sexualHistory: {
      active: Boolean,
      partners: String,
      protection: Boolean,
      concerns: String
    }
  },
  familyHistory: [{
    relation: String,
    condition: String,
    ageAtDiagnosis: Number,
    ageAtDeath: Number,
    causeOfDeath: String
  }],
  isFinalized: {
    type: Boolean,
    default: false
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  finalizedAt: Date,
  lastReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastReviewedAt: Date,
  amendments: [{
    date: {
      type: Date,
      default: Date.now
    },
    amendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    section: String,
    previousValue: String,
    newValue: String,
    reason: String
  }],
  access: {
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      accessLevel: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read'
      },
      sharedDate: {
        type: Date,
        default: Date.now
      },
      expiryDate: Date
    }],
    isRestricted: {
      type: Boolean,
      default: false
    },
    restrictionReason: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for age at visit
medicalRecordSchema.virtual('patientAgeAtVisit').get(function() {
  if (!this.patient || !this.patient.dateOfBirth) return null;
  const birthDate = new Date(this.patient.dateOfBirth);
  const visitDate = new Date(this.visitDate);
  let age = visitDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = visitDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && visitDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to finalize record
medicalRecordSchema.methods.finalize = function(doctorId) {
  this.isFinalized = true;
  this.finalizedBy = doctorId;
  this.finalizedAt = new Date();
  return this.save();
};

// Method to add amendment
medicalRecordSchema.methods.addAmendment = function(userId, section, previousValue, newValue, reason) {
  this.amendments.push({
    amendedBy: userId,
    section,
    previousValue,
    newValue,
    reason
  });
  return this.save();
};

// Method to share record
medicalRecordSchema.methods.shareWith = function(userId, accessLevel = 'read', expiryDate = null) {
  const existingShare = this.access.sharedWith.find(s => s.user.toString() === userId.toString());
  
  if (existingShare) {
    existingShare.accessLevel = accessLevel;
    existingShare.expiryDate = expiryDate;
  } else {
    this.access.sharedWith.push({
      user: userId,
      accessLevel,
      expiryDate
    });
  }
  
  return this.save();
};

// Method to revoke access
medicalRecordSchema.methods.revokeAccess = function(userId) {
  this.access.sharedWith = this.access.sharedWith.filter(
    s => s.user.toString() !== userId.toString()
  );
  return this.save();
};

// Indexes
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });
medicalRecordSchema.index({ appointment: 1 });
medicalRecordSchema.index({ 'assessment.diagnosis.code': 1 });
medicalRecordSchema.index({ isFinalized: 1 });

// Pre-save middleware
medicalRecordSchema.pre('save', function(next) {
  // Set last reviewed
  if (this.isModified() && !this.isNew) {
    this.lastReviewedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);