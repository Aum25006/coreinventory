const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

const sendOTP = async (email, phone, otp, type) => {
  try {
    // Send email OTP
    const emailSent = await emailService.sendOTPEmail(email, otp, type);
    
    // Send SMS OTP if phone number is available
    let smsSent = false;
    if (phone) {
      smsSent = await smsService.sendOTPSMS(phone, otp, type);
    }
    
    return { emailSent, smsSent };
  } catch (error) {
    console.error('OTP sending error:', error);
    // Fallback to console display
    console.log('\n' + '='.repeat(60));
    console.log('🔐 OTP NOTIFICATION (FALLBACK)');
    console.log('='.repeat(60));
    console.log(`📧 Email: ${email}`);
    if (phone) console.log(`� Phone: ${phone}`);
    console.log(`�🔢 OTP: ${otp}`);
    console.log(`📝 Purpose: ${type.toUpperCase()}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log('='.repeat(60));
    console.log('⚠️  Services failed - showing OTP in console');
    console.log('='.repeat(60) + '\n');
    return { emailSent: false, smsSent: false };
  }
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'warehouse_staff',
      phone,
    });

    const otp = user.setOTP('email');
    await user.save();

    // Send verification email
    await sendOTP(email, phone, otp, 'email verification');

    res.status(201).json({
      message: 'Registration successful. Please check your email for OTP verification.',
      userId: user._id,
      requiresOTP: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (!user.isOTPValid(otp, 'email')) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.clearOTP('email');
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login-otp-request', async (req, res) => {
  try {
    const { email, phone, identifier } = req.body;
    
    // Support both email and phone number login
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    } else if (identifier) {
      // Try email first, then phone
      user = await User.findOne({ email: identifier }) || await User.findOne({ phone: identifier });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const otp = user.setOTP('login');
    await user.save();

    // Send OTP to both email and phone
    const result = await sendOTP(user.email, user.phone, otp, 'login');

    let message = 'OTP sent for login';
    if (result.emailSent) message += ' via email';
    if (result.smsSent) message += ' and SMS';
    if (!result.emailSent && !result.smsSent) message += ' (check console for OTP)';

    res.json({
      message: message,
      requiresOTP: true,
      contactInfo: user.email || user.phone,
      deliveryMethods: {
        email: result.emailSent,
        sms: result.smsSent
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login-otp', async (req, res) => {
  try {
    const { email, phone, identifier, otp } = req.body;
    
    // Support both email and phone number login
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    } else if (identifier) {
      // Try email first, then phone
      user = await User.findOne({ email: identifier }) || await User.findOne({ phone: identifier });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isOTPValid(otp, 'login')) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.lastLogin = new Date();
    user.clearOTP('login');
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email, type = 'email' } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (type === 'email' && user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = user.setOTP(type);
    await user.save();

    const message = type === 'email' ? 'email verification' : 'password reset';
    await sendOTP(email, user.phone, otp, message);

    res.json({
      message: `OTP resent successfully for ${message}`,
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = user.setOTP('password');
    await user.save();

    await sendOTP(email, otp, 'password reset');

    res.json({
      message: 'Password reset OTP sent to your email',
      userId: user._id,
      requiresOTP: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isOTPValid(otp, 'password')) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.clearOTP('password');
    await user.save();

    res.json({
      message: 'Password reset successful',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password -emailVerificationOTP -passwordResetOTP');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
