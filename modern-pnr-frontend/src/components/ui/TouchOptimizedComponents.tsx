import React, { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useAdaptiveLoading } from '../../hooks/useAdaptiveLoading';
import { cn } from '../../utils/cn';

interface TouchOptimizedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  hapticFeedback?: boolean;
  className?: string;
}

export const TouchOptimizedButton = forwardRef<HTMLButtonElement, TouchOptimizedButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    hapticFeedback = true,
    className,
    onClick,
    ...props 
  }, ref) => {
    const { isMobile, touchSupport } = useDeviceDetection();
    const { getAnimationConfig } = useAdaptiveLoading();
    const animationConfig = getAnimationConfig();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Provide haptic feedback on supported devices
      if (hapticFeedback && touchSupport && 'vibrate' in navigator) {
        navigator.vibrate(10); // Short vibration
      }
      
      onClick?.(e);
    };

    const getSizeClasses = () => {
      const touchSizes = {
        sm: isMobile ? 'min-h-[44px] px-4 py-2 text-sm' : 'min-h-[36px] px-3 py-1.5 text-sm',
        md: isMobile ? 'min-h-[48px] px-6 py-3 text-base' : 'min-h-[40px] px-4 py-2 text-base',
        lg: isMobile ? 'min-h-[52px] px-8 py-4 text-lg' : 'min-h-[44px] px-6 py-3 text-lg',
        xl: isMobile ? 'min-h-[56px] px-10 py-5 text-xl' : 'min-h-[48px] px-8 py-4 text-xl',
      };
      return touchSizes[size];
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

    const baseClasses = cn(
      'inline-flex items-center justify-center',
      'font-medium rounded-lg',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95', // Touch feedback
      touchSupport && 'touch-manipulation', // Optimize for touch
      getSizeClasses(),
      getVariantClasses(),
      className
    );

    const buttonVariants = {
      initial: { scale: 1 },
      tap: { scale: 0.95 },
      hover: { scale: 1.02 },
    };

    if (!animationConfig.enabled) {
      return (
        <button
          ref={ref}
          className={baseClasses}
          onClick={handleClick}
          disabled={loading}
          {...props}
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {children}
        </button>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={baseClasses}
        variants={buttonVariants}
        initial="initial"
        whileTap="tap"
        whileHover="hover"
        onClick={handleClick}
        disabled={loading}
        {...props}
      >
        {loading && (
          <motion.svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </motion.svg>
        )}
        {children}
      </motion.button>
    );
  }
);

TouchOptimizedButton.displayName = 'TouchOptimizedButton';

interface TouchOptimizedCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  hapticFeedback?: boolean;
  onTap?: () => void;
}

export const TouchOptimizedCard: React.FC<TouchOptimizedCardProps> = ({
  children,
  className,
  interactive = false,
  hapticFeedback = true,
  onTap,
  ...motionProps
}) => {
  const { isMobile, touchSupport } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const handleTap = () => {
    if (hapticFeedback && touchSupport && 'vibrate' in navigator) {
      navigator.vibrate(5); // Very short vibration for cards
    }
    onTap?.();
  };

  const baseClasses = cn(
    'bg-surface border border-default rounded-lg',
    isMobile ? 'p-4' : 'p-6',
    'transition-all duration-200 ease-in-out',
    interactive && [
      'cursor-pointer',
      'hover:shadow-md hover:border-primary/20',
      'active:scale-[0.98]',
      touchSupport && 'touch-manipulation',
    ],
    className
  );

  const cardVariants = {
    initial: { scale: 1, y: 0 },
    tap: { scale: 0.98, y: 2 },
    hover: { scale: 1.01, y: -2 },
  };

  if (!animationConfig.enabled || !interactive) {
    return (
      <div className={baseClasses} onClick={interactive ? handleTap : undefined}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={baseClasses}
      variants={cardVariants}
      initial="initial"
      whileTap={interactive ? "tap" : undefined}
      whileHover={interactive ? "hover" : undefined}
      onTap={interactive ? handleTap : undefined}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

interface TouchOptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  className?: string;
}

export const TouchOptimizedInput = forwardRef<HTMLInputElement, TouchOptimizedInputProps>(
  ({ label, error, helpText, className, ...props }, ref) => {
    const { isMobile } = useDeviceDetection();

    const inputClasses = cn(
      'w-full rounded-lg border border-default bg-surface',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
      isMobile ? 'px-4 py-3 text-base min-h-[48px]' : 'px-3 py-2 text-sm min-h-[40px]',
      error && 'border-error focus:ring-error/50 focus:border-error',
      className
    );

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-contrast">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="text-sm text-error">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-sm text-contrast-secondary">{helpText}</p>
        )}
      </div>
    );
  }
);

TouchOptimizedInput.displayName = 'TouchOptimizedInput';

interface TouchOptimizedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export const TouchOptimizedSelect = forwardRef<HTMLSelectElement, TouchOptimizedSelectProps>(
  ({ label, error, helpText, options, className, ...props }, ref) => {
    const { isMobile } = useDeviceDetection();

    const selectClasses = cn(
      'w-full rounded-lg border border-default bg-surface',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
      isMobile ? 'px-4 py-3 text-base min-h-[48px]' : 'px-3 py-2 text-sm min-h-[40px]',
      error && 'border-error focus:ring-error/50 focus:border-error',
      className
    );

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-contrast">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={selectClasses}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-error">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-sm text-contrast-secondary">{helpText}</p>
        )}
      </div>
    );
  }
);

TouchOptimizedSelect.displayName = 'TouchOptimizedSelect';