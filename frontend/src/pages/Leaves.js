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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Leaves = () => {
  const { user, isManager } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await axios.get('/api/leaves');
      setLeaves(response.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await axios.put(`/api/leaves/${selectedLeave._id}/approve`);
      setApproveDialog(false);
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error) {
      alert(error.response?.data?.message || 'Error approving leave');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await axios.put(`/api/leaves/${selectedLeave._id}/reject`, {
        rejectedReason: rejectReason
      });
      setRejectDialog(false);
      setRejectReason('');
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error) {
      alert(error.response?.data?.message || 'Error rejecting leave');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const canApprove = (leave) => {
    if (!isManager) return false;
    if (leave.status !== 'pending') return false;
    if (leave.userId._id === user.id) return false; // Can't approve own leave
    return true;
  };

  return (
    <Container maxWidth="lg">
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: '#000000',
          mb: 3,
        }}
      >
        Leaves
      </Typography>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 0,
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: '#f5f5f5',
                '& th': {
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  borderBottom: '2px solid #000000',
                },
              }}
            >
              <TableCell>Employee</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow
                key={leave._id}
                sx={{
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  },
                  transition: 'background-color 0.2s',
                  '& td': {
                    borderBottom: '1px solid #e0e0e0',
                  },
                }}
              >
                <TableCell>{leave.userId?.name || 'N/A'}</TableCell>
                <TableCell>{leave.type}</TableCell>
                <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                <TableCell>{leave.reason}</TableCell>
                <TableCell>
                  <Chip
                    label={leave.status}
                    color={getStatusColor(leave.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedLeave(leave)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                  {canApprove(leave) && (
                    <>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => {
                          setSelectedLeave(leave);
                          setApproveDialog(true);
                        }}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedLeave(leave);
                          setRejectDialog(true);
                        }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Leave Dialog */}
      <Dialog open={!!selectedLeave && !approveDialog && !rejectDialog} onClose={() => setSelectedLeave(null)}>
        <DialogTitle>Leave Details</DialogTitle>
        <DialogContent>
          {selectedLeave && (
            <Box>
              <Typography><strong>Employee:</strong> {selectedLeave.userId?.name}</Typography>
              <Typography><strong>Type:</strong> {selectedLeave.type}</Typography>
              <Typography><strong>Start Date:</strong> {new Date(selectedLeave.startDate).toLocaleDateString()}</Typography>
              <Typography><strong>End Date:</strong> {new Date(selectedLeave.endDate).toLocaleDateString()}</Typography>
              <Typography><strong>Reason:</strong> {selectedLeave.reason}</Typography>
              <Typography><strong>Status:</strong> {selectedLeave.status}</Typography>
              {selectedLeave.approvedBy && (
                <Typography><strong>Approved By:</strong> {selectedLeave.approvedBy?.name}</Typography>
              )}
              {selectedLeave.rejectedReason && (
                <Typography><strong>Rejection Reason:</strong> {selectedLeave.rejectedReason}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLeave(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)}>
        <DialogTitle>Approve Leave</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to approve this leave?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button onClick={handleApprove} color="success" variant="contained">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)}>
        <DialogTitle>Reject Leave</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRejectDialog(false);
            setRejectReason('');
          }}>
            Cancel
          </Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Leaves;

