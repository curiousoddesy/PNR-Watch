import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  deviceMemory: number;
  hardwareConcurrency: number;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenSize: 'lg',
        orientation: 'landscape',
        touchSupport: false,
        connectionType: 'unknown',
        deviceMemory: 4,
        hardwareConcurrency: 4,
      };
    }

    const getScreenSize = (width: number): DeviceInfo['screenSize'] => {
      if (width < 640) return 'xs';
      if (width < 768) return 'sm';
      if (width < 1024) return 'md';
      if (width < 1280) return 'lg';
      if (width < 1536) return 'xl';
      return '2xl';
    };

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    return {
      isMobile,
      isTablet,
      isDesktop,
      screenSize: getScreenSize(width),
      orientation: width > height ? 'landscape' : 'portrait',
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      deviceMemory: (navigator as any).deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;

      const getScreenSize = (width: number): DeviceInfo['screenSize'] => {
        if (width < 640) return 'xs';
        if (width < 768) return 'sm';
        if (width < 1024) return 'md';
        if (width < 1280) return 'lg';
        if (width < 1536) return 'xl';
        return '2xl';
      };

      setDeviceInfo(prev => ({
        ...prev,
        isMobile,
        isTablet,
        isDesktop,
        screenSize: getScreenSize(width),
        orientation: width > height ? 'landscape' : 'portrait',
      }));
    };

    const updateConnection = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setDeviceInfo(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
        }));
      }
    };

    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnection);
    }

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
      if (connection) {
        connection.removeEventListener('change', updateConnection);
      }
    };
  }, []);

  return deviceInfo;
};