/**
 * Jest setup file for PNR History Screen tests
 * Configures global test environment and utilities
 */

// Import Jest globals
const { expect, describe, test, beforeEach, afterEach } = require('@jest/globals');

// Make Jest globals available
global.expect = expect;
global.describe = describe;
global.test = test;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

// Polyfill for TextEncoder/TextDecoder (required for JSDOM)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage for theme testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock matchMedia for responsive design testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Custom matchers for DOM testing
expect.extend({
  toBeVisible(received) {
    const pass = !received.classList.contains('hidden');
    if (pass) {
      return {
        message: () => `expected element to be hidden`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to be visible`,
        pass: false,
      };
    }
  },
  
  toHaveClass(received, className) {
    const pass = received.classList.contains(className);
    if (pass) {
      return {
        message: () => `expected element not to have class "${className}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have class "${className}"`,
        pass: false,
      };
    }
  }
});