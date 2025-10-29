import { useRef, useEffect, useCallback, useState } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

export interface GestureState {
  isActive: boolean;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  deltaX: number;
  deltaY: number;
  distance: number;
  velocity: { x: number; y: number };
  direction: 'left' | 'right' | 'up' | 'down' | null;
  scale: number;
  rotation: number;
  duration: number;
}

export interface GestureCallbacks {
  onSwipeLeft?: (state: GestureState) => void;
  onSwipeRight?: (state: GestureState) => void;
  onSwipeUp?: (state: GestureState) => void;
  onSwipeDown?: (state: GestureState) => void;
  onPinchStart?: (state: GestureState) => void;
  onPinch?: (state: GestureState) => void;
  onPinchEnd?: (state: GestureState) => void;
  onLongPress?: (state: GestureState) => void;
  onTap?: (state: GestureState) => void;
  onDoubleTap?: (state: GestureState) => void;
  onPan?: (state: GestureState) => void;
  onPanStart?: (state: GestureState) => void;
  onPanEnd?: (state: GestureState) => void;
}

export interface GestureOptions {
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  enableHapticFeedback?: boolean;
  preventScroll?: boolean;
}

export const useGestures = (
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 0.1,
    enableHapticFeedback = true,
    preventScroll = false,
  } = options;

  const { touchSupport } = useDeviceDetection();
  const elementRef = useRef<HTMLElement>(null);
  const gestureStateRef = useRef<GestureState>({
    isActive: false,
    startPosition: null,
    currentPosition: null,
    deltaX: 0,
    deltaY: 0,
    distance: 0,
    velocity: { x: 0, y: 0 },
    direction: null,
    scale: 1,
    rotation: 0,
    duration: 0,
  });

  const [gestureState, setGestureState] = useState<GestureState>(gestureStateRef.current);

  // Touch tracking
  const touchesRef = useRef<Touch[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !touchSupport || !('vibrate' in navigator)) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    
    navigator.vibrate(patterns[intensity]);
  }, [enableHapticFeedback, touchSupport]);

  const updateGestureState = useCallback((updates: Partial<GestureState>) => {
    gestureStateRef.current = { ...gestureStateRef.current, ...updates };
    setGestureState(gestureStateRef.current);
  }, []);

  const calculateDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const calculateAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  const getDirection = useCallback((deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' | null => {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (absDeltaX < swipeThreshold && absDeltaY < swipeThreshold) return null;
    
    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, [swipeThreshold]);

  const calculateVelocity = useCallback((currentPos: { x: number; y: number }, currentTime: number) => {
    if (!lastPositionRef.current) {
      return { x: 0, y: 0 };
    }

    const timeDelta = currentTime - lastPositionRef.current.time;
    if (timeDelta === 0) return { x: 0, y: 0 };

    const velocityX = (currentPos.x - lastPositionRef.current.x) / timeDelta;
    const velocityY = (currentPos.y - lastPositionRef.current.y) / timeDelta;

    return { x: velocityX, y: velocityY };
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventScroll) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches);
    touchesRef.current = touches;
    startTimeRef.current = Date.now();

    if (touches.length === 1) {
      const touch = touches[0];
      const startPosition = { x: touch.clientX, y: touch.clientY };
      
      updateGestureState({
        isActive: true,
        startPosition,
        currentPosition: startPosition,
        deltaX: 0,
        deltaY: 0,
        distance: 0,
        velocity: { x: 0, y: 0 },
        direction: null,
        scale: 1,
        rotation: 0,
        duration: 0,
      });

      lastPositionRef.current = { ...startPosition, time: startTimeRef.current };

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        triggerHapticFeedback('medium');
        callbacks.onLongPress?.(gestureStateRef.current);
      }, longPressDelay);

      callbacks.onPanStart?.(gestureStateRef.current);
    } else if (touches.length === 2) {
      // Pinch gesture start
      const distance = calculateDistance(touches[0], touches[1]);
      const angle = calculateAngle(touches[0], touches[1]);
      
      updateGestureState({
        isActive: true,
        scale: 1,
        rotation: angle,
        distance,
      });

      callbacks.onPinchStart?.(gestureStateRef.current);
    }
  }, [callbacks, preventScroll, longPressDelay, triggerHapticFeedback, updateGestureState, calculateDistance, calculateAngle]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventScroll) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches);
    const currentTime = Date.now();

    if (touches.length === 1 && gestureStateRef.current.startPosition) {
      const touch = touches[0];
      const currentPosition = { x: touch.clientX, y: touch.clientY };
      const deltaX = currentPosition.x - gestureStateRef.current.startPosition.x;
      const deltaY = currentPosition.y - gestureStateRef.current.startPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const direction = getDirection(deltaX, deltaY);
      const velocity = calculateVelocity(currentPosition, currentTime);
      const duration = currentTime - startTimeRef.current;

      updateGestureState({
        currentPosition,
        deltaX,
        deltaY,
        distance,
        direction,
        velocity,
        duration,
      });

      lastPositionRef.current = { ...currentPosition, time: currentTime };

      // Clear long press timer if moved significantly
      if (distance > 10 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      callbacks.onPan?.(gestureStateRef.current);
    } else if (touches.length === 2) {
      // Pinch gesture
      const newDistance = calculateDistance(touches[0], touches[1]);
      const newAngle = calculateAngle(touches[0], touches[1]);
      const scale = newDistance / gestureStateRef.current.distance;
      const rotation = newAngle - gestureStateRef.current.rotation;

      updateGestureState({
        scale,
        rotation,
      });

      callbacks.onPinch?.(gestureStateRef.current);
    }
  }, [callbacks, preventScroll, getDirection, calculateVelocity, updateGestureState, calculateDistance, calculateAngle]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const currentTime = Date.now();
    const duration = currentTime - startTimeRef.current;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchesRef.current.length === 1 && gestureStateRef.current.startPosition) {
      const { deltaX, deltaY, distance, direction, velocity } = gestureStateRef.current;

      // Handle swipe gestures
      if (distance > swipeThreshold && Math.max(Math.abs(velocity.x), Math.abs(velocity.y)) > 0.5) {
        triggerHapticFeedback('light');
        
        switch (direction) {
          case 'left':
            callbacks.onSwipeLeft?.(gestureStateRef.current);
            break;
          case 'right':
            callbacks.onSwipeRight?.(gestureStateRef.current);
            break;
          case 'up':
            callbacks.onSwipeUp?.(gestureStateRef.current);
            break;
          case 'down':
            callbacks.onSwipeDown?.(gestureStateRef.current);
            break;
        }
      } else if (distance < 10 && duration < 300) {
        // Handle tap gestures
        const timeSinceLastTap = currentTime - lastTapTimeRef.current;
        
        if (timeSinceLastTap < doubleTapDelay) {
          triggerHapticFeedback('light');
          callbacks.onDoubleTap?.(gestureStateRef.current);
        } else {
          setTimeout(() => {
            if (currentTime - lastTapTimeRef.current >= doubleTapDelay) {
              callbacks.onTap?.(gestureStateRef.current);
            }
          }, doubleTapDelay);
        }
        
        lastTapTimeRef.current = currentTime;
      }

      callbacks.onPanEnd?.(gestureStateRef.current);
    } else if (touchesRef.current.length === 2) {
      // Pinch gesture end
      callbacks.onPinchEnd?.(gestureStateRef.current);
    }

    // Reset gesture state
    updateGestureState({
      isActive: false,
      startPosition: null,
      currentPosition: null,
      deltaX: 0,
      deltaY: 0,
      distance: 0,
      velocity: { x: 0, y: 0 },
      direction: null,
      scale: 1,
      rotation: 0,
      duration: 0,
    });

    touchesRef.current = [];
    lastPositionRef.current = null;
  }, [callbacks, swipeThreshold, doubleTapDelay, triggerHapticFeedback, updateGestureState]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !touchSupport) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, touchSupport, preventScroll]);

  return {
    ref: elementRef,
    gestureState,
    isGestureActive: gestureState.isActive,
  };
};