import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const localizer = momentLocalizer(moment);

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user]);

  const fetchCalendarData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const [leavesRes, holidaysRes] = await Promise.all([
        axios.get('/api/leaves'),
        axios.get('/api/holidays')
      ]);

      const leaves = leavesRes.data;
      const userLeaves = user.role === 'employee' 
        ? leaves.filter(l => {
            const userId = l.userId?._id || l.userId?.id || l.userId;
            const currentUserId = user._id || user.id;
            return userId && currentUserId && userId.toString() === currentUserId.toString();
          })
        : leaves;

      const leaveEvents = userLeaves.map(leave => ({
        title: `${leave.userId?.name || 'Unknown'} - ${leave.type} (${leave.status})`,
        start: new Date(leave.startDate),
        end: new Date(new Date(leave.endDate).setHours(23, 59, 59)),
        resource: { type: 'leave', leave }
      }));

      const holidayEvents = holidaysRes.data.map(holiday => ({
        title: holiday.name,
        start: new Date(holiday.date),
        end: new Date(holiday.date),
        resource: { type: 'holiday', holiday },
        allDay: true
      }));

      setEvents([...leaveEvents, ...holidayEvents]);
      setHolidays(holidaysRes.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    if (event.resource?.type === 'holiday') {
      return {
        style: {
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none'
        }
      };
    }

    const status = event.resource?.leave?.status;
    let backgroundColor = '#1976d2';
    if (status === 'approved') backgroundColor = '#4caf50';
    if (status === 'rejected') backgroundColor = '#f44336';
    if (status === 'pending') backgroundColor = '#ff9800';

    return {
      style: {
        backgroundColor,
        color: 'white',
        border: 'none'
      }
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Calendar View
        </Typography>
        <Paper sx={{ p: 4, mt: 2, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading calendar...</Typography>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Calendar View
        </Typography>
        <Paper sx={{ p: 4, mt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Calendar View
      </Typography>
      <Paper sx={{ p: 2, mt: 2, height: '600px' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          defaultView="month"
          views={['month', 'week', 'day']}
        />
      </Paper>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Legend
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Chip label="Holiday" sx={{ bgcolor: '#f44336', color: 'white' }} />
          </Grid>
          <Grid item>
            <Chip label="Pending Leave" sx={{ bgcolor: '#ff9800', color: 'white' }} />
          </Grid>
          <Grid item>
            <Chip label="Approved Leave" sx={{ bgcolor: '#4caf50', color: 'white' }} />
          </Grid>
          <Grid item>
            <Chip label="Rejected Leave" sx={{ bgcolor: '#f44336', color: 'white' }} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Calendar;

