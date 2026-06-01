const mongoose = require('mongoose');
// Handles password hashing and comparison
const bcrypt   = require('bcryptjs');

// Admin schema with username and password fields
// Defines the structure of the admin documents in the MongoDB collection
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Pre-save hook to hash the password before saving to the database
// Runs before saving an admin document, ensuring that the password is securely hashed
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare method for login
// Compares a plain text password with the hashed password stored in the database
adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Export the Admin model based on the adminSchema
module.exports = mongoose.model('Admin', adminSchema);