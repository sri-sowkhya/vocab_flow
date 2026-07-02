import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ override: true });

console.log(`[Mongo Pool Init] NODE_ENV: ${process.env.NODE_ENV}, describe: ${typeof global.describe}, argv: ${JSON.stringify(process.argv)}, MONGODB_URI before: ${process.env.MONGODB_URI}`);

if (process.env.NODE_ENV === 'test' || typeof global.describe === 'function' || process.argv.some(arg => arg.includes('jest'))) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/vocabflow_test';
  console.log(`[Mongo Pool Init] MONGODB_URI overridden to: ${process.env.MONGODB_URI}`);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vocabflow';
console.log(`[Mongo Pool Init] MONGODB_URI final: ${MONGODB_URI}`);

const connectMongo = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectMongo;
