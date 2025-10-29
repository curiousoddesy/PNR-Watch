import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../utils/cn'

export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: string
  blurDataURL?: string
  priority?: boolean
  quality?: number
  sizes?: string
  onLoad?: () => void
  onError?: () => void
  lazy?: boolean
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  blurDataURL,
  priority = false,
  quality = 75,
  sizes,
  onLoad,
  onError,
  lazy = true
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver>()

  // Generate optimized image URLs
  const generateSrcSet = useCallback((baseSrc: string) => {
    const formats = ['webp', 'avif']
    const sizes = [480, 768, 1024, 1280, 1920]
    
    const srcSet = sizes.map(size => {
      const webpSrc = baseSrc.replace(/\.(jpg|jpeg|png)$/i, `.webp`)
      return `${webpSrc}?w=${size}&q=${quality} ${size}w`
    }).join(', ')
    
    return srcSet
  }, [quality])

  const generateSources = useCallback((baseSrc: string) => {
    return [
      {
        srcSet: generateSrcSet(baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif')),
        type: 'image/avif'
      },
      {
        srcSet: generateSrcSet(baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')),
        type: 'image/webp'
      }
    ]
  }, [generateSrcSet])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [lazy, priority, isInView])

  // Handle image loading
  useEffect(() => {
    if (!isInView) return

    const img = new Image()
    
    img.onload = () => {
      setCurrentSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }
    
    img.onerror = () => {
      setHasError(true)
      onError?.()
    }

    // Try WebP first, fallback to original
    const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    img.src = webpSrc
    
    // Fallback to original format if WebP fails
    const fallbackImg = new Image()
    fallbackImg.onload = () => {
      if (!isLoaded) {
        setCurrentSrc(src)
        setIsLoaded(true)
        onLoad?.()
      }
    }
    fallbackImg.src = src

  }, [isInView, src, isLoaded, onLoad, onError])

  const handleImageLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleImageError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}
      
      {/* Loading placeholder */}
      {!isLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Main image with modern formats */}
      {isInView && (
        <picture>
          {generateSources(src).map((source, index) => (
            <source
              key={index}
              srcSet={source.srcSet}
              type={source.type}
              sizes={sizes}
            />
          ))}
          <img
            ref={imgRef}
            src={currentSrc || src}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </picture>
      )}
    </div>
  )
}

// Progressive image component with multiple quality levels
export function ProgressiveImage({
  src,
  alt,
  lowQualitySrc,
  className = '',
  ...props
}: OptimizedImageProps & { lowQualitySrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src)
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false)

  useEffect(() => {
    if (lowQualitySrc && src !== lowQualitySrc) {
      const img = new Image()
      img.onload = () => {
        setCurrentSrc(src)
        setIsHighQualityLoaded(true)
      }
      img.src = src
    }
  }, [src, lowQualitySrc])

  return (
    <OptimizedImage
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn(
        'transition-all duration-500',
        !isHighQualityLoaded && lowQualitySrc && 'filter blur-sm',
        className
      )}
    />
  )
}

// Image gallery with optimized loading
export function OptimizedImageGallery({
  images,
  className = '',
  itemClassName = '',
  priority = 3 // Number of images to load with priority
}: {
  images: Array<{ src: string; alt: string; width?: number; height?: number }>
  className?: string
  itemClassName?: string
  priority?: number
}) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {images.map((image, index) => (
        <OptimizedImage
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className={cn('rounded-lg', itemClassName)}
          priority={index < priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ))}
    </div>
  )
}

// Hook for image preloading
export function useImagePreloader() {
  const preloadedImages = useRef(new Set<string>())

  const preloadImage = useCallback((src: string, priority: 'high' | 'low' = 'low') => {
    if (preloadedImages.current.has(src)) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        preloadedImages.current.add(src)
        resolve()
      }
      
      img.onerror = reject
      
      // Set priority hint if supported
      if ('fetchPriority' in img) {
        (img as any).fetchPriority = priority
      }
      
      img.src = src
    })
  }, [])

  const preloadImages = useCallback(async (srcs: string[]) => {
    const promises = srcs.map(src => preloadImage(src))
    return Promise.allSettled(promises)
  }, [preloadImage])

  return { preloadImage, preloadImages }
}

// Image format detection utility
export function detectImageSupport() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  
  const support = {
    webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
    avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
    jpeg2000: canvas.toDataURL('image/jp2').indexOf('data:image/jp2') === 0
  }
  
  return support
}