import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useAdaptiveLoading } from '../../hooks/useAdaptiveLoading';
import { cn } from '../../utils/cn';

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
  enableAnimations?: boolean;
  adaptiveSpacing?: boolean;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className,
  enableAnimations = true,
  adaptiveSpacing = true,
}) => {
  const { isMobile, isTablet, screenSize } = useDeviceDetection();
  const { getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  const getLayoutClasses = () => {
    const baseClasses = 'w-full min-h-screen';
    const spacingClasses = adaptiveSpacing
      ? {
          'px-4 py-2': isMobile,
          'px-6 py-4': isTablet,
          'px-8 py-6': !isMobile && !isTablet,
        }
      : {};

    return cn(
      baseClasses,
      spacingClasses,
      'transition-all duration-300 ease-in-out',
      className
    );
  };

  const layoutVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: animationConfig.duration / 1000,
        ease: animationConfig.easing,
      }
    },
    exit: { opacity: 0, y: -20 }
  };

  if (!enableAnimations || !animationConfig.enabled) {
    return (
      <div className={getLayoutClasses()}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={getLayoutClasses()}
      variants={layoutVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
};

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = { xs: 4, sm: 4, md: 6, lg: 6, xl: 8, '2xl': 8 },
}) => {
  const { screenSize } = useDeviceDetection();

  const getGridClasses = () => {
    const colsClass = `grid-cols-${cols[screenSize] || cols.lg || 4}`;
    const gapClass = `gap-${gap[screenSize] || gap.lg || 6}`;
    
    return cn(
      'grid',
      colsClass,
      gapClass,
      'w-full',
      className
    );
  };

  return (
    <div className={getGridClasses()}>
      {children}
    </div>
  );
};

interface ResponsiveFlexProps {
  children: ReactNode;
  className?: string;
  direction?: {
    xs?: 'row' | 'col';
    sm?: 'row' | 'col';
    md?: 'row' | 'col';
    lg?: 'row' | 'col';
    xl?: 'row' | 'col';
    '2xl'?: 'row' | 'col';
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: number;
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  className,
  direction = { xs: 'col', md: 'row' },
  align = 'start',
  justify = 'start',
  wrap = true,
  gap = 4,
}) => {
  const { screenSize } = useDeviceDetection();

  const getFlexClasses = () => {
    const directionClass = `flex-${direction[screenSize] || direction.md || 'row'}`;
    const alignClass = `items-${align}`;
    const justifyClass = `justify-${justify}`;
    const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';
    const gapClass = `gap-${gap}`;

    return cn(
      'flex',
      directionClass,
      alignClass,
      justifyClass,
      wrapClass,
      gapClass,
      className
    );
  };

  return (
    <div className={getFlexClasses()}>
      {children}
    </div>
  );
};

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
  padding?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = { xs: '100%', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  padding = { xs: 4, sm: 6, md: 8, lg: 10, xl: 12, '2xl': 16 },
}) => {
  const { screenSize } = useDeviceDetection();

  const getContainerClasses = () => {
    const maxWidthValue = maxWidth[screenSize] || maxWidth.lg || '1024px';
    const paddingValue = padding[screenSize] || padding.lg || 8;
    
    return cn(
      'mx-auto w-full',
      `max-w-[${maxWidthValue}]`,
      `px-${paddingValue}`,
      className
    );
  };

  return (
    <div className={getContainerClasses()}>
      {children}
    </div>
  );
};