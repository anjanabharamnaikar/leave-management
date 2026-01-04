import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ApplyLeave = () => {
  const { user } = useAuth();
  const [type, setType] = useState('casual');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (endDate.isBefore(startDate)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/leaves', {
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason
      });
      setSuccess(true);
      setType('casual');
      setStartDate(null);
      setEndDate(null);
      setReason('');
    } catch (error) {
      setError(error.response?.data?.message || 'Error applying for leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: '#000000',
          mb: 3,
        }}
      >
        Apply for Leave
      </Typography>
      <Paper
        sx={{
          p: 4,
          mt: 2,
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Leave application submitted successfully!
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            select
            fullWidth
            label="Leave Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            margin="normal"
            required
          >
            <MenuItem value="casual">Casual</MenuItem>
            <MenuItem value="sick">Sick</MenuItem>
            <MenuItem value="earned">Earned</MenuItem>
          </TextField>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              minDate={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true
                }
              }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              minDate={startDate || dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true
                }
              }}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="normal"
            required
          />

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Available Leave Balance:
            </Typography>
            <Typography variant="body1">
              Casual: {user?.leaveBalance?.casual || 0} days | 
              Sick: {user?.leaveBalance?.sick || 0} days | 
              Earned: {user?.leaveBalance?.earned || 0} days
            </Typography>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              py: 1.5,
              background: '#000000',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                background: '#333333',
              },
              transition: 'all 0.2s ease',
            }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Leave Application'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApplyLeave;

