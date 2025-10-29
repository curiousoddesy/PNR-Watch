/**
 * Unit Tests for Core PNR Services
 * Tests PNR validation, HTML parsing, and batch processing functionality
 * Requirements: 2.1, 3.1, 6.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PNRValidatorService } from '../services/pnr-validator';
import { HTMLParserService } from '../services/html-parser';
import { BatchProcessorService } from '../services/batch-processor';
import { IRCTCScraperService } from '../services/irctc-scraper';
import { PNRStatusResult } from '../types';

// Mock request module for IRCTC scraper tests
vi.mock('request', () => ({
  default: vi.fn()
}));

// Mock logger to avoid console output during tests
vi.mock('../services/logger', () => ({
  logger: {
    logExternalAPI: vi.fn(),
    logError: vi.fn(),
    logInfo: vi.fn()
  }
}));

// Mock error alerting
vi.mock('../services/error-alerting', () => ({
  errorAlerting: {
    sendMediumAlert: vi.fn()
  },
  AlertType: {
    EXTERNAL_SERVICE_DOWN: 'EXTERNAL_SERVICE_DOWN'
  }
}));

describe('PNR Validation Service', () => {
  describe('validatePnr', () => {
    it('should validate correct 10-digit PNR', () => {
      expect(() => PNRValidatorService.validatePnr('1234567890')).not.toThrow();
      expect(PNRValidatorService.validatePnr('1234567890')).toBe(true);
    });

    it('should validate PNR with all zeros', () => {
      expect(() => PNRValidatorService.validatePnr('0000000000')).not.toThrow();
      expect(PNRValidatorService.validatePnr('0000000000')).toBe(true);
    });

    it('should validate PNR with all nines', () => {
      expect(() => PNRValidatorService.validatePnr('9999999999')).not.toThrow();
      expect(PNRValidatorService.validatePnr('9999999999')).toBe(true);
    });

    it('should throw error for null PNR', () => {
      expect(() => PNRValidatorService.validatePnr(null as any)).toThrow('Invalid PNR: PNR must be a string');
    });

    it('should throw error for undefined PNR', () => {
      expect(() => PNRValidatorService.validatePnr(undefined as any)).toThrow('Invalid PNR: PNR must be a string');
    });

    it('should throw error for empty string PNR', () => {
      expect(() => PNRValidatorService.validatePnr('')).toThrow('Invalid PNR: PNR must be a string');
    });

    it('should throw error for non-string PNR', () => {
      expect(() => PNRValidatorService.validatePnr(1234567890 as any)).toThrow('Invalid PNR: PNR must be a string');
    });

    it('should throw error for PNR shorter than 10 digits', () => {
      expect(() => PNRValidatorService.validatePnr('123456789')).toThrow('Invalid PNR: PNR must be exactly 10 digits');
    });

    it('should throw error for PNR longer than 10 digits', () => {
      expect(() => PNRValidatorService.validatePnr('12345678901')).toThrow('Invalid PNR: PNR must be exactly 10 digits');
    });

    it('should throw error for PNR with letters', () => {
      expect(() => PNRValidatorService.validatePnr('123456789A')).toThrow('Invalid PNR: PNR must contain only digits');
    });

    it('should throw error for PNR with special characters', () => {
      expect(() => PNRValidatorService.validatePnr('123456789-')).toThrow('Invalid PNR: PNR must contain only digits');
      expect(() => PNRValidatorService.validatePnr('123456789.')).toThrow('Invalid PNR: PNR must contain only digits');
      expect(() => PNRValidatorService.validatePnr('123456789 ')).toThrow('Invalid PNR: PNR must contain only digits');
    });

    it('should throw error for PNR with spaces', () => {
      expect(() => PNRValidatorService.validatePnr('1234 56789')).toThrow('Invalid PNR: PNR must contain only digits');
      expect(() => PNRValidatorService.validatePnr(' 123456789')).toThrow('Invalid PNR: PNR must contain only digits');
    });
  });

  describe('isValidPnr', () => {
    it('should return true for valid PNR', () => {
      expect(PNRValidatorService.isValidPnr('1234567890')).toBe(true);
    });

    it('should return false for invalid PNR without throwing', () => {
      expect(PNRValidatorService.isValidPnr('123')).toBe(false);
      expect(PNRValidatorService.isValidPnr('123456789A')).toBe(false);
      expect(PNRValidatorService.isValidPnr('')).toBe(false);
      expect(PNRValidatorService.isValidPnr(null as any)).toBe(false);
    });
  });
});

describe('HTML Parser Service', () => {
  const mockConfirmedHtml = `
    <html>
      <body>
        <table>
          <tbody>
            <tr>
              <td>
                <table>
                  <tbody>
                    <tr>
                      <td>
                        <table>
                          <tbody>
                            <tr>
                              <td>
                                <table>
                                  <tbody>
                                    <tr>
                                      <td>
                                        <table>
                                          <tbody>
                                            <tr>
                                              <td>
                                                <table>
                                                  <tbody>
                                                    <tr>
                                                      <td>
                                                        <table>
                                                          <tbody>
                                                            <tr>
                                                              <td class="text_back_color">
                                                                <table>
                                                                  <tbody>
                                                                    <tr>
                                                                      <td>
                                                                        <table>
                                                                          <tbody>
                                                                            <tr>
                                                                              <td>NEW DELHI</td>
                                                                              <td>MUMBAI CENTRAL</td>
                                                                              <td>15-Jan-2024</td>
                                                                            </tr>
                                                                          </tbody>
                                                                        </table>
                                                                        <table>
                                                                          <tbody>
                                                                            <tr>
                                                                              <td></td>
                                                                              <td></td>
                                                                              <td>CNF/S1/25</td>
                                                                            </tr>
                                                                          </tbody>
                                                                        </table>
                                                                      </td>
                                                                    </tr>
                                                                  </tbody>
                                                                </table>
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const mockFlushedHtml = `
    <html>
      <body>
        <div>FLUSHED PNR / पीएनआर फ्लश्ड</div>
        <p>The PNR you entered is either invalid or flushed. Please check your PNR and try again.</p>
      </body>
    </html>
  `;

  const mockEmptyHtml = `
    <html>
      <body>
        <p>No data found</p>
      </body>
    </html>
  `;

  describe('getDataFromHtml', () => {
    it('should extract data using CSS selectors', async () => {
      const selectors = ['td'];
      const result = await HTMLParserService.getDataFromHtml(mockConfirmedHtml, selectors);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[0].length).toBeGreaterThan(0);
    });

    it('should handle multiple selectors', async () => {
      const selectors = ['td', 'div', 'p'];
      const result = await HTMLParserService.getDataFromHtml(mockConfirmedHtml, selectors);
      
      expect(result.length).toBe(3);
      expect(Array.isArray(result[0])).toBe(true);
      expect(Array.isArray(result[1])).toBe(true);
      expect(Array.isArray(result[2])).toBe(true);
    });

    it('should return empty arrays for non-matching selectors', async () => {
      const selectors = ['nonexistent'];
      const result = await HTMLParserService.getDataFromHtml(mockConfirmedHtml, selectors);
      
      expect(result.length).toBe(1);
      expect(result[0]).toEqual([]);
    });

    it('should handle empty HTML', async () => {
      const selectors = ['td'];
      const result = await HTMLParserService.getDataFromHtml('', selectors);
      
      expect(result.length).toBe(1);
      expect(result[0]).toEqual([]);
    });

    it('should remove extra spaces from extracted text', async () => {
      const htmlWithSpaces = '<div>  Multiple   spaces   text  </div>';
      const selectors = ['div'];
      const result = await HTMLParserService.getDataFromHtml(htmlWithSpaces, selectors);
      
      expect(result[0][0]).toBe('Multiple spaces text');
    });
  });

  describe('fixFormatting', () => {
    it('should format parsed data into journey details', () => {
      const rawData = [
        ['NEW DELHI', 'CHENNAI'],
        ['MUMBAI', 'BANGALORE'],
        ['15-Jan-2024', '20-Jan-2024'],
        ['CNF/S1/25', 'WL/15']
      ];
      const headers = ['from', 'to', 'date', 'status'];
      
      const result = HTMLParserService.fixFormatting(rawData, headers);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        from: 'NEW DELHI',
        to: 'MUMBAI',
        date: '15-Jan-2024',
        status: 'CNF/S1/25'
      });
      expect(result[1]).toEqual({
        from: 'CHENNAI',
        to: 'BANGALORE',
        date: '20-Jan-2024',
        status: 'WL/15'
      });
    });

    it('should handle empty data', () => {
      const result = HTMLParserService.fixFormatting([], []);
      expect(result).toEqual([]);
    });

    it('should handle missing data fields', () => {
      const rawData = [
        ['NEW DELHI'],
        ['MUMBAI'],
        [], // Missing date
        ['CNF/S1/25']
      ];
      const headers = ['from', 'to', 'date', 'status'];
      
      const result = HTMLParserService.fixFormatting(rawData, headers);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        from: 'NEW DELHI',
        to: 'MUMBAI',
        date: '',
        status: 'CNF/S1/25'
      });
    });
  });

  describe('parseIRCTCResponse', () => {
    it('should parse confirmed PNR response', async () => {
      const result = await HTMLParserService.parseIRCTCResponse(mockConfirmedHtml);
      
      expect(result.journeyDetails).toBeDefined();
      expect(Array.isArray(result.journeyDetails)).toBe(true);
      expect(result.flushedPNRs).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle flushed PNR response', async () => {
      const result = await HTMLParserService.parseIRCTCResponse(mockFlushedHtml);
      
      expect(result.journeyDetails).toBeDefined();
      expect(result.flushedPNRs).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty response', async () => {
      const result = await HTMLParserService.parseIRCTCResponse(mockEmptyHtml);
      
      expect(result.journeyDetails).toEqual([]);
      expect(result.flushedPNRs).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle malformed HTML', async () => {
      const result = await HTMLParserService.parseIRCTCResponse('<invalid>html');
      
      expect(result.journeyDetails).toEqual([]);
      expect(result.flushedPNRs).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });
});

describe('Batch Processor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processBatch', () => {
    it('should process single PNR successfully', async () => {
      // Mock IRCTCScraperService.performRequest
      const mockResult: PNRStatusResult = {
        pnr: '1234567890',
        from: 'NEW DELHI',
        to: 'MUMBAI',
        date: '15-Jan-2024',
        status: 'CNF/S1/25',
        isFlushed: false,
        lastUpdated: new Date()
      };

      vi.spyOn(IRCTCScraperService, 'performRequest').mockResolvedValue(mockResult);

      const result = await BatchProcessorService.processBatch(['1234567890']);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(mockResult);
      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccessful).toBe(1);
      expect(result.totalFailed).toBe(0);
      expect(result.flushedPNRs).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should process multiple PNRs successfully', async () => {
      const mockResults: PNRStatusResult[] = [
        {
          pnr: '1234567890',
          from: 'NEW DELHI',
          to: 'MUMBAI',
          date: '15-Jan-2024',
          status: 'CNF/S1/25',
          isFlushed: false,
          lastUpdated: new Date()
        },
        {
          pnr: '2345678901',
          from: 'CHENNAI',
          to: 'BANGALORE',
          date: '20-Jan-2024',
          status: 'WL/15',
          isFlushed: false,
          lastUpdated: new Date()
        }
      ];

      vi.spyOn(IRCTCScraperService, 'performRequest')
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await BatchProcessorService.processBatch(['1234567890', '2345678901'], { requestDelay: 10 });

      expect(result.results).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
      expect(result.totalSuccessful).toBe(2);
      expect(result.totalFailed).toBe(0);
    });

    it('should handle flushed PNRs', async () => {
      const mockFlushedResult: PNRStatusResult = {
        pnr: '3456789012',
        from: '',
        to: '',
        date: '',
        status: 'FLUSHED',
        isFlushed: true,
        lastUpdated: new Date()
      };

      vi.spyOn(IRCTCScraperService, 'performRequest').mockResolvedValue(mockFlushedResult);

      const result = await BatchProcessorService.processBatch(['3456789012']);

      expect(result.results).toHaveLength(1);
      expect(result.flushedPNRs).toEqual(['3456789012']);
      expect(result.totalSuccessful).toBe(1);
    });

    it('should handle PNR with errors', async () => {
      const mockErrorResult: PNRStatusResult = {
        pnr: '4567890123',
        from: '',
        to: '',
        date: '',
        status: 'Error',
        isFlushed: false,
        lastUpdated: new Date(),
        error: 'Parse Error' // Use non-retryable error
      };

      vi.spyOn(IRCTCScraperService, 'performRequest').mockResolvedValue(mockErrorResult);

      const result = await BatchProcessorService.processBatch(['4567890123'], { 
        requestDelay: 10, 
        maxRetries: 0, // No retries
        retryDelay: 10 
      });

      expect(result.results).toHaveLength(1);
      expect(result.totalFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].pnr).toBe('4567890123');
      expect(result.errors[0].error).toBe('Parse Error');
    }, 5000);

    it('should handle service exceptions', async () => {
      vi.spyOn(IRCTCScraperService, 'performRequest').mockRejectedValue(new Error('Service unavailable'));

      const result = await BatchProcessorService.processBatch(['5678901234'], { requestDelay: 10, maxRetries: 1 });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].error).toBe('Service unavailable');
      expect(result.totalFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
    }, 10000);

    it('should respect processing options', async () => {
      const mockResult: PNRStatusResult = {
        pnr: '1234567890',
        from: 'NEW DELHI',
        to: 'MUMBAI',
        date: '15-Jan-2024',
        status: 'CNF/S1/25',
        isFlushed: false,
        lastUpdated: new Date()
      };

      vi.spyOn(IRCTCScraperService, 'performRequest').mockResolvedValue(mockResult);

      const startTime = Date.now();
      const result = await BatchProcessorService.processBatch(
        ['1234567890', '2345678901'],
        { requestDelay: 100, maxRetries: 1 }
      );
      const endTime = Date.now();

      expect(result.totalProcessed).toBe(2);
      // Should have some delay between requests
      expect(endTime - startTime).toBeGreaterThan(90);
    });

    it('should call progress callback', async () => {
      const mockResult: PNRStatusResult = {
        pnr: '1234567890',
        from: 'NEW DELHI',
        to: 'MUMBAI',
        date: '15-Jan-2024',
        status: 'CNF/S1/25',
        isFlushed: false,
        lastUpdated: new Date()
      };

      vi.spyOn(IRCTCScraperService, 'performRequest').mockResolvedValue(mockResult);

      const progressCallback = vi.fn();
      await BatchProcessorService.processBatch(['1234567890'], {}, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(1, 1, '1234567890');
    });

    it('should handle empty PNR list', async () => {
      const result = await BatchProcessorService.processBatch([]);

      expect(result.results).toEqual([]);
      expect(result.totalProcessed).toBe(0);
      expect(result.totalSuccessful).toBe(0);
      expect(result.totalFailed).toBe(0);
    });
  });

  describe('processWithThrottling', () => {
    it('should process with throttling', async () => {
      const mockResult: PNRStatusResult = {
        pnr: '1234567890',
        from: 'NEW DELHI',
        to: 'MUMBAI',
        date: '15-Jan-2024',
        status: 'CNF/S1/25',
        isFlushed: false,
        lastUpdated: new Date()
      };

      vi.spyOn(IRCTCScraperService, 'performRequest').mockResolvedValue(mockResult);

      const result = await BatchProcessorService.processWithThrottling(['1234567890'], 60);

      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccessful).toBe(1);
    });
  });

  describe('filterFlushedPNRs', () => {
    it('should filter out flushed PNRs', async () => {
      const mockResults: PNRStatusResult[] = [
        {
          pnr: '1234567890',
          from: 'NEW DELHI',
          to: 'MUMBAI',
          date: '15-Jan-2024',
          status: 'CNF/S1/25',
          isFlushed: false,
          lastUpdated: new Date()
        },
        {
          pnr: '2345678901',
          from: '',
          to: '',
          date: '',
          status: 'FLUSHED',
          isFlushed: true,
          lastUpdated: new Date()
        }
      ];

      vi.spyOn(IRCTCScraperService, 'performRequest')
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await BatchProcessorService.filterFlushedPNRs(['1234567890', '2345678901']);

      expect(result.activePNRs).toEqual(['1234567890']);
      expect(result.flushedPNRs).toEqual(['2345678901']);
    });
  });
});