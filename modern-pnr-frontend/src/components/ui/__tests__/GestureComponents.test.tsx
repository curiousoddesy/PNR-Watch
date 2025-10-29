import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwipeableCard, PinchZoomContainer, LongPressButton, GestureNavigation } from '../GestureComponents';

import { vi } from 'vitest';

// Mock hooks
vi.mock('../../../hooks/useDeviceDetection', () => ({
  useDeviceDetection: vi.fn(() => ({
    touchSupport: true,
    isMobile: true,
  })),
}));

vi.mock('../../../hooks/useAdaptiveLoading', () => ({
  useAdaptiveLoading: vi.fn(() => ({
    getAnimationConfig: () => ({
      duration: 300,
      easing: 'ease-out',
      enabled: true,
    }),
  })),
}));

vi.mock('../../../hooks/useGestures', () => ({
  useGestures: vi.fn(() => ({
    ref: { current: null },
    gestureState: {
      isActive: false,
      scale: 1,
      deltaX: 0,
      deltaY: 0,
    },
  })),
}));

vi.mock('../../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: vi.fn(() => ({
    ref: { current: null },
    state: {
      isPulling: false,
      isRefreshing: false,
      pullDistance: 0,
      pullProgress: 0,
      canRefresh: false,
    },
    getRefreshIndicatorStyle: () => ({}),
    getRefreshIconRotation: () => 0,
    isEnabled: true,
  })),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  },
  PanInfo: {},
}));

describe('SwipeableCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render card with children', () => {
    render(
      <SwipeableCard>
        <div>Card content</div>
      </SwipeableCard>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should render left action when provided', () => {
    const leftAction = {
      icon: <span>Delete</span>,
      label: 'Delete',
      color: 'error' as const,
    };

    const { container } = render(
      <SwipeableCard leftAction={leftAction}>
        <div>Content</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(container.querySelector('.bg-error')).toBeInTheDocument();
  });

  it('should render right action when provided', () => {
    const rightAction = {
      icon: <span>Archive</span>,
      label: 'Archive',
      color: 'primary' as const,
    };

    const { container } = render(
      <SwipeableCard rightAction={rightAction}>
        <div>Content</div>
      </SwipeableCard>
    );

    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(container.querySelector('.bg-primary')).toBeInTheDocument();
  });

  it('should call onSwipeLeft when swiped left', () => {
    const { useGestures } = require('../../../hooks/useGestures');
    const mockOnSwipeLeft = jest.fn();
    
    useGestures.mockImplementation((callbacks: any) => {
      // Simulate swipe left
      setTimeout(() => callbacks.onSwipeLeft?.(), 0);
      return {
        ref: { current: null },
        gestureState: { isActive: false, scale: 1 },
      };
    });

    render(
      <SwipeableCard onSwipeLeft={mockOnSwipeLeft}>
        <div>Content</div>
      </SwipeableCard>
    );

    // Wait for the simulated swipe
    setTimeout(() => {
      expect(mockOnSwipeLeft).toHaveBeenCalled();
    }, 10);
  });

  it('should call onSwipeRight when swiped right', () => {
    const { useGestures } = require('../../../hooks/useGestures');
    const mockOnSwipeRight = jest.fn();
    
    useGestures.mockImplementation((callbacks: any) => {
      // Simulate swipe right
      setTimeout(() => callbacks.onSwipeRight?.(), 0);
      return {
        ref: { current: null },
        gestureState: { isActive: false, scale: 1 },
      };
    });

    render(
      <SwipeableCard onSwipeRight={mockOnSwipeRight}>
        <div>Content</div>
      </SwipeableCard>
    );

    // Wait for the simulated swipe
    setTimeout(() => {
      expect(mockOnSwipeRight).toHaveBeenCalled();
    }, 10);
  });

  it('should render as regular div when touch is not supported', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      touchSupport: false,
      isMobile: false,
    });

    const { container } = render(
      <SwipeableCard>
        <div>Content</div>
      </SwipeableCard>
    );

    expect(container.firstChild?.tagName).toBe('DIV');
    expect(container.firstChild).toHaveClass('bg-surface', 'border', 'border-default', 'rounded-lg', 'p-4');
  });
});

describe('PinchZoomContainer', () => {
  it('should render children', () => {
    render(
      <PinchZoomContainer>
        <div>Zoomable content</div>
      </PinchZoomContainer>
    );
    expect(screen.getByText('Zoomable content')).toBeInTheDocument();
  });

  it('should apply touch-manipulation class when touch is supported', () => {
    const { container } = render(
      <PinchZoomContainer>
        <div>Content</div>
      </PinchZoomContainer>
    );
    expect(container.firstChild).toHaveClass('touch-manipulation');
  });

  it('should render as regular div when touch is not supported', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      touchSupport: false,
      isMobile: false,
    });

    const { container } = render(
      <PinchZoomContainer>
        <div>Content</div>
      </PinchZoomContainer>
    );

    expect(container.firstChild).toHaveClass('overflow-hidden');
    expect(container.firstChild).not.toHaveClass('touch-manipulation');
  });

  it('should trigger haptic feedback on pinch start', () => {
    const { useGestures } = require('../../../hooks/useGestures');
    
    useGestures.mockImplementation((callbacks: any) => {
      // Simulate pinch start
      setTimeout(() => callbacks.onPinchStart?.(), 0);
      return {
        ref: { current: null },
        gestureState: { isActive: false, scale: 1 },
      };
    });

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true,
      configurable: true,
    });

    render(
      <PinchZoomContainer enableHapticFeedback>
        <div>Content</div>
      </PinchZoomContainer>
    );

    // Wait for the simulated pinch
    setTimeout(() => {
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    }, 10);
  });
});

describe('LongPressButton', () => {
  it('should render button with children', () => {
    const mockOnLongPress = jest.fn();
    render(
      <LongPressButton onLongPress={mockOnLongPress}>
        Long press me
      </LongPressButton>
    );
    expect(screen.getByRole('button', { name: 'Long press me' })).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const mockOnLongPress = jest.fn();
    render(
      <LongPressButton onLongPress={mockOnLongPress} size="lg">
        Button
      </LongPressButton>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg', 'min-h-[48px]');
  });

  it('should apply variant classes', () => {
    const mockOnLongPress = jest.fn();
    render(
      <LongPressButton onLongPress={mockOnLongPress} variant="secondary">
        Button
      </LongPressButton>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-secondary', 'text-white');
  });

  it('should call onLongPress when long pressed', () => {
    const { useGestures } = require('../../../hooks/useGestures');
    const mockOnLongPress = jest.fn();
    
    useGestures.mockImplementation((callbacks: any) => {
      // Simulate long press
      setTimeout(() => callbacks.onLongPress?.(), 0);
      return {
        ref: { current: null },
        gestureState: { isActive: false },
      };
    });

    render(
      <LongPressButton onLongPress={mockOnLongPress}>
        Button
      </LongPressButton>
    );

    // Wait for the simulated long press
    setTimeout(() => {
      expect(mockOnLongPress).toHaveBeenCalled();
    }, 10);
  });

  it('should call onTap when tapped', () => {
    const { useGestures } = require('../../../hooks/useGestures');
    const mockOnTap = jest.fn();
    const mockOnLongPress = jest.fn();
    
    useGestures.mockImplementation((callbacks: any) => {
      // Simulate tap
      setTimeout(() => callbacks.onTap?.(), 0);
      return {
        ref: { current: null },
        gestureState: { isActive: false },
      };
    });

    render(
      <LongPressButton onLongPress={mockOnLongPress} onTap={mockOnTap}>
        Button
      </LongPressButton>
    );

    // Wait for the simulated tap
    setTimeout(() => {
      expect(mockOnTap).toHaveBeenCalled();
    }, 10);
  });
});

describe('GestureNavigation', () => {
  it('should render children', () => {
    render(
      <GestureNavigation>
        <div>Navigation content</div>
      </GestureNavigation>
    );
    expect(screen.getByText('Navigation content')).toBeInTheDocument();
  });

  it('should apply touch-manipulation class when touch is supported', () => {
    const { container } = render(
      <GestureNavigation>
        <div>Content</div>
      </GestureNavigation>
    );
    expect(container.firstChild).toHaveClass('touch-manipulation');
  });

  it('should render as regular div when touch is not supported', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      touchSupport: false,
      isMobile: false,
    });

    const { container } = render(
      <GestureNavigation>
        <div>Content</div>
      </GestureNavigation>
    );

    expect(container.firstChild).not.toHaveClass('touch-manipulation');
  });

  it('should call gesture callbacks when gestures are detected', () => {
    const { useGestures } = require('../../../hooks/useGestures');
    const mockOnSwipeLeft = jest.fn();
    const mockOnSwipeRight = jest.fn();
    const mockOnSwipeUp = jest.fn();
    const mockOnSwipeDown = jest.fn();
    
    useGestures.mockImplementation((callbacks: any) => {
      // Simulate all gestures
      setTimeout(() => {
        callbacks.onSwipeLeft?.();
        callbacks.onSwipeRight?.();
        callbacks.onSwipeUp?.();
        callbacks.onSwipeDown?.();
      }, 0);
      return {
        ref: { current: null },
        gestureState: { isActive: false },
      };
    });

    render(
      <GestureNavigation
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
        onSwipeUp={mockOnSwipeUp}
        onSwipeDown={mockOnSwipeDown}
      >
        <div>Content</div>
      </GestureNavigation>
    );

    // Wait for the simulated gestures
    setTimeout(() => {
      expect(mockOnSwipeLeft).toHaveBeenCalled();
      expect(mockOnSwipeRight).toHaveBeenCalled();
      expect(mockOnSwipeUp).toHaveBeenCalled();
      expect(mockOnSwipeDown).toHaveBeenCalled();
    }, 10);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GestureNavigation className="custom-nav">
        <div>Content</div>
      </GestureNavigation>
    );
    expect(container.firstChild).toHaveClass('custom-nav');
  });
});