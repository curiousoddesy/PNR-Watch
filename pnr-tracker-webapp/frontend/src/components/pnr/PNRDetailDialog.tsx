import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Train as TrainIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { TrackedPNR, PNRStatusHistory } from '../../types';
import { formatPNR } from '../../utils/validation';
import { format, formatDistanceToNow } from 'date-fns';
import { apiClient } from '../../services/api';
import { RealTimeStatusIndicator } from './RealTimeStatusIndicator';
import { ManualRefreshButton } from './ManualRefreshButton';

interface PNRDetailDialogProps {
  open: boolean;
  onClose: () => void;
  pnr: TrackedPNR | null;
  onRefresh?: (pnrId: string) => Promise<void>;
}

export const PNRDetailDialog: React.FC<PNRDetailDialogProps> = ({
  open,
  onClose,
  pnr,
  onRefresh,
}) => {
  const [history, setHistory] = useState<PNRStatusHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (open && pnr) {
      loadHistory();
    }
  }, [open, pnr]);

  const loadHistory = async () => {
    if (!pnr) return;

    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      // Use the status history from the PNR object if available, otherwise fetch from API
      if (pnr.statusHistory && pnr.statusHistory.length > 0) {
        setHistory(pnr.statusHistory);
      } else {
        const historyData = await apiClient.getPNRHistory(pnr.id);
        // Convert PNRStatusResult[] to PNRStatusHistory[]
        const formattedHistory: PNRStatusHistory[] = historyData.map((status, index) => ({
          id: `${pnr.id}-${index}`,
          trackedPnrId: pnr.id,
          statusData: status,
          checkedAt: status.lastUpdated,
          statusChanged: index === 0 || status.status !== historyData[index - 1]?.status,
        }));
        setHistory(formattedHistory);
      }
    } catch (error: any) {
      setHistoryError(error.response?.data?.message || 'Failed to load PNR history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRefresh = async () => {
    if (!pnr || !onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh(pnr.id);
      // Reload history after refresh
      await loadHistory();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsRefreshing(false);
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

  if (!pnr) return null;

  const currentStatus = pnr.currentStatus;
  const hasError = !!currentStatus.error;
  const isFlushed = currentStatus.isFlushed;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <TrainIcon color="primary" />
            <Typography variant="h6">
              PNR {formatPNR(pnr.pnr)}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {onRefresh && (
              <ManualRefreshButton
                pnrId={pnr.id}
                variant="icon"
                size="small"
                isRefreshing={isRefreshing}
                onTraditionalRefresh={handleRefresh}
              />
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Current Status Section */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrainIcon color="primary" />
            Current Status
          </Typography>
          
          {hasError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {currentStatus.error}
            </Alert>
          ) : isFlushed ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This PNR has been flushed or expired from the system
            </Alert>
          ) : (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <LocationIcon color="action" />
                <Typography variant="body1">
                  <strong>{currentStatus.from}</strong> → <strong>{currentStatus.to}</strong>
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <CalendarIcon color="action" />
                <Typography variant="body1">
                  {currentStatus.date ? format(new Date(currentStatus.date), 'EEEE, MMMM dd, yyyy') : 'Date not available'}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip 
                  label={currentStatus.status} 
                  color={getStatusColor(currentStatus.status)}
                  size="medium"
                />
              </Box>
            </Box>
          )}
          
          <RealTimeStatusIndicator
            isChecking={isRefreshing}
            lastUpdated={currentStatus.lastUpdated}
            hasError={hasError}
            errorMessage={currentStatus.error}
            showManualRefresh={false}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Status History Section */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            Status History
          </Typography>
          
          {isLoadingHistory ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          ) : historyError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {historyError}
            </Alert>
          ) : history.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No status history available
            </Typography>
          ) : (
            <List>
              {history
                .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
                .map((historyItem, index) => (
                  <ListItem key={historyItem.id} divider={index < history.length - 1}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            label={historyItem.statusData.status} 
                            color={getStatusColor(historyItem.statusData.status)}
                            size="small"
                          />
                          {historyItem.statusChanged && (
                            <Chip 
                              label="Status Changed" 
                              color="info" 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(historyItem.checkedAt), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                          {historyItem.statusData.from && historyItem.statusData.to && (
                            <Typography variant="body2" color="text.secondary">
                              {historyItem.statusData.from} → {historyItem.statusData.to}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};