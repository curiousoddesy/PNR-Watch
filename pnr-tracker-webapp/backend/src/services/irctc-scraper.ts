/**
 * IRCTC Scraper Service
 * Migrated from check-pnr-status/checkPnrStatus.js performRequest function
 */

import request from 'request';
import { HTMLParserService } from './html-parser';
import { PNRValidatorService } from './pnr-validator';
import { PNRStatusResult, ParsedPNRData } from '../types';
import { logger } from './logger';
import { errorAlerting, AlertType } from './error-alerting';
import { ExternalServiceError } from '../middleware/error-handler';

export class IRCTCScraperService {
  private static readonly REQUEST_URL = 'http://www.indianrail.gov.in/cgi_bin/inet_pnstat_cgi_10521.cgi';
  
  private static readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:19.0) Gecko/20100101 Firefox/19.0',
    'Host': 'www.indianrail.gov.in',
    'Origin': 'http://www.indianrail.gov.in',
    'Referer': 'http://www.indianrail.gov.in/pnr_Enq.html'
  };

  /**
   * Performs HTTP request to IRCTC to get PNR status
   * Migrated from checkPnrStatus.js performRequest function
   * @param pnr - The PNR number to check
   * @param verboseOutput - Whether to log verbose output
   * @returns Promise with PNR status result
   */
  static async performRequest(
    pnr: string, 
    verboseOutput: boolean = false
  ): Promise<PNRStatusResult> {
    return new Promise((resolve, reject) => {
      try {
        // Validate PNR format first
        PNRValidatorService.validatePnr(pnr);

        if (verboseOutput) {
          console.log('Processing PNR', pnr);
          console.log('Performing request!');
          console.log(new Date().toISOString());
        }

        // Generate random captcha value (as in original)
        const randomDigit = Math.floor(Math.random() * 89999) + 10000;

        const formData = {
          'lccp_cap_val': randomDigit.toString(),
          'lccp_capinp_val': randomDigit.toString(),
          'lccp_pnrno1': pnr,
          'submit': 'Get Status'
        };

        const options = {
          method: 'POST' as const,
          url: this.REQUEST_URL,
          form: formData,
          headers: this.HEADERS,
          timeout: 30000 // 30 second timeout
        };

        request(options, async (error: any, response: any, body: string) => {
          if (error) {
            logger.logExternalAPI('IRCTC request failed', {
              pnr,
              error: error.message,
              code: error.code
            });
            
            // Alert on repeated IRCTC failures
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
              await errorAlerting.sendMediumAlert(
                AlertType.EXTERNAL_SERVICE_DOWN,
                'IRCTC Service Unavailable',
                `Failed to connect to IRCTC service: ${error.message}`,
                { pnr, errorCode: error.code }
              );
            }
            
            resolve({
              pnr,
              from: '',
              to: '',
              date: '',
              status: 'Error',
              isFlushed: false,
              lastUpdated: new Date(),
              error: error.message
            });
            return;
          }

          if (response.statusCode !== 200) {
            logger.logExternalAPI('IRCTC returned non-200 status', {
              pnr,
              statusCode: response.statusCode,
              statusMessage: response.statusMessage
            });
            
            // Alert on server errors from IRCTC
            if (response.statusCode >= 500) {
              await errorAlerting.sendMediumAlert(
                AlertType.EXTERNAL_SERVICE_DOWN,
                'IRCTC Server Error',
                `IRCTC returned server error: ${response.statusCode}`,
                { pnr, statusCode: response.statusCode }
              );
            }
            
            resolve({
              pnr,
              from: '',
              to: '',
              date: '',
              status: 'Error',
              isFlushed: false,
              lastUpdated: new Date(),
              error: `HTTP ${response.statusCode}`
            });
            return;
          }

          if (verboseOutput) {
            console.log(`Received ${body.length} bytes from server.`);
            console.log('Request completed successfully!');
            console.log(new Date().toISOString());
          }
          
          logger.logExternalAPI('IRCTC request successful', {
            pnr,
            responseSize: body.length
          });

          try {
            // Check for flushed PNR
            const isFlushed = /FLUSHED\sPNR/g.test(body);

            // Parse HTML response
            const parsedData = await HTMLParserService.parseIRCTCResponse(body);
            
            if (parsedData.errors.length > 0) {
              resolve({
                pnr,
                from: '',
                to: '',
                date: '',
                status: 'Parse Error',
                isFlushed,
                lastUpdated: new Date(),
                error: parsedData.errors.join(', ')
              });
              return;
            }

            // Extract first journey detail (most common case)
            const journey = parsedData.journeyDetails[0];
            
            resolve({
              pnr,
              from: journey?.from || '',
              to: journey?.to || '',
              date: journey?.date || '',
              status: journey?.status || (isFlushed ? 'FLUSHED' : 'Unknown'),
              isFlushed,
              lastUpdated: new Date()
            });

          } catch (parseError) {
            resolve({
              pnr,
              from: '',
              to: '',
              date: '',
              status: 'Parse Error',
              isFlushed: false,
              lastUpdated: new Date(),
              error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
            });
          }
        });

      } catch (validationError) {
        resolve({
          pnr,
          from: '',
          to: '',
          date: '',
          status: 'Invalid PNR',
          isFlushed: false,
          lastUpdated: new Date(),
          error: validationError instanceof Error ? validationError.message : 'Invalid PNR format'
        });
      }
    });
  }

  /**
   * Checks multiple PNRs sequentially with rate limiting
   * Migrated from checkAllPnrStatus.js functionality
   * @param pnrs - Array of PNR numbers to check
   * @param verboseOutput - Whether to log verbose output
   * @returns Promise with array of PNR status results
   */
  static async checkMultiplePNRs(
    pnrs: string[], 
    verboseOutput: boolean = false
  ): Promise<PNRStatusResult[]> {
    const results: PNRStatusResult[] = [];
    
    for (let i = 0; i < pnrs.length; i++) {
      const pnr = pnrs[i];
      
      if (verboseOutput) {
        console.log(`Processing PNR ${pnr} (${i + 1} of ${pnrs.length})`);
      }

      try {
        const result = await this.performRequest(pnr, verboseOutput);
        results.push(result);
        
        // Add delay between requests to avoid rate limiting (1 second)
        if (i < pnrs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        results.push({
          pnr,
          from: '',
          to: '',
          date: '',
          status: 'Error',
          isFlushed: false,
          lastUpdated: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Validates PNR format
   * @param pnr - PNR to validate
   * @returns true if valid, false if invalid
   */
  static validatePNR(pnr: string): boolean {
    return PNRValidatorService.isValidPnr(pnr);
  }
}