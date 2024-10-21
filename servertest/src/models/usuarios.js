// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  telefono: {
    type: Number,
  },
  fecha_registro: {
    type: Date,
  },
  casco_id: {
    type: String,
  },
  password: {
    type: String,
    required: true
  },
  resetPasswordToken: {
    type:String

  },
  resetPasswordExpires: {
    type:Date

  },
});

module.exports = mongoose.model('users', UserSchema, 'usuarios');
