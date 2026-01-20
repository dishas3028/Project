const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';

const baseFields = {
  name: String,
  email: { type: String, index: true, unique: false },
  resumeFileName: String,
};

async function main() {
  await mongoose.connect(mongoUri);
  const studentSchema = new mongoose.Schema(baseFields, { timestamps: true });
  const Student = mongoose.model('StudentListDebug', studentSchema, 'students');
  const docs = await Student.find({}).select('name email resumeFileName').lean();
  console.log('Found', docs.length, 'students');
  docs.forEach(d => console.log(d));
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
