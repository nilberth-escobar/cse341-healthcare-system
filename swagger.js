const swaggerAutogen = require('swagger-autogen')();
const path = require('path');

const doc = {
  info: {
    title: 'Hospital Management System API',
    description: 'Professional RESTful API for Hospital Management System with complete healthcare operations support',
    version: '1.0.0',
    contact: {
      name: 'Nilberth Rafael Escobar Mérida',
      email: 'support@hospital-api.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  host: process.env.HOST || 'localhost:3000',
  basePath: '/api',
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Patients',
      description: 'Patient management endpoints'
    },
    {
      name: 'Doctors',
      description: 'Doctor management endpoints'
    },
    {
      name: 'Appointments',
      description: 'Appointment scheduling and management'
    },
    {
      name: 'Medical Records',
      description: 'Medical record management'
    },
    {
      name: 'Prescriptions',
      description: 'Prescription management'
    },
    {
      name: 'Lab Orders',
      description: 'Laboratory order management'
    }
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter JWT token with Bearer prefix (e.g., "Bearer <token>")'
    },
    githubOAuth: {
      type: 'oauth2',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      flow: 'implicit',
      scopes: {
        'user:email': 'Read user email'
      }
    }
  },
  definitions: {
    User: {
      username: 'johndoe',
      email: 'john@example.com',
      name: 'John Doe',
      role: 'patient',
      avatar: 'https://example.com/avatar.jpg',
      isActive: true,
      isVerified: true
    },
    Patient: {
      patientId: 'PAT1234567890',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1980-01-01',
      gender: 'male',
      bloodGroup: 'O+',
      contactInfo: {
        phone: '+1234567890',
        email: 'john@example.com'
      },
      address: {
        street: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
        country: 'USA'
      },
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'spouse',
        phone: '+1234567891'
      },
      insurance: {
        provider: 'Blue Cross',
        policyNumber: 'BC123456',
        groupNumber: 'GRP789'
      }
    },
    Doctor: {
      doctorId: 'DOC1234567890',
      firstName: 'Sarah',
      lastName: 'Smith',
      title: 'Dr.',
      specialty: 'Cardiology',
      licenseNumber: 'MD123456',
      licenseState: 'MA',
      licenseExpiry: '2025-12-31',
      experience: {
        yearsOfPractice: 10
      },
      consultationFees: {
        initial: 200,
        followUp: 150
      },
      availability: {
        schedule: [
          {
            dayOfWeek: 'Monday',
            slots: [
              {
                startTime: '09:00',
                endTime: '17:00',
                isAvailable: true
              }
            ]
          }
        ]
      }
    },
    Appointment: {
      appointmentId: 'APT1234567890',
      patient: '507f1f77bcf86cd799439011',
      doctor: '507f1f77bcf86cd799439012',
      dateTime: '2025-01-15T10:00:00Z',
      type: 'initial',
      status: 'scheduled',
      priority: 'normal',
      reason: 'Regular checkup',
      duration: {
        scheduled: 30
      }
    },
    MedicalRecord: {
      recordId: 'MR1234567890',
      patient: '507f1f77bcf86cd799439011',
      doctor: '507f1f77bcf86cd799439012',
      visitDate: '2025-01-10',
      visitType: 'routine',
      chiefComplaint: 'Chest pain',
      assessment: {
        diagnosis: [
          {
            code: 'I21.9',
            description: 'Acute myocardial infarction',
            type: 'primary'
          }
        ]
      }
    },
    Prescription: {
      prescriptionId: 'RX1234567890',
      patient: '507f1f77bcf86cd799439011',
      doctor: '507f1f77bcf86cd799439012',
      issueDate: '2025-01-10',
      expiryDate: '2025-07-10',
      status: 'active',
      medicationDetails: [
        {
          drugName: 'Aspirin',
          form: 'tablet',
          strength: {
            value: 81,
            unit: 'mg'
          },
          dosage: {
            amount: 1,
            unit: 'tablet'
          },
          route: 'oral',
          frequency: {
            times: 1,
            period: 'daily'
          },
          duration: {
            value: 30,
            unit: 'days'
          },
          quantity: {
            prescribed: 30,
            unit: 'tablets'
          },
          indication: 'Cardiovascular protection'
        }
      ]
    },
    LabOrder: {
      labOrderId: 'LAB1234567890',
      patient: '507f1f77bcf86cd799439011',
      doctor: '507f1f77bcf86cd799439012',
      orderDate: '2025-01-10',
      priority: 'routine',
      status: 'ordered',
      testsRequested: [
        {
          testCode: 'CBC',
          testName: 'Complete Blood Count',
          category: 'hematology',
          specimen: {
            type: 'blood',
            fastingRequired: false
          }
        }
      ]
    },
    Error: {
      error: 'Error Type',
      message: 'Error message description',
      details: []
    },
    Success: {
      success: true,
      message: 'Operation completed successfully',
      data: {}
    },
    Pagination: {
      page: 1,
      limit: 10,
      total: 100,
      pages: 10
    }
  },
  components: {
    schemas: {
      LoginRequest: {
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecurePassword123!'
          }
        }
      },
      RegisterRequest: {
        required: ['username', 'email', 'password', 'name'],
        properties: {
          username: {
            type: 'string',
            example: 'johndoe'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com'
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecurePassword123!'
          },
          confirmPassword: {
            type: 'string',
            format: 'password',
            example: 'SecurePassword123!'
          },
          name: {
            type: 'string',
            example: 'John Doe'
          },
          role: {
            type: 'string',
            enum: ['admin', 'doctor', 'patient', 'lab_technician', 'receptionist'],
            example: 'patient'
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Unauthorized - Invalid or missing authentication token',
        schema: {
          $ref: '#/definitions/Error'
        }
      },
      ForbiddenError: {
        description: 'Forbidden - Insufficient permissions',
        schema: {
          $ref: '#/definitions/Error'
        }
      },
      NotFoundError: {
        description: 'Not Found - Resource not found',
        schema: {
          $ref: '#/definitions/Error'
        }
      },
      ValidationError: {
        description: 'Bad Request - Validation error',
        schema: {
          $ref: '#/definitions/Error'
        }
      },
      ConflictError: {
        description: 'Conflict - Resource already exists or time slot conflict',
        schema: {
          $ref: '#/definitions/Error'
        }
      },
      ServerError: {
        description: 'Internal Server Error',
        schema: {
          $ref: '#/definitions/Error'
        }
      }
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = [
  './routes/authRoutes.js',
  './routes/patientRoutes.js',
  './routes/doctorRoutes.js',
  './routes/appointmentRoutes.js',
  './routes/medicalRecordRoutes.js',
  './routes/prescriptionRoutes.js',
  './routes/labOrderRoutes.js'
];

// Generate swagger documentation
swaggerAutogen(outputFile, endpointsFiles, doc).then(({ success }) => {
  console.log(`Swagger documentation generation ${success ? 'successful' : 'failed'}`);
  if (success) {
    console.log(`Documentation saved to ${outputFile}`);
  }
});

module.exports = doc;