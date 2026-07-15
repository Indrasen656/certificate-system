// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'user', 'admin'], default: 'student' }
});

// Automatically hash password before saving to the DB
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return; // No next() needed here, just return

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // No next() needed here, Mongoose resolves when the async function finishes
});

module.exports = mongoose.model('User', UserSchema);