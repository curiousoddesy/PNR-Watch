import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TouchOptimizedButton, TouchOptimizedCard, TouchOptimizedInput, TouchOptimizedSelect } from '../TouchOptimizedComponents';

import { vi } from 'vitest';

// Mock hooks
vi.mock('../../../hooks/useDeviceDetection', () => ({
  useDeviceDetection: vi.fn(() => ({
    isMobile: false,
    touchSupport: false,
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
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  },
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

describe('TouchOptimizedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with children', () => {
    render(<TouchOptimizedButton>Click me</TouchOptimizedButton>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should apply correct size classes for mobile', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
      touchSupport: true,
    });

    render(<TouchOptimizedButton size="md">Button</TouchOptimizedButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[48px]', 'px-6', 'py-3');
  });

  it('should apply correct size classes for desktop', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: false,
      touchSupport: false,
    });

    render(<TouchOptimizedButton size="md">Button</TouchOptimizedButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[40px]', 'px-4', 'py-2');
  });

  it('should apply variant classes correctly', () => {
    render(<TouchOptimizedButton variant="primary">Button</TouchOptimizedButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary', 'text-white');
  });

  it('should handle click events', async () => {
    const handleClick = jest.fn();
    render(<TouchOptimizedButton onClick={handleClick}>Button</TouchOptimizedButton>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should trigger haptic feedback on touch devices', async () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
      touchSupport: true,
    });

    render(<TouchOptimizedButton hapticFeedback>Button</TouchOptimizedButton>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('should not trigger haptic feedback when disabled', async () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
      touchSupport: true,
    });

    render(<TouchOptimizedButton hapticFeedback={false}>Button</TouchOptimizedButton>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<TouchOptimizedButton loading>Button</TouchOptimizedButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should be disabled when loading', () => {
    const handleClick = jest.fn();
    render(<TouchOptimizedButton loading onClick={handleClick}>Button</TouchOptimizedButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<TouchOptimizedButton className="custom-class">Button</TouchOptimizedButton>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});

describe('TouchOptimizedCard', () => {
  it('should render card with children', () => {
    render(
      <TouchOptimizedCard>
        <div>Card content</div>
      </TouchOptimizedCard>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply mobile padding', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
      touchSupport: true,
    });

    const { container } = render(
      <TouchOptimizedCard>
        <div>Content</div>
      </TouchOptimizedCard>
    );
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('should apply desktop padding', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: false,
      touchSupport: false,
    });

    const { container } = render(
      <TouchOptimizedCard>
        <div>Content</div>
      </TouchOptimizedCard>
    );
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('should handle tap events when interactive', () => {
    const handleTap = jest.fn();
    const { container } = render(
      <TouchOptimizedCard interactive onTap={handleTap}>
        <div>Content</div>
      </TouchOptimizedCard>
    );

    fireEvent.click(container.firstChild!);
    expect(handleTap).toHaveBeenCalled();
  });

  it('should apply interactive styles when interactive', () => {
    const { container } = render(
      <TouchOptimizedCard interactive>
        <div>Content</div>
      </TouchOptimizedCard>
    );
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('should not apply interactive styles when not interactive', () => {
    const { container } = render(
      <TouchOptimizedCard>
        <div>Content</div>
      </TouchOptimizedCard>
    );
    expect(container.firstChild).not.toHaveClass('cursor-pointer');
  });
});

describe('TouchOptimizedInput', () => {
  it('should render input with label', () => {
    render(<TouchOptimizedInput label="Test Label" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('should apply mobile sizing', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
    });

    render(<TouchOptimizedInput />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('px-4', 'py-3', 'text-base', 'min-h-[48px]');
  });

  it('should apply desktop sizing', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: false,
    });

    render(<TouchOptimizedInput />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('px-3', 'py-2', 'text-sm', 'min-h-[40px]');
  });

  it('should display error message', () => {
    render(<TouchOptimizedInput error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should display help text when no error', () => {
    render(<TouchOptimizedInput helpText="Enter your name" />);
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('should prioritize error over help text', () => {
    render(
      <TouchOptimizedInput 
        error="This field is required" 
        helpText="Enter your name" 
      />
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your name')).not.toBeInTheDocument();
  });

  it('should apply error styles', () => {
    render(<TouchOptimizedInput error="Error message" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error', 'focus:ring-error/50', 'focus:border-error');
  });

  it('should handle input changes', async () => {
    const handleChange = jest.fn();
    render(<TouchOptimizedInput onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test');
    
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('TouchOptimizedSelect', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('should render select with options', () => {
    render(<TouchOptimizedSelect options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    options.forEach(option => {
      expect(screen.getByRole('option', { name: option.label })).toBeInTheDocument();
    });
  });

  it('should render with label', () => {
    render(<TouchOptimizedSelect label="Choose option" options={options} />);
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
  });

  it('should apply mobile sizing', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: true,
    });

    render(<TouchOptimizedSelect options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('px-4', 'py-3', 'text-base', 'min-h-[48px]');
  });

  it('should apply desktop sizing', () => {
    const { useDeviceDetection } = require('../../../hooks/useDeviceDetection');
    useDeviceDetection.mockReturnValue({
      isMobile: false,
    });

    render(<TouchOptimizedSelect options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('px-3', 'py-2', 'text-sm', 'min-h-[40px]');
  });

  it('should display error message', () => {
    render(<TouchOptimizedSelect options={options} error="Please select an option" />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('should display help text', () => {
    render(<TouchOptimizedSelect options={options} helpText="Choose your preference" />);
    expect(screen.getByText('Choose your preference')).toBeInTheDocument();
  });

  it('should handle selection changes', async () => {
    const handleChange = jest.fn();
    render(<TouchOptimizedSelect options={options} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'option2');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply error styles', () => {
    render(<TouchOptimizedSelect options={options} error="Error message" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-error', 'focus:ring-error/50', 'focus:border-error');
  });
});