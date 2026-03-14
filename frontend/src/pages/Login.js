import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loginType, setLoginType] = useState('password'); // 'password' or 'otp'
  const [loginIdentifier, setLoginIdentifier] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'warehouse_staff',
    phone: '',
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showOTP, setShowOTP] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const steps = isLogin ? ['Login'] : ['Register', 'Verify Email'];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLoginOTPRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const identifier = loginIdentifier === 'email' ? formData.email : formData.phone;
      if (!identifier) {
        setError(`Please enter your ${loginIdentifier}`);
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/auth/login-otp-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier,
          [loginIdentifier]: identifier 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setSuccess(data.message);
      setShowOTP(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const identifier = loginIdentifier === 'email' ? formData.email : formData.phone;
      
      const response = await fetch('http://localhost:5000/api/auth/login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier,
          [loginIdentifier]: identifier,
          otp 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Registration successful! Please check your email for OTP.');
        setActiveStep(1);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        setSuccess('Email verified successfully! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          type: 'email',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP resent successfully!');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password reset OTP sent to your email!');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setActiveStep(0);
    setError('');
    setSuccess('');
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'warehouse_staff',
      phone: '',
    });
    setOtp('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        }}
      >
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          � CoreInventory Admin
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Administrator Login Portal
        </Typography>

        {!isLogin && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {isLogin ? (
            <>
              {/* Login Type Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Login Method:</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant={loginType === 'password' ? 'contained' : 'outlined'}
                    onClick={() => setLoginType('password')}
                    size="small"
                  >
                    Password
                  </Button>
                  <Button
                    variant={loginType === 'otp' ? 'contained' : 'outlined'}
                    onClick={() => setLoginType('otp')}
                    size="small"
                  >
                    OTP
                  </Button>
                </Box>
              </Box>

              {/* Identifier Type Selection for OTP */}
              {loginType === 'otp' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Login with:</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant={loginIdentifier === 'email' ? 'contained' : 'outlined'}
                      onClick={() => setLoginIdentifier('email')}
                      size="small"
                    >
                      Email
                    </Button>
                    <Button
                      variant={loginIdentifier === 'phone' ? 'contained' : 'outlined'}
                      onClick={() => setLoginIdentifier('phone')}
                      size="small"
                    >
                      Phone
                    </Button>
                  </Box>
                </Box>
              )}

              {!showOTP ? (
                <form onSubmit={loginType === 'password' ? handleLogin : handleLoginOTPRequest}>
                  <TextField
                    fullWidth
                    label={loginType === 'otp' ? (loginIdentifier === 'email' ? 'Email' : 'Phone Number') : 'Email'}
                    name={loginType === 'otp' ? loginIdentifier : 'email'}
                    type={loginType === 'otp' && loginIdentifier === 'phone' ? 'tel' : (loginType === 'otp' ? 'email' : 'email')}
                    value={loginType === 'otp' ? (loginIdentifier === 'email' ? formData.email : formData.phone) : formData.email}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                  />
                  
                  {loginType === 'password' && (
                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      margin="normal"
                      required
                    />
                  )}

                  {loginType === 'password' && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Link
                        component="button"
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                        sx={{ fontSize: '0.875rem' }}
                      >
                        Forgot Password?
                      </Link>
                    </Box>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{ mt: 2, mb: 2 }}
                  >
                    {loading ? (loginType === 'password' ? 'Logging in...' : 'Sending OTP...') : 
                             loginType === 'password' ? 'Login' : 'Send OTP'}
                  </Button>

                  <Box textAlign="center">
                    <Typography variant="body2">
                      Don't have an account?{' '}
                      <Link component="button" type="button" onClick={toggleMode}>
                        Register here
                      </Link>
                    </Typography>
                  </Box>
                </form>
              ) : (
                <form onSubmit={handleLoginOTP}>
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" color="textSecondary">
                      Enter the OTP sent to {loginIdentifier === 'email' ? formData.email : formData.phone}
                    </Typography>
                  </Paper>
                  <TextField
                    fullWidth
                    label="OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    margin="normal"
                    required
                    inputProps={{ maxLength: 6 }}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{ mt: 2, mb: 2 }}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                  <Box textAlign="center">
                    <Link
                      component="button"
                      type="button"
                      onClick={() => {
                        setShowOTP(false);
                        setOtp('');
                      }}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      Back to Login
                    </Link>
                  </Box>
                </form>
              )}
            </>
          ) : (
            <>
              {activeStep === 0 && (
                <form onSubmit={handleRegister}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    select
                    label="Role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                  >
                    <option value="warehouse_staff">Warehouse Staff</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="admin">Admin</option>
                  </TextField>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{ mt: 2, mb: 2 }}
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </Button>
                  <Box textAlign="center">
                    <Typography variant="body2">
                      Already have an account?{' '}
                      <Link component="button" type="button" onClick={toggleMode}>
                        Login here
                      </Link>
                    </Typography>
                  </Box>
                </form>
              )}

              {activeStep === 1 && (
                <form onSubmit={handleVerifyEmail}>
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" color="textSecondary">
                      We've sent a verification OTP to {formData.email}. 
                      Please enter it below to verify your email.
                    </Typography>
                  </Paper>
                  <TextField
                    fullWidth
                    label="OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    margin="normal"
                    required
                    inputProps={{ maxLength: 6 }}
                  />
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Link
                      component="button"
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      Resend OTP
                    </Link>
                  </Box>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{ mt: 2, mb: 2 }}
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </Button>
                </form>
              )}
            </>
          )}
        </Paper>
    </Box>
  );
};

export default Login;
