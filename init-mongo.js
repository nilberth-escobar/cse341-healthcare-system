// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

// Switch to the hospital_management database
db = db.getSiblingDB('hospital_management');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'name', 'role'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30,
          description: 'Username must be a string between 3 and 30 characters'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Email must be a valid email address'
        },
        role: {
          enum: ['admin', 'doctor', 'patient', 'lab_technician', 'receptionist', 'nurse'],
          description: 'Role must be one of the allowed values'
        }
      }
    }
  }
});

db.createCollection('patients', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'contactInfo'],
      properties: {
        patientId: {
          bsonType: 'string',
          description: 'Unique patient identifier'
        },
        firstName: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 50
        },
        lastName: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 50
        },
        dateOfBirth: {
          bsonType: 'date',
          description: 'Date of birth must be a valid date'
        },
        gender: {
          enum: ['male', 'female', 'other', 'prefer_not_to_say']
        }
      }
    }
  }
});

db.createCollection('doctors');
db.createCollection('appointments');
db.createCollection('medicalrecords');
db.createCollection('prescriptions');
db.createCollection('laborders');

// Create indexes for better performance
print('Creating indexes...');

// User indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

// Patient indexes
db.patients.createIndex({ patientId: 1 }, { unique: true });
db.patients.createIndex({ 'contactInfo.email': 1 });
db.patients.createIndex({ 'contactInfo.phone': 1 });
db.patients.createIndex({ lastName: 1, firstName: 1 });
db.patients.createIndex({ dateOfBirth: 1 });
db.patients.createIndex({ primaryCarePhysician: 1 });

// Doctor indexes
db.doctors.createIndex({ doctorId: 1 }, { unique: true });
db.doctors.createIndex({ licenseNumber: 1 }, { unique: true });
db.doctors.createIndex({ specialty: 1 });
db.doctors.createIndex({ 'ratings.average': -1 });
db.doctors.createIndex({ isActive: 1, isAcceptingNewPatients: 1 });

// Appointment indexes
db.appointments.createIndex({ appointmentId: 1 }, { unique: true });
db.appointments.createIndex({ patient: 1, dateTime: 1 });
db.appointments.createIndex({ doctor: 1, dateTime: 1 });
db.appointments.createIndex({ status: 1 });
db.appointments.createIndex({ dateTime: 1 });
db.appointments.createIndex({ type: 1, status: 1 });

// Medical Record indexes
db.medicalrecords.createIndex({ recordId: 1 }, { unique: true });
db.medicalrecords.createIndex({ patient: 1, visitDate: -1 });
db.medicalrecords.createIndex({ doctor: 1 });
db.medicalrecords.createIndex({ isFinalized: 1 });

// Prescription indexes
db.prescriptions.createIndex({ prescriptionId: 1 }, { unique: true });
db.prescriptions.createIndex({ patient: 1, issueDate: -1 });
db.prescriptions.createIndex({ doctor: 1 });
db.prescriptions.createIndex({ status: 1 });
db.prescriptions.createIndex({ expiryDate: 1 });

// Lab Order indexes
db.laborders.createIndex({ labOrderId: 1 }, { unique: true });
db.laborders.createIndex({ patient: 1, orderDate: -1 });
db.laborders.createIndex({ doctor: 1 });
db.laborders.createIndex({ status: 1 });
db.laborders.createIndex({ priority: 1 });

print('Indexes created successfully');

// Create default admin user
const adminPassword = 'Admin123!@#'; // Change this in production
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Note: In actual deployment, use proper bcrypt hashing
// This is a simplified version for initialization
db.users.insertOne({
  username: 'admin',
  email: 'admin@hospital.com',
  name: 'System Administrator',
  password: '$2b$10$YourHashedPasswordHere', // Pre-hashed password
  role: 'admin',
  isActive: true,
  isVerified: true,
  permissions: [
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'patients.create',
    'patients.read',
    'patients.update',
    'patients.delete',
    'doctors.create',
    'doctors.read',
    'doctors.update',
    'doctors.delete',
    'appointments.create',
    'appointments.read',
    'appointments.update',
    'appointments.delete',
    'prescriptions.create',
    'prescriptions.read',
    'prescriptions.update',
    'prescriptions.delete',
    'laborders.create',
    'laborders.read',
    'laborders.update',
    'laborders.delete',
    'medicalrecords.create',
    'medicalrecords.read',
    'medicalrecords.update',
    'medicalrecords.delete',
    'system.configure',
    'system.maintain'
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Default admin user created');
print('Username: admin');
print('Email: admin@hospital.com');
print('Password: Admin123!@# (Please change immediately)');

// Create sample doctor
db.users.insertOne({
  username: 'dr.smith',
  email: 'dr.smith@hospital.com',
  name: 'Dr. Sarah Smith',
  password: '$2b$10$YourHashedPasswordHere', // Pre-hashed password
  role: 'doctor',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

const doctorUser = db.users.findOne({ email: 'dr.smith@hospital.com' });

db.doctors.insertOne({
  userId: doctorUser._id,
  doctorId: 'DOC' + Date.now(),
  firstName: 'Sarah',
  lastName: 'Smith',
  title: 'Dr.',
  specialty: 'Cardiology',
  licenseNumber: 'MD123456',
  licenseState: 'MA',
  licenseExpiry: new Date('2026-12-31'),
  npiNumber: '1234567890',
  experience: {
    yearsOfPractice: 10
  },
  consultationFees: {
    initial: 200,
    followUp: 150,
    emergency: 300,
    virtual: 175
  },
  contactInfo: {
    phone: '+1234567890',
    email: 'dr.smith@hospital.com',
    officeAddress: {
      street: '123 Medical Center Drive',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      country: 'USA'
    }
  },
  availability: {
    schedule: [
      {
        dayOfWeek: 'Monday',
        slots: [{
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true
        }]
      },
      {
        dayOfWeek: 'Tuesday',
        slots: [{
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true
        }]
      },
      {
        dayOfWeek: 'Wednesday',
        slots: [{
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true
        }]
      },
      {
        dayOfWeek: 'Thursday',
        slots: [{
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true
        }]
      },
      {
        dayOfWeek: 'Friday',
        slots: [{
          startTime: '09:00',
          endTime: '14:00',
          isAvailable: true
        }]
      }
    ],
    consultationDuration: 30,
    bufferTime: 5
  },
  languages: [
    { language: 'English', proficiency: 'Native' },
    { language: 'Spanish', proficiency: 'Fluent' }
  ],
  ratings: {
    average: 4.8,
    count: 150
  },
  isActive: true,
  isAcceptingNewPatients: true,
  maxPatientsPerDay: 20,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Sample doctor created');
print('Email: dr.smith@hospital.com');

// Create sample patient
db.users.insertOne({
  username: 'johndoe',
  email: 'john.doe@email.com',
  name: 'John Doe',
  password: '$2b$10$YourHashedPasswordHere', // Pre-hashed password
  role: 'patient',
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

const patientUser = db.users.findOne({ email: 'john.doe@email.com' });

db.patients.insertOne({
  userId: patientUser._id,
  patientId: 'PAT' + Date.now(),
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1980-05-15'),
  gender: 'male',
  bloodGroup: 'O+',
  contactInfo: {
    phone: '+1234567891',
    email: 'john.doe@email.com'
  },
  address: {
    street: '456 Oak Street',
    city: 'Boston',
    state: 'MA',
    zipCode: '02102',
    country: 'USA'
  },
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'spouse',
    phone: '+1234567892'
  },
  insurance: {
    provider: 'Blue Cross Blue Shield',
    policyNumber: 'BC123456789',
    groupNumber: 'GRP001',
    effectiveDate: new Date('2024-01-01'),
    expirationDate: new Date('2025-12-31')
  },
  medicalHistory: {
    allergies: [
      {
        allergen: 'Penicillin',
        severity: 'moderate',
        reaction: 'Rash and itching'
      }
    ],
    chronicConditions: [],
    surgeries: [],
    medications: [],
    immunizations: [
      {
        vaccine: 'COVID-19',
        date: new Date('2024-09-01'),
        nextDueDate: new Date('2025-09-01')
      }
    ]
  },
  vitalSigns: {
    height: {
      value: 175,
      unit: 'cm',
      lastUpdated: new Date()
    },
    weight: {
      value: 75,
      unit: 'kg',
      lastUpdated: new Date()
    },
    bmi: {
      value: 24.5,
      lastUpdated: new Date()
    }
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Sample patient created');
print('Email: john.doe@email.com');

// Grant permissions for sample data
db.users.updateMany(
  { role: 'admin' },
  {
    $addToSet: {
      permissions: {
        $each: [
          'system.reset',
          'system.backup',
          'system.restore'
        ]
      }
    }
  }
);

print('');
print('===========================================');
print('Hospital Management System Database Initialized');
print('===========================================');
print('');
print('Default credentials:');
print('Admin: admin@hospital.com / Admin123!@#');
print('Doctor: dr.smith@hospital.com / Doctor123!');
print('Patient: john.doe@email.com / Patient123!');
print('');
print('IMPORTANT: Change all passwords immediately in production!');
print('===========================================');