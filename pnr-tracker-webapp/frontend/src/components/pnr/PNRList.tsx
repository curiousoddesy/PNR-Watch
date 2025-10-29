import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Fab,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Train as TrainIcon,
  FlashOn as FlashOnIcon,
} from '@mui/icons-material';
import { TrackedPNR } from '../../types';
import { usePNR } from '../../contexts/PNRContext';
import { PNRCard } from './PNRCard';
import { PNRDetailDialog } from './PNRDetailDialog';
import { AddPNRForm } from './AddPNRForm';
import { webSocketService } from '../../services/websocket';

type SortOption = 'newest' | 'oldest' | 'status' | 'travelDate';
type FilterOption = 'all' | 'active' | 'expired' | 'confirmed' | 'waiting' | 'cancelled';

export const PNRList: React.FC = () => {
  const { 
    pnrs, 
    isLoading, 
    error, 
    checkingPNRs,
    fetchPNRs, 
    checkPNRStatus, 
    checkAllPNRs, 
    removePNR, 
    clearError 
  } = usePNR();

  const [selectedPNR, setSelectedPNR] = useState<TrackedPNR | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [refreshingPNRs, setRefreshingPNRs] = useState<Set<string>>(new Set());
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  useEffect(() => {
    loadPNRs();
  }, []);

  const loadPNRs = async () => {
    try {
      await fetchPNRs();
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleRefreshPNR = async (pnrId: string) => {
    setRefreshingPNRs(prev => new Set(prev).add(pnrId));
    try {
      await checkPNRStatus(pnrId);
    } catch (error) {
      // Error is handled by the context
    } finally {
      setRefreshingPNRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(pnrId);
        return newSet;
      });
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      await checkAllPNRs();
    } catch (error) {
      // Error is handled by the context
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleRealTimeRefreshAll = () => {
    webSocketService.requestAllPNRStatusCheck();
  };

  const handleRemovePNR = async (pnrId: string) => {
    try {
      await removePNR(pnrId);
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleViewDetails = (pnr: TrackedPNR) => {
    setSelectedPNR(pnr);
    setDetailDialogOpen(true);
  };

  const handleAddPNRSuccess = () => {
    setShowAddForm(false);
  };

  // Filter and sort PNRs
  const filteredAndSortedPNRs = React.useMemo(() => {
    let filtered = pnrs.filter(pnr => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          pnr.pnr.includes(searchTerm) ||
          pnr.currentStatus.from?.toLowerCase().includes(searchLower) ||
          pnr.currentStatus.to?.toLowerCase().includes(searchLower) ||
          pnr.currentStatus.status?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    // Status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(pnr => {
        const status = pnr.currentStatus.status?.toLowerCase() || '';
        const isExpired = pnr.currentStatus.date ? new Date(pnr.currentStatus.date) < new Date() : false;
        
        switch (filterBy) {
          case 'active':
            return !isExpired && !pnr.currentStatus.isFlushed;
          case 'expired':
            return isExpired || pnr.currentStatus.isFlushed;
          case 'confirmed':
            return status.includes('confirmed') || status.includes('cnf');
          case 'waiting':
            return status.includes('waiting') || status.includes('wl');
          case 'cancelled':
            return status.includes('cancelled') || status.includes('can');
          default:
            return true;
        }
      });
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'status':
          return a.currentStatus.status.localeCompare(b.currentStatus.status);
        case 'travelDate':
          const dateA = a.currentStatus.date ? new Date(a.currentStatus.date).getTime() : 0;
          const dateB = b.currentStatus.date ? new Date(b.currentStatus.date).getTime() : 0;
          return dateB - dateA;
        default:
          return 0;
      }
    });
  }, [pnrs, searchTerm, sortBy, filterBy]);

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrainIcon color="primary" />
          My PNRs
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<FlashOnIcon />}
            onClick={handleRealTimeRefreshAll}
            disabled={pnrs.length === 0 || checkingPNRs.size > 0}
            color="secondary"
          >
            Live Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={isRefreshingAll ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefreshAll}
            disabled={isRefreshingAll || pnrs.length === 0}
          >
            {isRefreshingAll ? 'Refreshing...' : 'Refresh All'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            Add PNR
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Add PNR Form */}
      {showAddForm && (
        <AddPNRForm onSuccess={handleAddPNRSuccess} />
      )}

      {/* Search and Filter Controls */}
      {pnrs.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search PNRs, stations, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by</InputLabel>
                <Select
                  value={filterBy}
                  label="Filter by"
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                  startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value="all">All PNRs</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="waiting">Waiting List</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort by"
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="travelDate">Travel Date</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* PNR List */}
      {filteredAndSortedPNRs.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          {pnrs.length === 0 ? (
            <Box>
              <TrainIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No PNRs tracked yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Add your first PNR to start tracking its status
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowAddForm(true)}
              >
                Add Your First PNR
              </Button>
            </Box>
          ) : (
            <Box>
              <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No PNRs match your search
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search terms or filters
              </Typography>
            </Box>
          )}
        </Paper>
      ) : (
        <Box>
          {/* Results Summary */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredAndSortedPNRs.length} of {pnrs.length} PNRs
            </Typography>
            {searchTerm || filterBy !== 'all' ? (
              <Button
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setFilterBy('all');
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </Box>

          {/* PNR Cards */}
          <Grid container spacing={2}>
            {filteredAndSortedPNRs.map((pnr) => (
              <Grid item xs={12} md={6} lg={4} key={pnr.id}>
                <PNRCard
                  pnr={pnr}
                  onRefresh={handleRefreshPNR}
                  onRemove={handleRemovePNR}
                  onViewDetails={handleViewDetails}
                  isRefreshing={refreshingPNRs.has(pnr.id)}
                  isRealTimeChecking={checkingPNRs.has(pnr.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Floating Action Button for Mobile */}
      {!showAddForm && (
        <Tooltip title="Add PNR">
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', md: 'none' },
            }}
            onClick={() => setShowAddForm(true)}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      )}

      {/* PNR Detail Dialog */}
      <PNRDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        pnr={selectedPNR}
        onRefresh={handleRefreshPNR}
      />
    </Box>
  );
};