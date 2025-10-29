import { useState, useEffect, useCallback } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

export interface AdaptiveLoadingConfig {
  enableImageOptimization: boolean;
  enableLazyLoading: boolean;
  enableCodeSplitting: boolean;
  enablePrefetching: boolean;
  maxConcurrentRequests: number;
  imageQuality: 'low' | 'medium' | 'high';
  animationLevel: 'none' | 'reduced' | 'full';
}

export const useAdaptiveLoading = () => {
  const deviceInfo = useDeviceDetection();
  const [config, setConfig] = useState<AdaptiveLoadingConfig>(() => ({
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableCodeSplitting: true,
    enablePrefetching: true,
    maxConcurrentRequests: 6,
    imageQuality: 'high',
    animationLevel: 'full',
  }));

  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  useEffect(() => {
    // Determine network speed based on connection type
    const getNetworkSpeed = (connectionType: string): 'slow' | 'medium' | 'fast' => {
      switch (connectionType) {
        case 'slow-2g':
        case '2g':
          return 'slow';
        case '3g':
          return 'medium';
        case '4g':
        default:
          return 'fast';
      }
    };

    const speed = getNetworkSpeed(deviceInfo.connectionType);
    setNetworkSpeed(speed);

    // Adapt configuration based on device capabilities
    const newConfig: AdaptiveLoadingConfig = {
      enableImageOptimization: true,
      enableLazyLoading: true,
      enableCodeSplitting: true,
      enablePrefetching: speed === 'fast' && !deviceInfo.isMobile,
      maxConcurrentRequests: deviceInfo.isMobile ? 3 : speed === 'slow' ? 2 : 6,
      imageQuality: speed === 'slow' ? 'low' : speed === 'medium' ? 'medium' : 'high',
      animationLevel: deviceInfo.isMobile && speed === 'slow' ? 'reduced' : 'full',
    };

    // Consider device memory and CPU
    if (deviceInfo.deviceMemory < 2) {
      newConfig.imageQuality = 'low';
      newConfig.maxConcurrentRequests = Math.min(newConfig.maxConcurrentRequests, 2);
      newConfig.animationLevel = 'reduced';
    }

    if (deviceInfo.hardwareConcurrency < 4) {
      newConfig.animationLevel = newConfig.animationLevel === 'full' ? 'reduced' : newConfig.animationLevel;
    }

    // Respect user's motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      newConfig.animationLevel = 'none';
    }

    setConfig(newConfig);
  }, [deviceInfo]);

  const getOptimizedImageSrc = useCallback((src: string, width?: number, height?: number) => {
    const quality = config.imageQuality === 'low' ? 60 : config.imageQuality === 'medium' ? 80 : 95;
    const format = 'webp'; // Prefer WebP format for better compression
    
    // In a real implementation, this would integrate with an image optimization service
    // For now, we'll return the original src with quality parameters
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    params.set('f', format);
    
    return `${src}?${params.toString()}`;
  }, [config.imageQuality]);

  const shouldPreload = useCallback((priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (!config.enablePrefetching) return false;
    
    switch (priority) {
      case 'high':
        return true;
      case 'medium':
        return networkSpeed === 'fast';
      case 'low':
        return networkSpeed === 'fast' && !deviceInfo.isMobile;
      default:
        return false;
    }
  }, [config.enablePrefetching, networkSpeed, deviceInfo.isMobile]);

  const getAnimationConfig = useCallback(() => {
    switch (config.animationLevel) {
      case 'none':
        return {
          duration: 0,
          easing: 'linear',
          enabled: false,
        };
      case 'reduced':
        return {
          duration: 150,
          easing: 'ease-out',
          enabled: true,
        };
      case 'full':
      default:
        return {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          enabled: true,
        };
    }
  }, [config.animationLevel]);

  return {
    config,
    networkSpeed,
    deviceInfo,
    getOptimizedImageSrc,
    shouldPreload,
    getAnimationConfig,
  };
};