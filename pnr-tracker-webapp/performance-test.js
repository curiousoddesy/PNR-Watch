#!/usr/bin/env node

/**
 * Performance Testing Script
 * Tests system performance under realistic load conditions
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.results = {
      responseTime: [],
      throughput: 0,
      errorRate: 0,
      memoryUsage: [],
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async measureResponseTime(testFunction, testName) {
    const start = performance.now();
    try {
      await testFunction();
      const end = performance.now();
      const responseTime = end - start;
      this.results.responseTime.push({ test: testName, time: responseTime });
      return responseTime;
    } catch (error) {
      const end = performance.now();
      const responseTime = end - start;
      this.results.errors.push({ test: testName, error: error.message, time: responseTime });
      throw error;
    }
  }

  async createTestUser() {
    const testUser = {
      name: 'Performance Test User',
      email: `perf-test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    const response = await axios.post(`${this.baseURL}/api/auth/register`, testUser);
    return {
      token: response.data.token,
      user: response.data.user
    };
  }

  async testSingleUserWorkflow() {
    this.log('Testing single user workflow...');

    const { token } = await this.createTestUser();
    const headers = { Authorization: `Bearer ${token}` };

    // Test PNR operations
    const pnrResponse = await axios.post(
      `${this.baseURL}/api/pnrs`,
      { pnr: '1234567890' },
      { headers }
    );

    await axios.get(`${this.baseURL}/api/pnrs`, { headers });
    
    // Clean up
    await axios.delete(`${this.baseURL}/api/pnrs/${pnrResponse.data.id}`, { headers });
  }

  async testConcurrentUsers(userCount = 10) {
    this.log(`Testing ${userCount} concurrent users...`);

    const promises = [];
    const startTime = performance.now();

    for (let i = 0; i < userCount; i++) {
      promises.push(
        this.measureResponseTime(
          () => this.testSingleUserWorkflow(),
          `concurrent-user-${i}`
        ).catch(error => {
          this.log(`Concurrent user ${i} failed: ${error.message}`, 'error');
        })
      );
    }

    await Promise.allSettled(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    this.results.throughput = userCount / (totalTime / 1000); // users per second
    this.log(`Completed ${userCount} concurrent users in ${totalTime.toFixed(2)}ms`);
  }

  async testAPIEndpointPerformance() {
    this.log('Testing API endpoint performance...');

    const { token } = await this.createTestUser();
    const headers = { Authorization: `Bearer ${token}` };

    // Test various endpoints
    const endpoints = [
      { method: 'GET', url: '/health', headers: {} },
      { method: 'GET', url: '/api/monitoring/health', headers },
      { method: 'GET', url: '/api/pnrs', headers },
      { method: 'GET', url: '/api/notifications', headers }
    ];

    for (const endpoint of endpoints) {
      const testName = `${endpoint.method} ${endpoint.url}`;
      
      try {
        const responseTime = await this.measureResponseTime(async () => {
          if (endpoint.method === 'GET') {
            await axios.get(`${this.baseURL}${endpoint.url}`, { headers: endpoint.headers });
          }
        }, testName);

        this.log(`${testName}: ${responseTime.toFixed(2)}ms`);
      } catch (error) {
        this.log(`${testName} failed: ${error.message}`, 'error');
      }
    }
  }

  async testDatabasePerformance() {
    this.log('Testing database performance...');

    const { token } = await this.createTestUser();
    const headers = { Authorization: `Bearer ${token}` };

    // Test multiple PNR operations
    const pnrIds = [];
    const batchSize = 20;

    // Create multiple PNRs
    for (let i = 0; i < batchSize; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/api/pnrs`,
          { pnr: `123456789${i.toString().padStart(1, '0')}` },
          { headers }
        );
        pnrIds.push(response.data.id);
      } catch (error) {
        // Skip if PNR already exists or validation fails
      }
    }

    // Test batch retrieval
    const retrievalTime = await this.measureResponseTime(async () => {
      await axios.get(`${this.baseURL}/api/pnrs`, { headers });
    }, 'batch-pnr-retrieval');

    this.log(`Retrieved ${pnrIds.length} PNRs in ${retrievalTime.toFixed(2)}ms`);

    // Clean up
    for (const pnrId of pnrIds) {
      try {
        await axios.delete(`${this.baseURL}/api/pnrs/${pnrId}`, { headers });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  async testMemoryUsage() {
    this.log('Testing memory usage...');

    const { token } = await this.createTestUser();
    const headers = { Authorization: `Bearer ${token}` };

    // Monitor memory during operations
    const initialMemory = process.memoryUsage();
    this.results.memoryUsage.push({ phase: 'initial', ...initialMemory });

    // Perform memory-intensive operations
    const operations = [];
    for (let i = 0; i < 50; i++) {
      operations.push(
        axios.get(`${this.baseURL}/api/pnrs`, { headers }).catch(() => {})
      );
    }

    await Promise.allSettled(operations);

    const finalMemory = process.memoryUsage();
    this.results.memoryUsage.push({ phase: 'final', ...finalMemory });

    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    this.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  }

  async testErrorHandling() {
    this.log('Testing error handling performance...');

    // Test various error scenarios
    const errorTests = [
      {
        name: 'Invalid endpoint',
        test: () => axios.get(`${this.baseURL}/api/invalid-endpoint`)
      },
      {
        name: 'Invalid authentication',
        test: () => axios.get(`${this.baseURL}/api/pnrs`, {
          headers: { Authorization: 'Bearer invalid-token' }
        })
      },
      {
        name: 'Malformed request',
        test: () => axios.post(`${this.baseURL}/api/auth/login`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    ];

    for (const errorTest of errorTests) {
      try {
        await this.measureResponseTime(errorTest.test, errorTest.name);
      } catch (error) {
        // Expected to fail, measure response time
        this.log(`${errorTest.name}: Error handled in expected time`);
      }
    }
  }

  calculateStatistics() {
    const responseTimes = this.results.responseTime.map(r => r.time);
    
    if (responseTimes.length === 0) {
      return {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0
      };
    }

    responseTimes.sort((a, b) => a - b);

    return {
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: responseTimes[0],
      maxResponseTime: responseTimes[responseTimes.length - 1],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)]
    };
  }

  generateReport() {
    const stats = this.calculateStatistics();
    const errorRate = (this.results.errors.length / (this.results.responseTime.length + this.results.errors.length)) * 100;

    const report = `
# Performance Test Report

## Summary
- **Total Tests**: ${this.results.responseTime.length + this.results.errors.length}
- **Successful Tests**: ${this.results.responseTime.length}
- **Failed Tests**: ${this.results.errors.length}
- **Error Rate**: ${errorRate.toFixed(2)}%
- **Throughput**: ${this.results.throughput.toFixed(2)} requests/second

## Response Time Statistics
- **Average**: ${stats.avgResponseTime.toFixed(2)}ms
- **Minimum**: ${stats.minResponseTime.toFixed(2)}ms
- **Maximum**: ${stats.maxResponseTime.toFixed(2)}ms
- **95th Percentile**: ${stats.p95ResponseTime.toFixed(2)}ms

## Performance Thresholds
- ✅ Average response time < 1000ms: ${stats.avgResponseTime < 1000 ? 'PASS' : 'FAIL'}
- ✅ 95th percentile < 2000ms: ${stats.p95ResponseTime < 2000 ? 'PASS' : 'FAIL'}
- ✅ Error rate < 5%: ${errorRate < 5 ? 'PASS' : 'FAIL'}
- ✅ Throughput > 1 req/s: ${this.results.throughput > 1 ? 'PASS' : 'FAIL'}

## Memory Usage
${this.results.memoryUsage.map(m => 
  `- **${m.phase}**: ${(m.heapUsed / 1024 / 1024).toFixed(2)} MB`
).join('\n')}

## Failed Tests
${this.results.errors.length > 0 ? 
  this.results.errors.map(e => `- **${e.test}**: ${e.error}`).join('\n') :
  'No failed tests'
}

## Recommendations
${stats.avgResponseTime > 1000 ? '- Optimize slow API endpoints\n' : ''}${stats.p95ResponseTime > 2000 ? '- Investigate performance bottlenecks\n' : ''}${errorRate > 5 ? '- Improve error handling and stability\n' : ''}${this.results.throughput < 1 ? '- Scale application infrastructure\n' : ''}
`;

    return report;
  }

  async runAllTests() {
    try {
      this.log('Starting performance tests...');

      // Wait for server to be ready
      await this.waitForServer();

      // Run performance tests
      await this.testAPIEndpointPerformance();
      await this.testDatabasePerformance();
      await this.testConcurrentUsers(5); // Start with 5 concurrent users
      await this.testMemoryUsage();
      await this.testErrorHandling();

      // Generate and save report
      const report = this.generateReport();
      const fs = require('fs');
      fs.writeFileSync('performance-report.md', report);

      this.log('Performance tests completed!', 'success');
      this.log('Report saved to performance-report.md');

      console.log(report);

      return true;

    } catch (error) {
      this.log(`Performance tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async waitForServer() {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
        this.log('Server is ready for performance testing', 'success');
        return;
      } catch (error) {
        attempts++;
        this.log(`Waiting for server... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Server not available for performance testing');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Performance test runner failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTester;