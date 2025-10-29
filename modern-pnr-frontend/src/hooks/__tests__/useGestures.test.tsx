import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useGestures } from '../useGestures';

// Mock useDeviceDetection
vi.mock('../useDeviceDetection', () => ({
  useDeviceDetection: () => ({
    touchSupport: true,
    isMobile: true,
  }),
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

describe('useGestures', () => {
  let mockElement: HTMLElement;
  let callbacks: any;

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
    
    callbacks = {
      onSwipeLeft: vi.fn(),
      onSwipeRight: vi.fn(),
      onSwipeUp: vi.fn(),
      onSwipeDown: vi.fn(),
      onTap: vi.fn(),
      onDoubleTap: vi.fn(),
      onLongPress: vi.fn(),
      onPan: vi.fn(),
      onPanStart: vi.fn(),
      onPanEnd: vi.fn(),
      onPinchStart: vi.fn(),
      onPinch: vi.fn(),
      onPinchEnd: vi.fn(),
    };

    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    vi.useRealTimers();
  });

  const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
    const touchList = touches.map(touch => ({
      clientX: touch.clientX,
      clientY: touch.clientY,
      identifier: Math.random(),
    }));

    return new TouchEvent(type, {
      touches: touchList as any,
      bubbles: true,
      cancelable: true,
    });
  };

  describe('Basic gesture detection', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useGestures(callbacks));
      
      expect(result.current.gestureState.isActive).toBe(false);
      expect(result.current.gestureState.startPosition).toBe(null);
      expect(result.current.gestureState.deltaX).toBe(0);
      expect(result.current.gestureState.deltaY).toBe(0);
      expect(result.current.isGestureActive).toBe(false);
    });

    it('should attach event listeners to element', () => {
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');
      
      const { result } = renderHook(() => useGestures(callbacks));
      result.current.ref.current = mockElement;
      
      // Re-render to trigger useEffect
      renderHook(() => useGestures(callbacks));
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.any(Object));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.any(Object));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), expect.any(Object));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function), expect.any(Object));
    });
  });

  describe('Swipe gestures', () => {
    it('should detect swipe left', () => {
      const { result } = renderHook(() => useGestures(callbacks, { swipeThreshold: 50 }));
      result.current.ref.current = mockElement;

      // Start touch
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      // Move left
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 40, clientY: 100 }]));
      });

      // End touch
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onSwipeLeft).toHaveBeenCalled();
    });

    it('should detect swipe right', () => {
      const { result } = renderHook(() => useGestures(callbacks, { swipeThreshold: 50 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 160, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onSwipeRight).toHaveBeenCalled();
    });

    it('should detect swipe up', () => {
      const { result } = renderHook(() => useGestures(callbacks, { swipeThreshold: 50 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 100, clientY: 40 }]));
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onSwipeUp).toHaveBeenCalled();
    });

    it('should detect swipe down', () => {
      const { result } = renderHook(() => useGestures(callbacks, { swipeThreshold: 50 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 100, clientY: 160 }]));
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onSwipeDown).toHaveBeenCalled();
    });

    it('should not trigger swipe if below threshold', () => {
      const { result } = renderHook(() => useGestures(callbacks, { swipeThreshold: 100 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 130, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe('Tap gestures', () => {
    it('should detect single tap', () => {
      const { result } = renderHook(() => useGestures(callbacks, { doubleTapDelay: 300 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      act(() => {
        vi.advanceTimersByTime(100);
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(callbacks.onTap).toHaveBeenCalled();
    });

    it('should detect double tap', () => {
      const { result } = renderHook(() => useGestures(callbacks, { doubleTapDelay: 300 }));
      result.current.ref.current = mockElement;

      // First tap
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        jest.advanceTimersByTime(100);
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      // Second tap within delay
      act(() => {
        vi.advanceTimersByTime(100);
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        vi.advanceTimersByTime(100);
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onDoubleTap).toHaveBeenCalled();
    });
  });

  describe('Long press gesture', () => {
    it('should detect long press', () => {
      const { result } = renderHook(() => useGestures(callbacks, { longPressDelay: 500 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(callbacks.onLongPress).toHaveBeenCalled();
    });

    it('should cancel long press on movement', () => {
      const { result } = renderHook(() => useGestures(callbacks, { longPressDelay: 500 }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      act(() => {
        vi.advanceTimersByTime(200);
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 120, clientY: 100 }]));
      });

      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(callbacks.onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('Pan gestures', () => {
    it('should detect pan start, move, and end', () => {
      const { result } = renderHook(() => useGestures(callbacks));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      expect(callbacks.onPanStart).toHaveBeenCalled();

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 120, clientY: 110 }]));
      });

      expect(callbacks.onPan).toHaveBeenCalled();

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onPanEnd).toHaveBeenCalled();
    });

    it('should update gesture state during pan', () => {
      const { result } = renderHook(() => useGestures(callbacks));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      expect(result.current.gestureState.isActive).toBe(true);
      expect(result.current.gestureState.startPosition).toEqual({ x: 100, y: 100 });

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 120, clientY: 110 }]));
      });

      expect(result.current.gestureState.deltaX).toBe(20);
      expect(result.current.gestureState.deltaY).toBe(10);
      expect(result.current.gestureState.distance).toBeCloseTo(22.36, 1);
    });
  });

  describe('Pinch gestures', () => {
    it('should detect pinch start, move, and end', () => {
      const { result } = renderHook(() => useGestures(callbacks));
      result.current.ref.current = mockElement;

      // Start with two fingers
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 }
        ]));
      });

      expect(callbacks.onPinchStart).toHaveBeenCalled();

      // Move fingers closer (pinch in)
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchmove', [
          { clientX: 120, clientY: 100 },
          { clientX: 180, clientY: 100 }
        ]));
      });

      expect(callbacks.onPinch).toHaveBeenCalled();

      // End pinch
      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(callbacks.onPinchEnd).toHaveBeenCalled();
    });
  });

  describe('Haptic feedback', () => {
    it('should trigger haptic feedback on swipe when enabled', () => {
      const { result } = renderHook(() => useGestures(callbacks, { 
        enableHapticFeedback: true,
        swipeThreshold: 50 
      }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 160, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('should not trigger haptic feedback when disabled', () => {
      const { result } = renderHook(() => useGestures(callbacks, { 
        enableHapticFeedback: false,
        swipeThreshold: 50 
      }));
      result.current.ref.current = mockElement;

      act(() => {
        mockElement.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 160, clientY: 100 }]));
        mockElement.dispatchEvent(createTouchEvent('touchend', []));
      });

      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('Prevent scroll option', () => {
    it('should prevent default when preventScroll is enabled', () => {
      const { result } = renderHook(() => useGestures(callbacks, { preventScroll: true }));
      result.current.ref.current = mockElement;

      const touchStartEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      const preventDefaultSpy = jest.spyOn(touchStartEvent, 'preventDefault');

      act(() => {
        mockElement.dispatchEvent(touchStartEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when preventScroll is disabled', () => {
      const { result } = renderHook(() => useGestures(callbacks, { preventScroll: false }));
      result.current.ref.current = mockElement;

      const touchStartEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      const preventDefaultSpy = jest.spyOn(touchStartEvent, 'preventDefault');

      act(() => {
        mockElement.dispatchEvent(touchStartEvent);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});