import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useAdaptiveLoading } from '../../hooks/useAdaptiveLoading';
import { TouchOptimizedButton } from './TouchOptimizedComponents';
import { cn } from '../../utils/cn';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: number;
  disabled?: boolean;
}

interface MobileNavigationProps {
  items: NavigationItem[];
  activeItem?: string;
  onItemSelect?: (item: NavigationItem) => void;
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  activeItem,
  onItemSelect,
  className,
}) => {
  const { isMobile, touchSupport } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const handleItemClick = (item: NavigationItem) => {
    if (item.disabled) return;
    
    // Haptic feedback
    if (touchSupport && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    onItemSelect?.(item);
    item.onClick?.();
  };

  const navVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        duration: animationConfig.duration / 1000,
        ease: animationConfig.easing,
      }
    },
  };

  const itemVariants = {
    inactive: { scale: 1, y: 0 },
    active: { scale: 1.1, y: -2 },
    tap: { scale: 0.95 },
  };

  if (!isMobile) {
    return null; // Only show on mobile devices
  }

  return (
    <motion.nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-surface/95 backdrop-blur-md border-t border-default',
        'safe-area-inset-bottom', // Handle iPhone notch
        className
      )}
      variants={navVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              'flex flex-col items-center justify-center',
              'min-w-[60px] min-h-[60px] p-2 rounded-lg',
              'transition-colors duration-200',
              'touch-manipulation',
              activeItem === item.id
                ? 'text-primary bg-primary/10'
                : 'text-contrast-secondary hover:text-primary hover:bg-primary/5',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            variants={itemVariants}
            initial="inactive"
            animate={activeItem === item.id ? "active" : "inactive"}
            whileTap={!item.disabled ? "tap" : undefined}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <motion.span
                  className={cn(
                    'absolute -top-1 -right-1',
                    'bg-error text-white text-xs',
                    'rounded-full min-w-[18px] h-[18px]',
                    'flex items-center justify-center',
                    'font-medium'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </motion.span>
              )}
            </div>
            <span className="text-xs font-medium mt-1 leading-none">
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
};

interface MobileHeaderProps {
  title: string;
  leftAction?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
  };
  rightActions?: {
    icon: React.ReactNode;
    onClick: () => void;
    label: string;
    badge?: number;
  }[];
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  leftAction,
  rightActions = [],
  className,
}) => {
  const { isMobile } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const headerVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        duration: animationConfig.duration / 1000,
        ease: animationConfig.easing,
      }
    },
  };

  if (!isMobile) {
    return null; // Only show on mobile devices
  }

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'bg-surface/95 backdrop-blur-md border-b border-default',
        'safe-area-inset-top', // Handle iPhone notch
        className
      )}
      variants={headerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center min-w-[44px]">
          {leftAction && (
            <TouchOptimizedButton
              variant="ghost"
              size="sm"
              onClick={leftAction.onClick}
              className="p-2"
              aria-label={leftAction.label}
            >
              {leftAction.icon}
            </TouchOptimizedButton>
          )}
        </div>
        
        <h1 className="text-lg font-semibold text-contrast truncate mx-4">
          {title}
        </h1>
        
        <div className="flex items-center space-x-1 min-w-[44px] justify-end">
          {rightActions.map((action, index) => (
            <TouchOptimizedButton
              key={index}
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="p-2 relative"
              aria-label={action.label}
            >
              {action.icon}
              {action.badge && action.badge > 0 && (
                <span className={cn(
                  'absolute -top-1 -right-1',
                  'bg-error text-white text-xs',
                  'rounded-full min-w-[16px] h-[16px]',
                  'flex items-center justify-center',
                  'font-medium'
                )}>
                  {action.badge > 9 ? '9+' : action.badge}
                </span>
              )}
            </TouchOptimizedButton>
          ))}
        </div>
      </div>
    </motion.header>
  );
};

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right' | 'bottom';
  className?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  position = 'left',
  className,
}) => {
  const { isMobile } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getDrawerVariants = () => {
    const baseVariants = {
      closed: { opacity: 0 },
      open: { opacity: 1 },
    };

    switch (position) {
      case 'left':
        return {
          ...baseVariants,
          closed: { ...baseVariants.closed, x: '-100%' },
          open: { ...baseVariants.open, x: 0 },
        };
      case 'right':
        return {
          ...baseVariants,
          closed: { ...baseVariants.closed, x: '100%' },
          open: { ...baseVariants.open, x: 0 },
        };
      case 'bottom':
        return {
          ...baseVariants,
          closed: { ...baseVariants.closed, y: '100%' },
          open: { ...baseVariants.open, y: 0 },
        };
      default:
        return baseVariants;
    }
  };

  const overlayVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 },
  };

  const drawerVariants = getDrawerVariants();

  if (!isMobile) {
    return null; // Only show on mobile devices
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            className={cn(
              'fixed z-50 bg-surface',
              position === 'left' && 'left-0 top-0 bottom-0 w-80 max-w-[85vw]',
              position === 'right' && 'right-0 top-0 bottom-0 w-80 max-w-[85vw]',
              position === 'bottom' && 'left-0 right-0 bottom-0 max-h-[85vh]',
              'shadow-xl',
              className
            )}
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{
              duration: animationConfig.duration / 1000,
              ease: animationConfig.easing,
            }}
          >
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-default">
                <h2 className="text-lg font-semibold text-contrast">{title}</h2>
                <TouchOptimizedButton
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                  aria-label="Close drawer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </TouchOptimizedButton>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};