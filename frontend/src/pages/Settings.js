import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Grid,
} from '@mui/material';
import {
  Notifications,
  Security,
  Palette,
  Language,
  Save,
  Edit,
  Lock,
  Email,
  Phone,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    darkMode: false,
    language: 'en',
    timezone: 'UTC',
  });
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSettingChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handlePasswordChange = async () => {
    try {
      setError('');
      setSuccess('');

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setPasswordDialog(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch('http://localhost:5000/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Settings
      </Typography>

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

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications />
                Notification Preferences
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive notifications via email"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="SMS Notifications"
                    secondary="Receive notifications via SMS"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.smsNotifications}
                      onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Push Notifications"
                    secondary="Receive browser push notifications"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Palette />
                Appearance
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Dark Mode"
                    secondary="Use dark theme"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.darkMode}
                      onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Language"
                    secondary="Select your preferred language"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </TextField>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Timezone"
                    secondary="Select your timezone"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      select
                      value={settings.timezone}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">EST</option>
                      <option value="PST">PST</option>
                      <option value="GMT">GMT</option>
                    </TextField>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security />
                Security
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Change Password"
                    secondary="Update your account password"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      startIcon={<Lock />}
                      onClick={() => setPasswordDialog(true)}
                    >
                      Change
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Two-Factor Authentication"
                    secondary="Add an extra layer of security"
                  />
                  <ListItemSecondaryAction>
                    <Button variant="outlined" disabled>
                      Coming Soon
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Login History"
                    secondary="View your recent login activity"
                  />
                  <ListItemSecondaryAction>
                    <Button variant="outlined" disabled>
                      View
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email />
                Account Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Email Address"
                    secondary={user?.email}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Phone Number"
                    secondary={user?.phone || 'Not set'}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Account Type"
                    secondary={user?.role?.replace('_', ' ').toUpperCase()}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Account Status"
                    secondary={user?.isActive ? 'Active' : 'Inactive'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleSaveSettings}
          sx={{ minWidth: 200 }}
        >
          Save All Settings
        </Button>
      </Box>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordChange} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
