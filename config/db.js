const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes
    await createIndexes();
    
    return conn;
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Ensure indexes are created for better performance
    const db = mongoose.connection.db;
    
    // Create indexes for patients collection
    await db.collection('patients').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('patients').createIndex({ dateOfBirth: 1 });
    await db.collection('patients').createIndex({ 'contactInfo.phone': 1 });
    
    // Create indexes for doctors collection
    await db.collection('doctors').createIndex({ email: 1 }, { unique: true });
    await db.collection('doctors').createIndex({ licenseNumber: 1 }, { unique: true });
    await db.collection('doctors').createIndex({ specialty: 1 });
    
    // Create indexes for appointments collection
    await db.collection('appointments').createIndex({ patient: 1, dateTime: 1 });
    await db.collection('appointments').createIndex({ doctor: 1, dateTime: 1 });
    await db.collection('appointments').createIndex({ status: 1 });
    await db.collection('appointments').createIndex({ dateTime: 1 });
    
    // Create indexes for medical records
    await db.collection('medicalrecords').createIndex({ patient: 1, visitDate: -1 });
    await db.collection('medicalrecords').createIndex({ doctor: 1 });
    
    // Create indexes for prescriptions
    await db.collection('prescriptions').createIndex({ patient: 1, issueDate: -1 });
    await db.collection('prescriptions').createIndex({ doctor: 1 });
    
    // Create indexes for lab orders
    await db.collection('laborders').createIndex({ patient: 1, orderDate: -1 });
    await db.collection('laborders').createIndex({ doctor: 1 });
    await db.collection('laborders').createIndex({ status: 1 });
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.warn('Some indexes may already exist:', error.message);
  }
};

module.exports = connectDB;