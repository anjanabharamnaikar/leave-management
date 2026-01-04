import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Holidays = () => {
  const { isAdmin } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: null,
    type: 'national'
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await axios.get('/api/holidays');
      setHolidays(response.data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const handleOpen = (holiday = null) => {
    if (holiday) {
      setEditing(holiday);
      setFormData({
        name: holiday.name,
        date: dayjs(holiday.date),
        type: holiday.type
      });
    } else {
      setEditing(null);
      setFormData({
        name: '',
        date: null,
        type: 'national'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setFormData({
      name: '',
      date: null,
      type: 'national'
    });
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await axios.put(`/api/holidays/${editing._id}`, {
          name: formData.name,
          date: formData.date.toISOString(),
          type: formData.type
        });
      } else {
        await axios.post('/api/holidays', {
          name: formData.name,
          date: formData.date.toISOString(),
          type: formData.type
        });
      }
      handleClose();
      fetchHolidays();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving holiday');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await axios.delete(`/api/holidays/${id}`);
        fetchHolidays();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting holiday');
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          Holidays
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Add Holiday
          </Button>
        )}
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              {isAdmin && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday._id}>
                <TableCell>{holiday.name}</TableCell>
                <TableCell>{new Date(holiday.date).toLocaleDateString()}</TableCell>
                <TableCell>{holiday.type}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpen(holiday)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(holiday._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Holiday Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(newValue) => setFormData({ ...formData, date: newValue })}
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
            select
            fullWidth
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            margin="normal"
            required
          >
            <MenuItem value="national">National</MenuItem>
            <MenuItem value="regional">Regional</MenuItem>
            <MenuItem value="company">Company</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Holidays;

