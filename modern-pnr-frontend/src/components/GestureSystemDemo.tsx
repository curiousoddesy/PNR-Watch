import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SwipeableCard,
  PinchZoomContainer,
  PullToRefreshContainer,
  LongPressButton,
  GestureNavigation,
} from './ui/GestureComponents';
import { ResponsiveLayout, ResponsiveGrid, TouchOptimizedCard } from './ui';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { useGestures } from '../hooks/useGestures';

export const GestureSystemDemo: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'PNR 1234567890', message: 'Train confirmed - A1, 23', type: 'success' },
    { id: 2, title: 'PNR 0987654321', message: 'Waiting list - WL 15', type: 'warning' },
    { id: 3, title: 'PNR 5678901234', message: 'Journey completed', type: 'info' },
    { id: 4, title: 'PNR 4321098765', message: 'Cancelled due to technical issues', type: 'error' },
  ]);
  const [longPressCount, setLongPressCount] = useState(0);
  const [gestureLog, setGestureLog] = useState<string[]>([]);

  const { touchSupport, isMobile } = useDeviceDetection();

  const addToGestureLog = (gesture: string) => {
    setGestureLog(prev => [`${new Date().toLocaleTimeString()}: ${gesture}`, ...prev.slice(0, 9)]);
  };

  const pages = [
    'Swipe Cards',
    'Pinch Zoom',
    'Pull to Refresh',
    'Long Press',
    'Navigation'
  ];

  const handleSwipeLeft = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    addToGestureLog(`Swiped left on notification ${id} - Deleted`);
  };

  const handleSwipeRight = (id: number) => {
    addToGestureLog(`Swiped right on notification ${id} - Marked as read`);
  };

  const handleRefresh = async () => {
    addToGestureLog('Pull to refresh triggered');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshCount(prev => prev + 1);
    addToGestureLog('Refresh completed');
  };

  const handleLongPress = () => {
    setLongPressCount(prev => prev + 1);
    addToGestureLog('Long press detected');
  };

  const { ref: navigationRef } = useGestures({
    onSwipeLeft: () => {
      if (currentPage < pages.length - 1) {
        setCurrentPage(prev => prev + 1);
        addToGestureLog('Swiped left - Next page');
      }
    },
    onSwipeRight: () => {
      if (currentPage > 0) {
        setCurrentPage(prev => prev - 1);
        addToGestureLog('Swiped right - Previous page');
      }
    },
  }, {
    swipeThreshold: 50,
    enableHapticFeedback: true,
  });

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'primary';
    }
  };

  const renderSwipeCardsDemo = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-contrast mb-2">Swipe Cards Demo</h3>
        <p className="text-sm text-contrast-secondary">
          {touchSupport ? 'Swipe left to delete, right to mark as read' : 'Touch gestures not supported on this device'}
        </p>
      </div>
      
      <div className="space-y-3">
        {notifications.map((notification) => (
          <SwipeableCard
            key={notification.id}
            onSwipeLeft={() => handleSwipeLeft(notification.id)}
            onSwipeRight={() => handleSwipeRight(notification.id)}
            leftAction={{
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ),
              label: 'Delete',
              color: 'error',
            }}
            rightAction={{
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ),
              label: 'Mark Read',
              color: getNotificationColor(notification.type),
            }}
            className="bg-surface"
          >
            <div className="flex items-start space-x-3">
              <div className={`w-3 h-3 rounded-full mt-2 bg-${getNotificationColor(notification.type)}`} />
              <div className="flex-1">
                <h4 className="font-medium text-contrast">{notification.title}</h4>
                <p className="text-sm text-contrast-secondary mt-1">{notification.message}</p>
              </div>
            </div>
          </SwipeableCard>
        ))}
      </div>
      
      {notifications.length === 0 && (
        <div className="text-center py-8">
          <p className="text-contrast-secondary">All notifications cleared!</p>
          <button
            onClick={() => setNotifications([
              { id: Date.now() + 1, title: 'New PNR Added', message: 'PNR 1111111111 has been added', type: 'success' },
              { id: Date.now() + 2, title: 'Status Update', message: 'Your train is running on time', type: 'info' },
            ])}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Add Sample Notifications
          </button>
        </div>
      )}
    </div>
  );

  const renderPinchZoomDemo = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-contrast mb-2">Pinch to Zoom Demo</h3>
        <p className="text-sm text-contrast-secondary">
          {touchSupport ? 'Use two fingers to pinch and zoom the image' : 'Pinch gestures not supported on this device'}
        </p>
      </div>
      
      <PinchZoomContainer
        className="border border-default rounded-lg overflow-hidden"
        minScale={0.5}
        maxScale={3}
      >
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-8 text-center">
          <div className="bg-surface rounded-lg p-6 shadow-lg">
            <h4 className="text-xl font-bold text-contrast mb-4">Train Schedule</h4>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-contrast-secondary">Departure:</span>
                <span className="text-contrast font-medium">08:30 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-contrast-secondary">Arrival:</span>
                <span className="text-contrast font-medium">02:45 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-contrast-secondary">Platform:</span>
                <span className="text-contrast font-medium">Platform 3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-contrast-secondary">Coach:</span>
                <span className="text-contrast font-medium">A1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-contrast-secondary">Seat:</span>
                <span className="text-contrast font-medium">23, 24</span>
              </div>
            </div>
          </div>
        </div>
      </PinchZoomContainer>
    </div>
  );

  const renderPullToRefreshDemo = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-contrast mb-2">Pull to Refresh Demo</h3>
        <p className="text-sm text-contrast-secondary">
          {touchSupport ? 'Pull down from the top to refresh' : 'Pull to refresh not supported on this device'}
        </p>
        <p className="text-xs text-contrast-secondary mt-1">
          Refreshed {refreshCount} times
        </p>
      </div>
      
      <PullToRefreshContainer
        onRefresh={handleRefresh}
        className="h-64 border border-default rounded-lg"
      >
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <TouchOptimizedCard key={item} className="p-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-primary font-medium">{item}</span>
                </div>
                <div>
                  <h4 className="font-medium text-contrast">PNR Item {item}</h4>
                  <p className="text-sm text-contrast-secondary">Updated {refreshCount} times</p>
                </div>
              </div>
            </TouchOptimizedCard>
          ))}
        </div>
      </PullToRefreshContainer>
    </div>
  );

  const renderLongPressDemo = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-contrast mb-2">Long Press Demo</h3>
        <p className="text-sm text-contrast-secondary">
          {touchSupport ? 'Press and hold the button for 500ms' : 'Long press not supported on this device'}
        </p>
        <p className="text-xs text-contrast-secondary mt-1">
          Long pressed {longPressCount} times
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-4">
        <LongPressButton
          onLongPress={handleLongPress}
          onTap={() => addToGestureLog('Button tapped (short press)')}
          variant="primary"
          size="lg"
          className="w-48"
        >
          Long Press Me
        </LongPressButton>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <LongPressButton
            onLongPress={() => addToGestureLog('Delete action triggered')}
            variant="outline"
            size="md"
            longPressDelay={1000}
          >
            Delete (1s)
          </LongPressButton>
          
          <LongPressButton
            onLongPress={() => addToGestureLog('Archive action triggered')}
            variant="secondary"
            size="md"
            longPressDelay={750}
          >
            Archive (0.75s)
          </LongPressButton>
        </div>
      </div>
    </div>
  );

  const renderNavigationDemo = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-contrast mb-2">Gesture Navigation Demo</h3>
        <p className="text-sm text-contrast-secondary">
          {touchSupport ? 'Swipe left/right to navigate between sections' : 'Gesture navigation not supported on this device'}
        </p>
      </div>
      
      <GestureNavigation
        onSwipeLeft={() => addToGestureLog('Navigated forward')}
        onSwipeRight={() => addToGestureLog('Navigated backward')}
        onSwipeUp={() => addToGestureLog('Swiped up - Could open menu')}
        onSwipeDown={() => addToGestureLog('Swiped down - Could close menu')}
        className="border border-default rounded-lg p-6 bg-surface"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-contrast">Swipe in any direction</h4>
          <p className="text-sm text-contrast-secondary">
            Try swiping left, right, up, or down in this area
          </p>
          <div className="flex justify-center space-x-2 text-xs text-contrast-secondary">
            <span>← Previous</span>
            <span>↑ Menu</span>
            <span>↓ Close</span>
            <span>→ Next</span>
          </div>
        </div>
      </GestureNavigation>
    </div>
  );

  return (
    <ResponsiveLayout className="bg-background min-h-screen">
      <div className={`max-w-4xl mx-auto p-4 ${isMobile ? 'pt-4 pb-20' : 'py-8'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-contrast mb-2">Advanced Gesture System</h1>
          <p className="text-contrast-secondary">
            {touchSupport 
              ? 'Interactive gesture demonstrations for mobile devices' 
              : 'This demo requires a touch-enabled device for full functionality'
            }
          </p>
        </div>

        {/* Page Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-1 bg-surface rounded-lg p-1 border border-default">
            {pages.map((page, index) => (
              <button
                key={page}
                onClick={() => setCurrentPage(index)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === index
                    ? 'bg-primary text-white'
                    : 'text-contrast-secondary hover:text-contrast hover:bg-primary/10'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div ref={navigationRef} className="mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentPage === 0 && renderSwipeCardsDemo()}
              {currentPage === 1 && renderPinchZoomDemo()}
              {currentPage === 2 && renderPullToRefreshDemo()}
              {currentPage === 3 && renderLongPressDemo()}
              {currentPage === 4 && renderNavigationDemo()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Gesture Log */}
        <TouchOptimizedCard className="mt-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-contrast">Gesture Log</h3>
              <button
                onClick={() => setGestureLog([])}
                className="text-sm text-primary hover:text-primary/80"
              >
                Clear Log
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {gestureLog.length === 0 ? (
                <p className="text-sm text-contrast-secondary italic">No gestures detected yet</p>
              ) : (
                gestureLog.map((log, index) => (
                  <div key={index} className="text-xs text-contrast-secondary font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </TouchOptimizedCard>

        {/* Device Info */}
        <TouchOptimizedCard className="mt-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-contrast">Device Capabilities</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-contrast-secondary">Touch Support:</span>
                <span className={`ml-2 ${touchSupport ? 'text-success' : 'text-error'}`}>
                  {touchSupport ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div>
                <span className="text-contrast-secondary">Mobile Device:</span>
                <span className={`ml-2 ${isMobile ? 'text-success' : 'text-info'}`}>
                  {isMobile ? '✓ Yes' : '✓ Desktop'}
                </span>
              </div>
            </div>
          </div>
        </TouchOptimizedCard>
      </div>
    </ResponsiveLayout>
  );
};