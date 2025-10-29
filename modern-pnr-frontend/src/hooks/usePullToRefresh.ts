import { useRef, useEffect, useCallback, useState } from 'react';
import { useDeviceDetection } from './useDeviceDetection';
import { useAdaptiveLoading } from './useAdaptiveLoading';

export interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number; // 0 to 1
  canRefresh: boolean;
}

export interface PullToRefreshOptions {
  threshold?: number;
  maxPullDistance?: number;
  refreshDelay?: number;
  enableHapticFeedback?: boolean;
  disabled?: boolean;
}

export const usePullToRefresh = (
  onRefresh: () => Promise<void> | void,
  options: PullToRefreshOptions = {}
) => {
  const {
    threshold = 80,
    maxPullDistance = 120,
    refreshDelay = 1000,
    enableHapticFeedback = true,
    disabled = false,
  } = options;

  const { touchSupport, isMobile } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const containerRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0,
    canRefresh: false,
  });

  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isAtTop = useRef<boolean>(true);
  const hasTriggeredHaptic = useRef<boolean>(false);

  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' = 'light') => {
    if (!enableHapticFeedback || !touchSupport || !('vibrate' in navigator)) return;
    
    const patterns = {
      light: 10,
      medium: 20,
    };
    
    navigator.vibrate(patterns[intensity]);
  }, [enableHapticFeedback, touchSupport]);

  const updateState = useCallback((updates: Partial<PullToRefreshState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const checkIfAtTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    
    // Check if the container or window is scrolled to the top
    const scrollTop = container.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
    return scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled || !isMobile || !touchSupport) return;
    
    isAtTop.current = checkIfAtTop();
    if (!isAtTop.current) return;

    startY.current = event.touches[0].clientY;
    currentY.current = startY.current;
    hasTriggeredHaptic.current = false;
  }, [disabled, isMobile, touchSupport, checkIfAtTop]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled || !isMobile || !touchSupport || !isAtTop.current || state.isRefreshing) return;

    currentY.current = event.touches[0].clientY;
    const pullDistance = Math.max(0, currentY.current - startY.current);

    if (pullDistance > 0) {
      // Prevent default scrolling when pulling down
      event.preventDefault();
      
      // Apply resistance curve for natural feel
      const resistanceFactor = 0.5;
      const adjustedDistance = Math.min(
        pullDistance * resistanceFactor,
        maxPullDistance
      );
      
      const pullProgress = Math.min(adjustedDistance / threshold, 1);
      const canRefresh = adjustedDistance >= threshold;

      updateState({
        isPulling: true,
        pullDistance: adjustedDistance,
        pullProgress,
        canRefresh,
      });

      // Trigger haptic feedback when threshold is reached
      if (canRefresh && !hasTriggeredHaptic.current) {
        triggerHapticFeedback('medium');
        hasTriggeredHaptic.current = true;
      }
    }
  }, [disabled, isMobile, touchSupport, state.isRefreshing, maxPullDistance, threshold, updateState, triggerHapticFeedback]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isMobile || !touchSupport || state.isRefreshing) return;

    if (state.canRefresh && state.isPulling) {
      updateState({
        isRefreshing: true,
        isPulling: false,
      });

      triggerHapticFeedback('light');

      try {
        await Promise.race([
          Promise.resolve(onRefresh()),
          new Promise(resolve => setTimeout(resolve, refreshDelay))
        ]);
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        updateState({
          isRefreshing: false,
          pullDistance: 0,
          pullProgress: 0,
          canRefresh: false,
        });
      }
    } else {
      // Animate back to original position
      updateState({
        isPulling: false,
        pullDistance: 0,
        pullProgress: 0,
        canRefresh: false,
      });
    }

    startY.current = 0;
    currentY.current = 0;
    isAtTop.current = false;
    hasTriggeredHaptic.current = false;
  }, [disabled, isMobile, touchSupport, state.isRefreshing, state.canRefresh, state.isPulling, onRefresh, refreshDelay, triggerHapticFeedback, updateState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !touchSupport || disabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, touchSupport, disabled]);

  const getRefreshIndicatorStyle = useCallback(() => {
    const transform = `translateY(${state.pullDistance}px)`;
    const transition = state.isPulling ? 'none' : `transform ${animationConfig.duration}ms ${animationConfig.easing}`;
    
    return {
      transform,
      transition: animationConfig.enabled ? transition : 'none',
    };
  }, [state.pullDistance, state.isPulling, animationConfig]);

  const getRefreshIconRotation = useCallback(() => {
    if (state.isRefreshing) return 360;
    return state.pullProgress * 180; // Rotate from 0 to 180 degrees
  }, [state.isRefreshing, state.pullProgress]);

  return {
    ref: containerRef,
    state,
    getRefreshIndicatorStyle,
    getRefreshIconRotation,
    isEnabled: touchSupport && isMobile && !disabled,
  };
};