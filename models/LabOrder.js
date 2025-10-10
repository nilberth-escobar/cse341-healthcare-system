const mongoose = require('mongoose');

const labOrderSchema = new mongoose.Schema({
  labOrderId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'LAB' + Date.now() + Math.floor(Math.random() * 1000);
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
    required: [true, 'Ordering doctor is required']
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  medicalRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  orderDate: {
    type: Date,
    required: [true, 'Order date is required'],
    default: Date.now
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine',
    required: [true, 'Priority is required']
  },
  status: {
    type: String,
    enum: ['ordered', 'specimen-collected', 'in-progress', 'completed', 'cancelled', 'on-hold', 'partial'],
    default: 'ordered'
  },
  testsRequested: [{
    testCode: {
      type: String,
      required: [true, 'Test code is required']
    },
    testName: {
      type: String,
      required: [true, 'Test name is required']
    },
    category: {
      type: String,
      enum: ['hematology', 'chemistry', 'microbiology', 'immunology', 'pathology', 'radiology', 'cardiology', 'urology', 'genetics', 'other'],
      required: [true, 'Test category is required']
    },
    specimen: {
      type: {
        type: String,
        enum: ['blood', 'urine', 'stool', 'sputum', 'tissue', 'fluid', 'swab', 'other'],
        required: [true, 'Specimen type is required']
      },
      amount: {
        value: Number,
        unit: String
      },
      collectionInstructions: String,
      fastingRequired: {
        type: Boolean,
        default: false
      },
      fastingDuration: {
        value: Number,
        unit: {
          type: String,
          enum: ['hours', 'days']
        }
      }
    },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine'
    },
    status: {
      type: String,
      enum: ['pending', 'collected', 'processing', 'resulted', 'cancelled', 'failed'],
      default: 'pending'
    },
    reason: {
      type: String,
      maxlength: 500
    },
    specialInstructions: String,
    expectedTurnaround: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks']
      }
    }
  }],
  specimenCollection: {
    scheduledDate: Date,
    collectedDate: Date,
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectionSite: {
      type: String,
      enum: ['lab', 'bedside', 'clinic', 'home', 'other']
    },
    collectionNotes: String,
    barcode: String,
    specimenIds: [{
      type: String
    }],
    chainOfCustody: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      action: {
        type: String,
        enum: ['collected', 'transported', 'received', 'processed', 'stored', 'discarded']
      },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      location: String,
      notes: String
    }]
  },
  results: {
    receivedDate: Date,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    testResults: [{
      testCode: String,
      testName: String,
      value: String,
      numericValue: Number,
      unit: String,
      referenceRange: {
        low: Number,
        high: Number,
        text: String
      },
      flag: {
        type: String,
        enum: ['normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal']
      },
      interpretation: String,
      comments: String,
      resultDate: Date,
      methodology: String
    }],
    overallInterpretation: {
      type: String,
      maxlength: 2000
    },
    criticalValues: [{
      parameter: String,
      value: String,
      notifiedTo: String,
      notifiedAt: Date,
      notifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      acknowledgment: {
        acknowledged: Boolean,
        acknowledgedBy: String,
        acknowledgedAt: Date
      }
    }],
    attachments: [{
      name: String,
      type: {
        type: String,
        enum: ['pdf', 'image', 'graph', 'other']
      },
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    amendments: [{
      date: {
        type: Date,
        default: Date.now
      },
      amendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String,
      previousValue: String,
      newValue: String
    }]
  },
  laboratory: {
    name: String,
    code: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    phone: String,
    contactPerson: String,
    accreditationNumber: String,
    isExternal: {
      type: Boolean,
      default: false
    }
  },
  billing: {
    totalCost: {
      type: Number,
      min: 0
    },
    breakdown: [{
      testCode: String,
      testName: String,
      cost: Number
    }],
    insuranceCovered: {
      type: Boolean,
      default: false
    },
    insuranceProvider: String,
    authorizationNumber: String,
    copayAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'authorized', 'billed', 'paid', 'denied', 'partial'],
      default: 'pending'
    }
  },
  clinicalInfo: {
    diagnosis: [{
      code: String,
      description: String
    }],
    symptoms: [String],
    medications: [String],
    allergies: [String],
    pregnancyStatus: {
      type: String,
      enum: ['not-applicable', 'not-pregnant', 'pregnant', 'unknown']
    },
    relevantHistory: String
  },
  qualityControl: {
    qcPerformed: {
      type: Boolean,
      default: false
    },
    qcDate: Date,
    qcPerformedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    qcResults: {
      type: String,
      enum: ['pass', 'fail', 'partial']
    },
    qcNotes: String
  },
  notifications: [{
    type: {
      type: String,
      enum: ['ordered', 'collected', 'resulted', 'critical', 'cancelled']
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    method: {
      type: String,
      enum: ['email', 'sms', 'phone', 'system', 'fax']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed']
    },
    message: String
  }],
  tracking: {
    turnaroundTime: {
      expected: {
        value: Number,
        unit: {
          type: String,
          enum: ['hours', 'days']
        }
      },
      actual: {
        value: Number,
        unit: {
          type: String,
          enum: ['hours', 'days']
        }
      }
    },
    delays: [{
      reason: String,
      duration: {
        value: Number,
        unit: String
      },
      reportedAt: Date,
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  accessControl: {
    viewableBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isConfidential: {
      type: Boolean,
      default: false
    },
    confidentialityReason: String
  },
  comments: [{
    date: {
      type: Date,
      default: Date.now
    },
    comment: String,
    commentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  requiresReview: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  reviewedAt: Date,
  reviewComments: String,
  repeatTest: {
    isRepeat: {
      type: Boolean,
      default: false
    },
    originalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabOrder'
    },
    reason: String
  },
  cancellation: {
    cancelled: {
      type: Boolean,
      default: false
    },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for is completed
labOrderSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' && this.results.testResults.length > 0;
});

// Virtual for has critical values
labOrderSchema.virtual('hasCriticalValues').get(function() {
  return this.results.criticalValues && this.results.criticalValues.length > 0;
});

// Virtual for pending tests
labOrderSchema.virtual('pendingTests').get(function() {
  return this.testsRequested.filter(test => test.status === 'pending' || test.status === 'processing');
});

// Virtual for turnaround time
labOrderSchema.virtual('turnaroundTime').get(function() {
  if (this.results.receivedDate && this.orderDate) {
    const diff = this.results.receivedDate - this.orderDate;
    return Math.round(diff / (1000 * 60 * 60)); // Return in hours
  }
  return null;
});

// Method to collect specimen
labOrderSchema.methods.collectSpecimen = function(userId, specimenIds, notes) {
  this.specimenCollection.collectedDate = new Date();
  this.specimenCollection.collectedBy = userId;
  this.specimenCollection.specimenIds = specimenIds;
  this.specimenCollection.collectionNotes = notes;
  
  // Update chain of custody
  this.specimenCollection.chainOfCustody.push({
    action: 'collected',
    performedBy: userId,
    notes
  });
  
  // Update status
  this.status = 'specimen-collected';
  
  // Update test statuses
  this.testsRequested.forEach(test => {
    test.status = 'collected';
  });
  
  return this.save();
};

// Method to add results
labOrderSchema.methods.addResults = function(testCode, results, userId) {
  const testIndex = this.testsRequested.findIndex(t => t.testCode === testCode);
  
  if (testIndex === -1) {
    throw new Error('Test not found in order');
  }
  
  this.testsRequested[testIndex].status = 'resulted';
  
  // Add to results
  this.results.testResults.push({
    testCode,
    testName: this.testsRequested[testIndex].testName,
    ...results,
    resultDate: new Date()
  });
  
  this.results.reportedBy = userId;
  
  // Check if all tests are complete
  const allComplete = this.testsRequested.every(test => 
    test.status === 'resulted' || test.status === 'cancelled'
  );
  
  if (allComplete) {
    this.status = 'completed';
    this.results.receivedDate = new Date();
    
    // Calculate actual turnaround time
    const diff = this.results.receivedDate - this.orderDate;
    this.tracking.turnaroundTime.actual = {
      value: Math.round(diff / (1000 * 60 * 60)),
      unit: 'hours'
    };
  } else {
    this.status = 'partial';
  }
  
  return this.save();
};

// Method to flag critical value
labOrderSchema.methods.flagCriticalValue = function(parameter, value, userId) {
  const critical = {
    parameter,
    value,
    notifiedAt: new Date(),
    notifiedBy: userId,
    acknowledgment: {
      acknowledged: false
    }
  };
  
  this.results.criticalValues.push(critical);
  this.requiresReview = true;
  
  return this.save();
};

// Method to acknowledge critical value
labOrderSchema.methods.acknowledgeCritical = function(criticalId, acknowledgedBy) {
  const critical = this.results.criticalValues.id(criticalId);
  
  if (!critical) {
    throw new Error('Critical value not found');
  }
  
  critical.acknowledgment = {
    acknowledged: true,
    acknowledgedBy,
    acknowledgedAt: new Date()
  };
  
  return this.save();
};

// Method to cancel order
labOrderSchema.methods.cancelOrder = function(userId, reason) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelled: true,
    cancelledAt: new Date(),
    cancelledBy: userId,
    reason
  };
  
  // Update all pending tests
  this.testsRequested.forEach(test => {
    if (test.status === 'pending' || test.status === 'collected') {
      test.status = 'cancelled';
    }
  });
  
  return this.save();
};

// Method to add comment
labOrderSchema.methods.addComment = function(comment, userId) {
  this.comments.push({
    comment,
    commentBy: userId
  });
  return this.save();
};

// Method to track chain of custody
labOrderSchema.methods.updateChainOfCustody = function(action, userId, location, notes) {
  this.specimenCollection.chainOfCustody.push({
    action,
    performedBy: userId,
    location,
    notes
  });
  return this.save();
};

// Calculate billing
labOrderSchema.methods.calculateBilling = function() {
  if (this.billing.breakdown && this.billing.breakdown.length > 0) {
    this.billing.totalCost = this.billing.breakdown.reduce((sum, item) => sum + item.cost, 0);
  }
  return this.billing.totalCost;
};

// Indexes
labOrderSchema.index({ patient: 1, orderDate: -1 });
labOrderSchema.index({ doctor: 1, orderDate: -1 });
labOrderSchema.index({ labOrderId: 1 });
labOrderSchema.index({ status: 1 });
labOrderSchema.index({ priority: 1 });
labOrderSchema.index({ 'testsRequested.testCode': 1 });
labOrderSchema.index({ isUrgent: 1, requiresReview: 1 });

// Pre-save middleware
labOrderSchema.pre('save', function(next) {
  // Set urgent flag based on priority
  if (this.priority === 'stat' || this.priority === 'urgent') {
    this.isUrgent = true;
  }
  
  // Calculate billing if breakdown exists
  if (this.isModified('billing.breakdown')) {
    this.calculateBilling();
  }
  
  next();
});

module.exports = mongoose.model('LabOrder', labOrderSchema);