const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['inventory_manager', 'warehouse_staff', 'admin'],
    default: 'warehouse_staff',
  },
  phone: {
    type: String,
    trim: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationOTP: {
    type: String,
  },
  emailVerificationOTPExpires: {
    type: Date,
  },
  passwordResetOTP: {
    type: String,
  },
  passwordResetOTPExpires: {
    type: Date,
  },
  loginOTP: {
    type: String,
  },
  loginOTPExpires: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

userSchema.methods.isOTPValid = function(otp, type = 'email') {
  const storedOTP = type === 'email' ? this.emailVerificationOTP : 
                   type === 'password' ? this.passwordResetOTP : 
                   this.loginOTP;
  const expires = type === 'email' ? this.emailVerificationOTPExpires : 
                 type === 'password' ? this.passwordResetOTPExpires : 
                 this.loginOTPExpires;
  
  return storedOTP === otp && expires > Date.now();
};

userSchema.methods.setOTP = function(type = 'email') {
  const otp = this.generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  if (type === 'email') {
    this.emailVerificationOTP = otp;
    this.emailVerificationOTPExpires = expires;
  } else if (type === 'password') {
    this.passwordResetOTP = otp;
    this.passwordResetOTPExpires = expires;
  } else if (type === 'login') {
    this.loginOTP = otp;
    this.loginOTPExpires = expires;
  }
  
  return otp;
};

userSchema.methods.clearOTP = function(type = 'email') {
  if (type === 'email') {
    this.emailVerificationOTP = undefined;
    this.emailVerificationOTPExpires = undefined;
  } else if (type === 'password') {
    this.passwordResetOTP = undefined;
    this.passwordResetOTPExpires = undefined;
  } else if (type === 'login') {
    this.loginOTP = undefined;
    this.loginOTPExpires = undefined;
  }
};

module.exports = mongoose.model('User', userSchema);
