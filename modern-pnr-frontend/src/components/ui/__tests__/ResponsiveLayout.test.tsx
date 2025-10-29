import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveLayout, ResponsiveGrid, ResponsiveFlex, ResponsiveContainer } from '../ResponsiveLayout';

import { vi } from 'vitest';

// Mock hooks
vi.mock('../../../hooks/useDeviceDetection', () => ({
  useDeviceDetection: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    screenSize: 'lg',
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(
      <ResponsiveLayout>
        <div>Test content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ResponsiveLayout className="custom-class">
        <div>Test content</div>
      </ResponsiveLayout>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply adaptive spacing for mobile', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
      isTablet: false,
      screenSize: 'xs',
    });

    const { container } = render(
      <ResponsiveLayout adaptiveSpacing>
        <div>Test content</div>
      </ResponsiveLayout>
    );

    expect(container.firstChild).toHaveClass('px-4', 'py-2');
  });

  it('should apply adaptive spacing for tablet', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: false,
      isTablet: true,
      screenSize: 'md',
    });

    const { container } = render(
      <ResponsiveLayout adaptiveSpacing>
        <div>Test content</div>
      </ResponsiveLayout>
    );

    expect(container.firstChild).toHaveClass('px-6', 'py-4');
  });

  it('should disable animations when specified', () => {
    const { container } = render(
      <ResponsiveLayout enableAnimations={false}>
        <div>Test content</div>
      </ResponsiveLayout>
    );

    // Should render as regular div when animations are disabled
    expect(container.firstChild?.tagName).toBe('DIV');
  });
});

describe('ResponsiveGrid', () => {
  it('should render with default grid classes', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'lg',
    });

    const { container } = render(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );

    expect(container.firstChild).toHaveClass('grid', 'grid-cols-4', 'gap-6');
  });

  it('should apply custom columns for different screen sizes', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'xs',
    });

    const { container } = render(
      <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1');
  });

  it('should apply custom gap for different screen sizes', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'sm',
    });

    const { container } = render(
      <ResponsiveGrid gap={{ xs: 2, sm: 4, md: 6 }}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    );

    expect(container.firstChild).toHaveClass('gap-4');
  });
});

describe('ResponsiveFlex', () => {
  it('should render with default flex classes', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'md',
    });

    const { container } = render(
      <ResponsiveFlex>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveFlex>
    );

    expect(container.firstChild).toHaveClass(
      'flex',
      'flex-row',
      'items-start',
      'justify-start',
      'flex-wrap',
      'gap-4'
    );
  });

  it('should apply responsive direction', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'xs',
    });

    const { container } = render(
      <ResponsiveFlex direction={{ xs: 'col', md: 'row' }}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveFlex>
    );

    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('should apply alignment and justification', () => {
    const { container } = render(
      <ResponsiveFlex align="center" justify="between">
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveFlex>
    );

    expect(container.firstChild).toHaveClass('items-center', 'justify-between');
  });

  it('should disable wrapping when specified', () => {
    const { container } = render(
      <ResponsiveFlex wrap={false}>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveFlex>
    );

    expect(container.firstChild).toHaveClass('flex-nowrap');
  });
});

describe('ResponsiveContainer', () => {
  it('should render with default container classes', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'lg',
    });

    const { container } = render(
      <ResponsiveContainer>
        <div>Content</div>
      </ResponsiveContainer>
    );

    expect(container.firstChild).toHaveClass('mx-auto', 'w-full');
  });

  it('should apply responsive max-width', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'sm',
    });

    const { container } = render(
      <ResponsiveContainer maxWidth={{ xs: '100%', sm: '640px', lg: '1024px' }}>
        <div>Content</div>
      </ResponsiveContainer>
    );

    expect(container.firstChild).toHaveClass('max-w-[640px]');
  });

  it('should apply responsive padding', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      screenSize: 'xs',
    });

    const { container } = render(
      <ResponsiveContainer padding={{ xs: 4, sm: 6, lg: 8 }}>
        <div>Content</div>
      </ResponsiveContainer>
    );

    expect(container.firstChild).toHaveClass('px-4');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ResponsiveContainer className="custom-container">
        <div>Content</div>
      </ResponsiveContainer>
    );

    expect(container.firstChild).toHaveClass('custom-container');
  });
});