/**
 * HTML Parser Service
 * Migrated from check-pnr-status/tools.js getDataFromHtml function
 */

import { JSDOM } from 'jsdom';
import { ParsedPNRData, JourneyDetails } from '../types';

export class HTMLParserService {
  private static removeExtraSpaces(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Parses HTML response from IRCTC to extract journey details
   * Migrated from tools.js getDataFromHtml function
   * @param htmlBody - The HTML response from IRCTC
   * @param selectors - CSS selectors to extract data
   * @returns Promise with parsed data
   */
  static async getDataFromHtml(
    htmlBody: string, 
    selectors: string[]
  ): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      try {
        const retObj: string[][] = new Array(selectors.length);
        
        // Create JSDOM instance with jQuery-like functionality
        const dom = new JSDOM(htmlBody);
        const document = dom.window.document;

        for (let i = 0; i < selectors.length; i++) {
          const thisSelector: string[] = [];
          const elements = document.querySelectorAll(selectors[i]);
          
          elements.forEach((element) => {
            const text = element.textContent || '';
            thisSelector.push(this.removeExtraSpaces(text));
          });
          
          retObj[i] = thisSelector;
        }

        dom.window.close();
        resolve(retObj);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Formats parsed data into structured journey details
   * Migrated from tools.js fixFormatting function
   * @param resultObj - Raw parsed data array
   * @param tableHeaders - Headers for the data columns
   * @returns Formatted journey details
   */
  static fixFormatting(
    resultObj: string[][], 
    tableHeaders: string[]
  ): JourneyDetails[] {
    const selectors = resultObj.length;
    if (selectors < 1) {
      return [];
    }

    const records = resultObj[0]?.length || 0;
    const tableObj: JourneyDetails[] = [];

    for (let i = 0; i < records; i++) {
      const thisRecord: any = {};
      for (let j = 0; j < tableHeaders.length && j < resultObj.length; j++) {
        thisRecord[tableHeaders[j]] = resultObj[j][i] || '';
      }
      tableObj.push(thisRecord as JourneyDetails);
    }

    return tableObj;
  }

  /**
   * Parses IRCTC HTML response and returns structured data
   * @param htmlBody - HTML response from IRCTC
   * @returns Parsed PNR data
   */
  static async parseIRCTCResponse(htmlBody: string): Promise<ParsedPNRData> {
    try {
      // Import selectors (will be created next)
      const { selectors, tableHeaders } = await import('../config/selectors');
      
      const rawData = await this.getDataFromHtml(htmlBody, selectors);
      const journeyDetails = this.fixFormatting(rawData, tableHeaders);
      
      // Check for flushed PNRs
      const flushedPNRs: string[] = [];
      if (htmlBody.match(/FLUSHED\sPNR/g)) {
        // This will be handled by the calling service with PNR context
      }

      return {
        journeyDetails,
        flushedPNRs,
        errors: []
      };
    } catch (error) {
      return {
        journeyDetails: [],
        flushedPNRs: [],
        errors: [error instanceof Error ? error.message : 'Unknown parsing error']
      };
    }
  }
}