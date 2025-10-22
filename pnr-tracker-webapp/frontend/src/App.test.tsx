import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

// Mock localStorage for tests
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
});

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Since we don't have auth token, it should redirect to login
    // For now, just check that the app renders
    expect(document.body).toBeDefined();
  });
});