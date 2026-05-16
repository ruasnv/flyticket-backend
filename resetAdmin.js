require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function resetAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(' Connected');

  await Admin.deleteMany({});
  const admin = new Admin({
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD
  });
  await admin.save();
  console.log(` Admin recreated — username: ${process.env.ADMIN_USERNAME}`);
  process.exit(0);
}

resetAdmin().catch(err => {
  console.error('x', err.message);
  process.exit(1);
});