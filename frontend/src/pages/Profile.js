import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  TextField,
  Button,
  Divider,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Badge,
  Edit,
  Save,
  Cancel,
  LocationOn,
  Schedule,
  Security,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'inventory_manager': return 'warning';
      case 'warehouse_staff': return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'inventory_manager': return 'Inventory Manager';
      case 'warehouse_staff': return 'Warehouse Staff';
      default: return 'User';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        User Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', height: 'fit-content' }}>
            <CardContent sx={{ py: 4 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '3rem',
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {user?.name}
              </Typography>
              <Chip
                label={getRoleLabel(user?.role)}
                color={getRoleColor(user?.role)}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              {user?.phone && (
                <Typography variant="body2" color="text.secondary">
                  {user?.phone}
                </Typography>
              )}
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEdit}
                  disabled={isEditing}
                >
                  Edit Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Person color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Full Name"
                    secondary={user?.name || 'Not set'}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <Email color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Address"
                    secondary={user?.email || 'Not set'}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <Phone color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone Number"
                    secondary={user?.phone || 'Not set'}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <Badge color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Role"
                    secondary={getRoleLabel(user?.role)}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Last Login"
                    secondary={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <Security color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Verification"
                    secondary={
                      <Chip
                        label={user?.isEmailVerified ? 'Verified' : 'Not Verified'}
                        color={user?.isEmailVerified ? 'success' : 'warning'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemIcon>
                    <LocationOn color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Account Status"
                    secondary={
                      <Chip
                        label={user?.isActive ? 'Active' : 'Inactive'}
                        color={user?.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {user?.role === 'admin' ? '👑' : user?.role === 'inventory_manager' ? '📊' : '📦'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getRoleLabel(user?.role)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      ✓
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.isEmailVerified ? 'Verified' : 'Pending'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      📅
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Member since {new Date(user?.createdAt || Date.now()).getFullYear()}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      🔔
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Notifications
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
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
          <TextField
            fullWidth
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" startIcon={<Save />}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
