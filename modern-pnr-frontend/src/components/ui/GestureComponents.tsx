import React, { ReactNode, forwardRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useGestures, GestureCallbacks, GestureOptions } from '../../hooks/useGestures';
import { usePullToRefresh, PullToRefreshOptions } from '../../hooks/usePullToRefresh';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useAdaptiveLoading } from '../../hooks/useAdaptiveLoading';
import { cn } from '../../utils/cn';

interface SwipeableCardProps {
  children: ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: ReactNode;
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  rightAction?: {
    icon: ReactNode;
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  swipeThreshold?: number;
  enableHapticFeedback?: boolean;
}

export const SwipeableCard = forwardRef<HTMLDivElement, SwipeableCardProps>(
  ({ 
    children, 
    className, 
    onSwipeLeft, 
    onSwipeRight, 
    leftAction, 
    rightAction, 
    swipeThreshold = 100,
    enableHapticFeedback = true,
    ...props 
  }, ref) => {
    const { touchSupport } = useDeviceDetection();
    const { getAnimationConfig } = useAdaptiveLoading();
    const animationConfig = getAnimationConfig();

    const { ref: gestureRef, gestureState } = useGestures({
      onSwipeLeft: () => {
        if (onSwipeLeft) {
          onSwipeLeft();
        }
      },
      onSwipeRight: () => {
        if (onSwipeRight) {
          onSwipeRight();
        }
      },
    }, {
      swipeThreshold,
      enableHapticFeedback,
    });

    const getActionColor = (color: string = 'primary') => {
      const colors = {
        primary: 'bg-primary text-white',
        secondary: 'bg-secondary text-white',
        success: 'bg-success text-white',
        warning: 'bg-warning text-white',
        error: 'bg-error text-white',
      };
      return colors[color as keyof typeof colors] || colors.primary;
    };

    const cardVariants = {
      initial: { x: 0, scale: 1 },
      swipeLeft: { x: -100, scale: 0.95 },
      swipeRight: { x: 100, scale: 0.95 },
    };

    if (!touchSupport) {
      return (
        <div ref={ref} className={cn('bg-surface border border-default rounded-lg p-4', className)} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-lg">
        {/* Background Actions */}
        {leftAction && (
          <div className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start pl-4',
            'w-full z-0',
            getActionColor(leftAction.color)
          )}>
            <div className="flex items-center space-x-2">
              {leftAction.icon}
              <span className="font-medium">{leftAction.label}</span>
            </div>
          </div>
        )}
        
        {rightAction && (
          <div className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end pr-4',
            'w-full z-0',
            getActionColor(rightAction.color)
          )}>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{rightAction.label}</span>
              {rightAction.icon}
            </div>
          </div>
        )}

        {/* Main Card */}
        <motion.div
          ref={(node) => {
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
            if (gestureRef) gestureRef.current = node;
          }}
          className={cn(
            'relative z-10 bg-surface border border-default rounded-lg p-4',
            'touch-manipulation cursor-grab active:cursor-grabbing',
            className
          )}
          variants={animationConfig.enabled ? cardVariants : undefined}
          initial="initial"
          drag={touchSupport ? "x" : false}
          dragConstraints={{ left: -200, right: 200 }}
          dragElastic={0.2}
          onDragEnd={(event, info: PanInfo) => {
            const { offset, velocity } = info;
            const swipeThresholdMet = Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > 500;
            
            if (swipeThresholdMet) {
              if (offset.x > 0 && onSwipeRight) {
                onSwipeRight();
              } else if (offset.x < 0 && onSwipeLeft) {
                onSwipeLeft();
              }
            }
          }}
          whileDrag={{ scale: 0.98 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          {...props}
        >
          {children}
        </motion.div>
      </div>
    );
  }
);

SwipeableCard.displayName = 'SwipeableCard';

interface PinchZoomContainerProps {
  children: ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
  enableHapticFeedback?: boolean;
}

export const PinchZoomContainer: React.FC<PinchZoomContainerProps> = ({
  children,
  className,
  minScale = 0.5,
  maxScale = 3,
  enableHapticFeedback = true,
}) => {
  const { touchSupport } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const { ref: gestureRef, gestureState } = useGestures({
    onPinchStart: () => {
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    },
  }, {
    enableHapticFeedback,
  });

  if (!touchSupport) {
    return (
      <div className={cn('overflow-hidden', className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={gestureRef}
      className={cn('overflow-hidden touch-manipulation', className)}
      initial={{ scale: 1 }}
      animate={{ scale: Math.max(minScale, Math.min(maxScale, gestureState.scale)) }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: animationConfig.duration / 1000,
      }}
    >
      {children}
    </motion.div>
  );
};

interface PullToRefreshContainerProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
  options?: PullToRefreshOptions;
}

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  children,
  onRefresh,
  className,
  options = {},
}) => {
  const { ref, state, getRefreshIndicatorStyle, getRefreshIconRotation, isEnabled } = usePullToRefresh(
    onRefresh,
    options
  );

  if (!isEnabled) {
    return (
      <div className={cn('overflow-auto', className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn('relative overflow-auto', className)}
      style={getRefreshIndicatorStyle()}
    >
      {/* Pull to Refresh Indicator */}
      <div className={cn(
        'absolute top-0 left-0 right-0 z-10',
        'flex items-center justify-center',
        'h-16 -mt-16',
        'bg-surface/90 backdrop-blur-sm',
        'transition-opacity duration-200',
        state.isPulling || state.isRefreshing ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="flex items-center space-x-2 text-primary">
          <motion.div
            animate={{ rotate: getRefreshIconRotation() }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {state.isRefreshing ? (
              <motion.svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </motion.div>
          <span className="text-sm font-medium">
            {state.isRefreshing 
              ? 'Refreshing...' 
              : state.canRefresh 
                ? 'Release to refresh' 
                : 'Pull to refresh'
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
};

interface LongPressButtonProps {
  children: ReactNode;
  onLongPress: () => void;
  onTap?: () => void;
  className?: string;
  longPressDelay?: number;
  enableHapticFeedback?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const LongPressButton: React.FC<LongPressButtonProps> = ({
  children,
  onLongPress,
  onTap,
  className,
  longPressDelay = 500,
  enableHapticFeedback = true,
  variant = 'primary',
  size = 'md',
}) => {
  const { touchSupport } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const { ref: gestureRef } = useGestures({
    onLongPress,
    onTap,
  }, {
    longPressDelay,
    enableHapticFeedback,
  });

  const getSizeClasses = () => {
    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[36px]',
      md: 'px-4 py-2 text-base min-h-[44px]',
      lg: 'px-6 py-3 text-lg min-h-[48px]',
    };
    return sizes[size];
  };

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/50',
      secondary: 'bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary/50',
      outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/50',
      ghost: 'text-primary hover:bg-primary/10 focus:ring-primary/50',
    };
    return variants[variant];
  };

  const buttonVariants = {
    initial: { scale: 1 },
    tap: { scale: 0.95 },
    longPress: { scale: 0.9 },
  };

  return (
    <motion.button
      ref={gestureRef}
      className={cn(
        'inline-flex items-center justify-center',
        'font-medium rounded-lg',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        touchSupport && 'touch-manipulation',
        getSizeClasses(),
        getVariantClasses(),
        className
      )}
      variants={animationConfig.enabled ? buttonVariants : undefined}
      initial="initial"
      whileTap="tap"
      animate="initial"
    >
      {children}
    </motion.button>
  );
};

interface GestureNavigationProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  children: ReactNode;
  className?: string;
  enableHapticFeedback?: boolean;
}

export const GestureNavigation: React.FC<GestureNavigationProps> = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  children,
  className,
  enableHapticFeedback = true,
}) => {
  const { touchSupport } = useDeviceDetection();

  const { ref: gestureRef } = useGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  }, {
    swipeThreshold: 50,
    enableHapticFeedback,
  });

  if (!touchSupport) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={gestureRef}
      className={cn('touch-manipulation', className)}
    >
      {children}
    </div>
  );
};