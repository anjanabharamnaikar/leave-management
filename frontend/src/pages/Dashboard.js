import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeaves: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [recentLeaves, setRecentLeaves] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [leavesRes] = await Promise.all([
        axios.get('/api/leaves')
      ]);

      const leaves = leavesRes.data;
      const userLeaves = user.role === 'employee' 
        ? leaves.filter(l => l.userId._id === user.id)
        : leaves;

      setStats({
        totalLeaves: userLeaves.length,
        pending: userLeaves.filter(l => l.status === 'pending').length,
        approved: userLeaves.filter(l => l.status === 'approved').length,
        rejected: userLeaves.filter(l => l.status === 'rejected').length
      });

      setRecentLeaves(userLeaves.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card
      sx={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        position: 'relative',
        '&:hover': {
          borderColor: '#000000',
        },
        transition: 'all 0.2s ease',
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography
              sx={{
                color: '#666666',
                fontSize: '0.875rem',
                fontWeight: 500,
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#000000',
              }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              color: '#000000',
              '& svg': {
                fontSize: '3.5rem',
              },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Leaves"
            value={stats.totalLeaves}
            icon={<EventIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<PendingActionsIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={<CancelIcon />}
            color="error"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: '#ffffff',
              border: '1px solid #e0e0e0',
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: '#000000',
                mb: 2,
              }}
            >
              Leave Balance
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[
                { label: 'Casual', value: user?.leaveBalance?.casual || 0 },
                { label: 'Sick', value: user?.leaveBalance?.sick || 0 },
                { label: 'Earned', value: user?.leaveBalance?.earned || 0 },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    px: 2,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: '#f5f5f5',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#f0f0f0',
                      borderColor: '#000000',
                    },
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#000000' }}>
                    {item.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#000000',
                    }}
                  >
                    {item.value} days
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: '#ffffff',
              border: '1px solid #e0e0e0',
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: '#000000',
                mb: 2,
              }}
            >
              Recent Leaves
            </Typography>
            {recentLeaves.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No leaves found
              </Typography>
            ) : (
              recentLeaves.map((leave, index) => (
                <Box
                  key={leave._id}
                  sx={{
                    mt: index > 0 ? 1.5 : 0,
                    p: 2,
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#f0f0f0',
                      borderColor: '#000000',
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: '#000000' }}>
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: '#000000',
                        color: '#ffffff',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {leave.type}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: leave.status === 'approved' ? '#000000' : leave.status === 'rejected' ? '#666666' : '#333333',
                        color: '#ffffff',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {leave.status}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;

