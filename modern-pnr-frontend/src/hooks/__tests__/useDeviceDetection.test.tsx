import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDeviceDetection } from '../useDeviceDetection';

// Mock window properties
const mockWindow = (properties: Partial<Window & typeof globalThis>) => {
  Object.defineProperties(window, {
    ...Object.keys(properties).reduce((acc, key) => {
      acc[key] = {
        value: properties[key as keyof typeof properties],
        writable: true,
        configurable: true,
      };
      return acc;
    }, {} as PropertyDescriptorMap),
  });
};

// Mock navigator properties
const mockNavigator = (properties: Partial<Navigator>) => {
  Object.defineProperties(navigator, {
    ...Object.keys(properties).reduce((acc, key) => {
      acc[key] = {
        value: properties[key as keyof typeof properties],
        writable: true,
        configurable: true,
      };
      return acc;
    }, {} as PropertyDescriptorMap),
  });
};

describe('useDeviceDetection', () => {
  beforeEach(() => {
    // Reset to default values
    mockWindow({
      innerWidth: 1024,
      innerHeight: 768,
    });
    mockNavigator({
      maxTouchPoints: 0,
      hardwareConcurrency: 4,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Screen size detection', () => {
    it('should detect mobile screen size (xs)', () => {
      mockWindow({ innerWidth: 320, innerHeight: 568 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('xs');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect small screen size (sm)', () => {
      mockWindow({ innerWidth: 640, innerHeight: 480 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('sm');
      expect(result.current.isMobile).toBe(true);
    });

    it('should detect tablet screen size (md)', () => {
      mockWindow({ innerWidth: 768, innerHeight: 1024 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('md');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect desktop screen size (lg)', () => {
      mockWindow({ innerWidth: 1024, innerHeight: 768 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('lg');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('should detect extra large screen size (xl)', () => {
      mockWindow({ innerWidth: 1280, innerHeight: 800 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('xl');
      expect(result.current.isDesktop).toBe(true);
    });

    it('should detect 2xl screen size', () => {
      mockWindow({ innerWidth: 1920, innerHeight: 1080 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('2xl');
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('Orientation detection', () => {
    it('should detect portrait orientation', () => {
      mockWindow({ innerWidth: 375, innerHeight: 667 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.orientation).toBe('portrait');
    });

    it('should detect landscape orientation', () => {
      mockWindow({ innerWidth: 667, innerHeight: 375 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('Touch support detection', () => {
    it('should detect touch support via ontouchstart', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: null,
        writable: true,
        configurable: true,
      });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.touchSupport).toBe(true);
    });

    it('should detect touch support via maxTouchPoints', () => {
      mockNavigator({ maxTouchPoints: 5 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.touchSupport).toBe(true);
    });

    it('should detect no touch support', () => {
      mockNavigator({ maxTouchPoints: 0 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.touchSupport).toBe(false);
    });
  });

  describe('Hardware detection', () => {
    it('should detect device memory', () => {
      (navigator as any).deviceMemory = 8;
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.deviceMemory).toBe(8);
    });

    it('should fallback to default device memory', () => {
      delete (navigator as any).deviceMemory;
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.deviceMemory).toBe(4);
    });

    it('should detect hardware concurrency', () => {
      mockNavigator({ hardwareConcurrency: 8 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.hardwareConcurrency).toBe(8);
    });
  });

  describe('Connection type detection', () => {
    it('should detect connection type', () => {
      (navigator as any).connection = { effectiveType: '4g' };
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.connectionType).toBe('4g');
    });

    it('should fallback to unknown connection type', () => {
      delete (navigator as any).connection;
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.connectionType).toBe('unknown');
    });
  });

  describe('Responsive updates', () => {
    it('should update on window resize', () => {
      mockWindow({ innerWidth: 1024, innerHeight: 768 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.screenSize).toBe('lg');
      expect(result.current.isDesktop).toBe(true);
      
      // Simulate window resize
      act(() => {
        mockWindow({ innerWidth: 375, innerHeight: 667 });
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current.screenSize).toBe('xs');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should update on orientation change', () => {
      mockWindow({ innerWidth: 375, innerHeight: 667 });
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.orientation).toBe('portrait');
      
      // Simulate orientation change
      act(() => {
        mockWindow({ innerWidth: 667, innerHeight: 375 });
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('SSR compatibility', () => {
    it('should handle server-side rendering', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      const { result } = renderHook(() => useDeviceDetection());
      
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.screenSize).toBe('lg');
      expect(result.current.orientation).toBe('landscape');
      expect(result.current.touchSupport).toBe(false);
      
      global.window = originalWindow;
    });
  });
});