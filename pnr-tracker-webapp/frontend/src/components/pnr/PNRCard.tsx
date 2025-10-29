import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Train as TrainIcon,
} from '@mui/icons-material';
import { TrackedPNR } from '../../types';
import { formatPNR } from '../../utils/validation';
import { formatDistanceToNow, format } from 'date-fns';
import { RealTimeStatusIndicator } from './RealTimeStatusIndicator';
import { webSocketService } from '../../services/websocket';

interface PNRCardProps {
  pnr: TrackedPNR;
  onRefresh: (pnrId: string) => Promise<void>;
  onRemove: (pnrId: string) => Promise<void>;
  onViewDetails: (pnr: TrackedPNR) => void;
  isRefreshing?: boolean;
  isRealTimeChecking?: boolean;
}

export const PNRCard: React.FC<PNRCardProps> = ({
  pnr,
  onRefresh,
  onRemove,
  onViewDetails,
  isRefreshing = false,
  isRealTimeChecking = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = async () => {
    handleMenuClose();
    await onRefresh(pnr.id);
  };

  const handleRealTimeRefresh = () => {
    webSocketService.requestPNRStatusCheck(pnr.id);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(pnr.id);
      setDeleteDialogOpen(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsRemoving(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirmed') || statusLower.includes('cnf')) return 'success';
    if (statusLower.includes('waiting') || statusLower.includes('wl')) return 'warning';
    if (statusLower.includes('cancelled') || statusLower.includes('can')) return 'error';
    if (statusLower.includes('rac')) return 'info';
    return 'default';
  };

  const isExpired = () => {
    if (!pnr.currentStatus.date) return false;
    const travelDate = new Date(pnr.currentStatus.date);
    return travelDate < new Date();
  };

  const isFlushed = pnr.currentStatus.isFlushed;
  const hasError = !!pnr.currentStatus.error;

  return (
    <>
      <Card 
        sx={{ 
          mb: 2, 
          opacity: isExpired() || isFlushed ? 0.7 : 1,
          border: hasError ? '1px solid #f44336' : 'none'
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrainIcon color="primary" />
                {formatPNR(pnr.pnr)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Added {formatDistanceToNow(new Date(pnr.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title="Refresh status">
                <IconButton 
                  size="small" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          {hasError ? (
            <Box mb={2}>
              <Chip 
                label={`Error: ${pnr.currentStatus.error}`} 
                color="error" 
                size="small" 
                sx={{ mb: 1 }}
              />
            </Box>
          ) : isFlushed ? (
            <Box mb={2}>
              <Chip 
                label="PNR Flushed/Expired" 
                color="error" 
                size="small" 
                sx={{ mb: 1 }}
              />
            </Box>
          ) : (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  {pnr.currentStatus.from} → {pnr.currentStatus.to}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pnr.currentStatus.date ? format(new Date(pnr.currentStatus.date), 'MMM dd, yyyy') : 'N/A'}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Chip 
                  label={pnr.currentStatus.status} 
                  color={getStatusColor(pnr.currentStatus.status)}
                  size="small"
                />
                {isExpired() && (
                  <Chip 
                    label="Travel Completed" 
                    color="default" 
                    size="small" 
                  />
                )}
              </Box>
            </Box>
          )}

          <RealTimeStatusIndicator
            isChecking={isRefreshing || isRealTimeChecking}
            lastUpdated={pnr.currentStatus.lastUpdated}
            hasError={hasError}
            errorMessage={pnr.currentStatus.error}
            onManualRefresh={handleRealTimeRefresh}
            showManualRefresh={!isRefreshing && !isRealTimeChecking}
          />
        </CardContent>

        <CardActions>
          <Button 
            size="small" 
            startIcon={<HistoryIcon />}
            onClick={() => onViewDetails(pnr)}
          >
            View Details
          </Button>
        </CardActions>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshIcon sx={{ mr: 1 }} />
          Refresh Status
        </MenuItem>
        <MenuItem onClick={() => onViewDetails(pnr)}>
          <HistoryIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            setDeleteDialogOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Remove PNR
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove PNR</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove PNR {formatPNR(pnr.pnr)} from your tracking list? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRemove} 
            color="error" 
            variant="contained"
            disabled={isRemoving}
            startIcon={isRemoving ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};