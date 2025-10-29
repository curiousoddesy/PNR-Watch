import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useAdaptiveLoading } from '../../hooks/useAdaptiveLoading';
import { cn } from '../../utils/cn';

interface AdaptiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = 'medium',
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  sizes,
  objectFit = 'cover',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { isMobile, screenSize } = useDeviceDetection();
  const { getOptimizedImageSrc, shouldPreload, getAnimationConfig } = useAdaptiveLoading();
  const animationConfig = getAnimationConfig();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || shouldPreload(priority)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority, shouldPreload]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate responsive image sources
  const getResponsiveSrc = () => {
    if (!isInView && !shouldPreload(priority)) {
      return blurDataURL || '';
    }

    // Calculate optimal dimensions based on screen size
    const getOptimalDimensions = () => {
      const baseWidth = width || 400;
      const baseHeight = height || 300;

      switch (screenSize) {
        case 'xs':
          return { w: Math.min(baseWidth, 320), h: Math.min(baseHeight, 240) };
        case 'sm':
          return { w: Math.min(baseWidth, 640), h: Math.min(baseHeight, 480) };
        case 'md':
          return { w: Math.min(baseWidth, 768), h: Math.min(baseHeight, 576) };
        case 'lg':
          return { w: baseWidth, h: baseHeight };
        case 'xl':
        case '2xl':
          return { w: Math.max(baseWidth, 1024), h: Math.max(baseHeight, 768) };
        default:
          return { w: baseWidth, h: baseHeight };
      }
    };

    const { w, h } = getOptimalDimensions();
    return getOptimizedImageSrc(src, w, h);
  };

  // Generate srcSet for different screen densities
  const getSrcSet = () => {
    if (!isInView && !shouldPreload(priority)) {
      return '';
    }

    const { w, h } = width && height ? { w: width, h: height } : { w: 400, h: 300 };
    
    return [
      `${getOptimizedImageSrc(src, w, h)} 1x`,
      `${getOptimizedImageSrc(src, w * 2, h * 2)} 2x`,
      isMobile ? '' : `${getOptimizedImageSrc(src, w * 3, h * 3)} 3x`,
    ].filter(Boolean).join(', ');
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 1.1 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: animationConfig.duration / 1000,
        ease: animationConfig.easing,
      }
    },
  };

  const placeholderVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const containerClasses = cn(
    'relative overflow-hidden',
    'bg-surface border border-default rounded-lg',
    className
  );

  const imageClasses = cn(
    'w-full h-full transition-all duration-300',
    `object-${objectFit}`,
    isLoaded ? 'opacity-100' : 'opacity-0'
  );

  const placeholderClasses = cn(
    'absolute inset-0 flex items-center justify-center',
    'bg-surface text-contrast-secondary',
    isLoaded ? 'opacity-0' : 'opacity-100',
    'transition-opacity duration-300'
  );

  if (hasError) {
    return (
      <div className={containerClasses}>
        <div className={placeholderClasses}>
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-contrast-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={containerClasses}>
      {/* Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <motion.div
          className={placeholderClasses}
          variants={placeholderVariants}
          initial="visible"
          animate={isLoaded ? "hidden" : "visible"}
        >
          {blurDataURL ? (
            <img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover filter blur-sm scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface to-secondary/10 animate-pulse" />
          )}
        </motion.div>
      )}

      {placeholder === 'empty' && !isLoaded && (
        <motion.div
          className={placeholderClasses}
          variants={placeholderVariants}
          initial="visible"
          animate={isLoaded ? "hidden" : "visible"}
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-secondary/20 rounded animate-pulse" />
            <div className="w-20 h-3 mx-auto bg-secondary/20 rounded animate-pulse" />
          </div>
        </motion.div>
      )}

      {/* Main Image */}
      {(isInView || shouldPreload(priority)) && (
        <motion.img
          src={getResponsiveSrc()}
          srcSet={getSrcSet()}
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          alt={alt}
          width={width}
          height={height}
          className={imageClasses}
          onLoad={handleLoad}
          onError={handleError}
          loading={shouldPreload(priority) ? 'eager' : 'lazy'}
          decoding="async"
          variants={animationConfig.enabled ? imageVariants : undefined}
          initial={animationConfig.enabled ? "hidden" : undefined}
          animate={animationConfig.enabled && isLoaded ? "visible" : undefined}
        />
      )}

      {/* Loading indicator */}
      {!isLoaded && !hasError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
};

interface ResponsiveImageGridProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveImageGrid: React.FC<ResponsiveImageGridProps> = ({
  images,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = 4,
  className,
}) => {
  const { screenSize } = useDeviceDetection();

  const currentColumns = columns[screenSize] || columns.lg || 4;
  const gridClasses = cn(
    'grid',
    `grid-cols-${currentColumns}`,
    `gap-${gap}`,
    className
  );

  return (
    <div className={gridClasses}>
      {images.map((image, index) => (
        <AdaptiveImage
          key={index}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority={index < currentColumns ? 'high' : 'medium'}
          className="aspect-square"
        />
      ))}
    </div>
  );
};