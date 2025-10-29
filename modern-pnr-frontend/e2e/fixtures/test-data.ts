export const testPNRs = [
  {
    pnr: 'ABC123456',
    status: 'Confirmed',
    journey: {
      from: 'New Delhi',
      to: 'Mumbai',
      date: '2024-12-15',
      train: 'Rajdhani Express'
    }
  },
  {
    pnr: 'DEF789012',
    status: 'Waitlisted',
    journey: {
      from: 'Bangalore',
      to: 'Chennai',
      date: '2024-12-20',
      train: 'Shatabdi Express'
    }
  },
  {
    pnr: 'GHI345678',
    status: 'RAC',
    journey: {
      from: 'Kolkata',
      to: 'Delhi',
      date: '2024-12-25',
      train: 'Duronto Express'
    }
  }
];

export const mockUser = {
  name: 'Test User',
  email: 'test@example.com',
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'en'
  }
};

export const performanceThresholds = {
  fcp: 1500, // First Contentful Paint
  lcp: 2500, // Largest Contentful Paint
  fid: 100,  // First Input Delay
  cls: 0.1,  // Cumulative Layout Shift
  ttfb: 800  // Time to First Byte
};