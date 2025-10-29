import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Train as TrainIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { usePNR } from '../contexts/PNRContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { pnrs, isLoading, error, fetchPNRs, checkAllPNRs } = usePNR();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (pnrs.length === 0 && !isLoading) {
      fetchPNRs();
    }
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await checkAllPNRs();
    } catch (error) {
      // Error is handled by the context
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = pnrs.length;
    const confirmed = pnrs.filter(pnr => 
      pnr.currentStatus.status?.toLowerCase().includes('confirmed') || 
      pnr.currentStatus.status?.toLowerCase().includes('cnf')
    ).length;
    const waiting = pnrs.filter(pnr => 
      pnr.currentStatus.status?.toLowerCase().includes('waiting') || 
      pnr.currentStatus.status?.toLowerCase().includes('wl')
    ).length;
    const expired = pnrs.filter(pnr => {
      if (pnr.currentStatus.isFlushed) return true;
      if (!pnr.currentStatus.date) return false;
      return new Date(pnr.currentStatus.date) < new Date();
    }).length;
    const active = total - expired;

    return { total, confirmed, waiting, expired, active };
  }, [pnrs]);

  // Get recent PNRs (last 3)
  const recentPNRs = React.useMemo(() => {
    return [...pnrs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [pnrs]);

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirmed') || statusLower.includes('cnf')) return 'success';
    if (statusLower.includes('waiting') || statusLower.includes('wl')) return 'warning';
    if (statusLower.includes('cancelled') || statusLower.includes('can')) return 'error';
    if (statusLower.includes('rac')) return 'info';
    return 'default';
  };

  if (isLoading && pnrs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefreshAll}
            disabled={isRefreshing || pnrs.length === 0}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pnrs')}
          >
            Add PNR
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {pnrs.length === 0 ? (
        /* Empty State */
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <TrainIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Welcome to PNR Tracker
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              Start tracking your railway PNRs to get real-time status updates and notifications.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => navigate('/pnrs')}
            >
              Add Your First PNR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* Statistics Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total PNRs
                    </Typography>
                    <Typography variant="h4">
                      {stats.total}
                    </Typography>
                  </Box>
                  <TrainIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Confirmed
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats.confirmed}
                    </Typography>
                  </Box>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Waiting List
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {stats.waiting}
                    </Typography>
                  </Box>
                  <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Active
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {stats.active}
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent PNRs */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Recent PNRs
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate('/pnrs')}
                  >
                    View All
                  </Button>
                </Box>
                
                {recentPNRs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No PNRs added yet
                  </Typography>
                ) : (
                  <Box>
                    {recentPNRs.map((pnr) => (
                      <Box
                        key={pnr.id}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        py={1}
                        borderBottom="1px solid"
                        borderColor="divider"
                        sx={{ '&:last-child': { borderBottom: 'none' } }}
                      >
                        <Box>
                          <Typography variant="subtitle2">
                            {pnr.pnr}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {pnr.currentStatus.from} → {pnr.currentStatus.to}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Added {formatDistanceToNow(new Date(pnr.createdAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Chip
                            label={pnr.currentStatus.status}
                            color={getStatusColor(pnr.currentStatus.status)}
                            size="small"
                          />
                          {pnr.currentStatus.isFlushed && (
                            <Box mt={0.5}>
                              <Chip
                                label="Flushed"
                                color="error"
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};