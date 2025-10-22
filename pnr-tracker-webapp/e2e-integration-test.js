#!/usr/bin/env node

/**
 * End-to-End Integration Test Script
 * Tests complete user workflows from registration to PNR tracking
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:3001',
  FRONTEND_URL: 'http://localhost:5173',
  TEST_USER: {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  },
  TEST_PNR: '1234567890',
  TIMEOUT: 30000
};

class IntegrationTester {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.authToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startServices() {
    this.log('Starting backend and frontend services...');
    
    // Start backend
    this.backendProcess = spawn('npm', ['run', 'dev:backend'], {
      cwd: path.join(__dirname),
      stdio: 'pipe',
      shell: true
    });

    // Start frontend
    this.frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
      cwd: path.join(__dirname),
      stdio: 'pipe',
      shell: true
    });

    // Wait for services to start
    await this.sleep(10000);
    
    // Check if services are running
    await this.waitForService(CONFIG.BACKEND_URL + '/health', 'Backend');
    await this.waitForService(CONFIG.FRONTEND_URL, 'Frontend');
  }

  async waitForService(url, serviceName) {
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        await axios.get(url, { timeout: 5000 });
        this.log(`${serviceName} service is ready`, 'success');
        return;
      } catch (error) {
        attempts++;
        this.log(`Waiting for ${serviceName} service... (${attempts}/${maxAttempts})`);
        await this.sleep(2000);
      }
    }
    
    throw new Error(`${serviceName} service failed to start after ${maxAttempts} attempts`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Running test: ${testName}`);
      await testFunction();
      this.testResults.passed++;
      this.log(`Test passed: ${testName}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
    }
  }

  async testHealthEndpoints() {
    // Test backend health
    const healthResponse = await axios.get(`${CONFIG.BACKEND_URL}/health`);
    if (healthResponse.status !== 200) {
      throw new Error('Backend health check failed');
    }

    // Test monitoring endpoints
    const monitoringResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/monitoring/health`);
    if (monitoringResponse.status !== 200) {
      throw new Error('Monitoring health check failed');
    }
  }

  async testUserRegistration() {
    const response = await axios.post(`${CONFIG.BACKEND_URL}/api/auth/register`, CONFIG.TEST_USER);
    
    if (response.status !== 201) {
      throw new Error(`Registration failed with status ${response.status}`);
    }

    if (!response.data.token || !response.data.user) {
      throw new Error('Registration response missing token or user data');
    }

    this.authToken = response.data.token;
    this.log('User registered successfully with token');
  }

  async testUserLogin() {
    const response = await axios.post(`${CONFIG.BACKEND_URL}/api/auth/login`, {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password
    });

    if (response.status !== 200) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    if (!response.data.token) {
      throw new Error('Login response missing token');
    }

    this.authToken = response.data.token;
  }

  async testPNRManagement() {
    const headers = { Authorization: `Bearer ${this.authToken}` };

    // Test adding PNR
    const addResponse = await axios.post(
      `${CONFIG.BACKEND_URL}/api/pnrs`,
      { pnr: CONFIG.TEST_PNR },
      { headers }
    );

    if (addResponse.status !== 201) {
      throw new Error(`Add PNR failed with status ${addResponse.status}`);
    }

    const pnrId = addResponse.data.id;

    // Test getting PNRs
    const getResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/pnrs`, { headers });
    
    if (getResponse.status !== 200) {
      throw new Error(`Get PNRs failed with status ${getResponse.status}`);
    }

    if (!Array.isArray(getResponse.data) || getResponse.data.length === 0) {
      throw new Error('No PNRs returned from API');
    }

    // Test PNR status check (this might fail due to IRCTC scraping, but should not crash)
    try {
      await axios.get(`${CONFIG.BACKEND_URL}/api/pnrs/${pnrId}/status`, { headers });
      this.log('PNR status check completed (may have failed due to invalid PNR)');
    } catch (error) {
      if (error.response?.status === 400) {
        this.log('PNR status check failed as expected for test PNR');
      } else {
        throw error;
      }
    }

    // Test removing PNR
    const deleteResponse = await axios.delete(`${CONFIG.BACKEND_URL}/api/pnrs/${pnrId}`, { headers });
    
    if (deleteResponse.status !== 200) {
      throw new Error(`Delete PNR failed with status ${deleteResponse.status}`);
    }
  }

  async testNotifications() {
    const headers = { Authorization: `Bearer ${this.authToken}` };

    // Test getting notifications
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/notifications`, { headers });
    
    if (response.status !== 200) {
      throw new Error(`Get notifications failed with status ${response.status}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Notifications response is not an array');
    }
  }

  async testWebSocketConnection() {
    return new Promise((resolve, reject) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:3001`);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.log('WebSocket connection established');
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });
    });
  }

  async testFrontendAccessibility() {
    // Test if frontend is serving files
    const response = await axios.get(CONFIG.FRONTEND_URL);
    
    if (response.status !== 200) {
      throw new Error(`Frontend not accessible, status: ${response.status}`);
    }

    if (!response.data.includes('PNR Tracker') && !response.data.includes('root')) {
      throw new Error('Frontend does not appear to be serving the correct application');
    }
  }

  async testDatabaseConnection() {
    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // Test database connectivity through API
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/monitoring/health`, { headers });
    
    if (response.status !== 200) {
      throw new Error('Database health check failed');
    }

    if (response.data.database?.status !== 'healthy') {
      throw new Error('Database is not healthy');
    }
  }

  async cleanup() {
    this.log('Cleaning up test environment...');
    
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
    }

    // Wait for processes to terminate
    await this.sleep(2000);
  }

  async runAllTests() {
    try {
      this.log('Starting End-to-End Integration Tests');
      
      await this.startServices();

      // Run all tests
      await this.runTest('Health Endpoints', () => this.testHealthEndpoints());
      await this.runTest('User Registration', () => this.testUserRegistration());
      await this.runTest('User Login', () => this.testUserLogin());
      await this.runTest('PNR Management', () => this.testPNRManagement());
      await this.runTest('Notifications', () => this.testNotifications());
      await this.runTest('WebSocket Connection', () => this.testWebSocketConnection());
      await this.runTest('Frontend Accessibility', () => this.testFrontendAccessibility());
      await this.runTest('Database Connection', () => this.testDatabaseConnection());

      // Print results
      this.log('\n=== TEST RESULTS ===');
      this.log(`Passed: ${this.testResults.passed}`);
      this.log(`Failed: ${this.testResults.failed}`);
      
      if (this.testResults.errors.length > 0) {
        this.log('\nFailed Tests:');
        this.testResults.errors.forEach(({ test, error }) => {
          this.log(`  - ${test}: ${error}`, 'error');
        });
      }

      const success = this.testResults.failed === 0;
      this.log(`\nOverall Result: ${success ? 'PASS' : 'FAIL'}`, success ? 'success' : 'error');
      
      return success;

    } catch (error) {
      this.log(`Integration test failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;