/**
 * PNR Validation Service
 * Migrated from check-pnr-status/tools.js validatePnr function
 */

export class PNRValidatorService {
  /**
   * Validates PNR format - must be exactly 10 digits
   * @param pnr - The PNR string to validate
   * @returns true if valid, throws error if invalid
   */
  static validatePnr(pnr: string): boolean {
    if (!pnr || typeof pnr !== 'string') {
      throw new Error('Invalid PNR: PNR must be a string');
    }

    if (pnr.length !== 10) {
      throw new Error('Invalid PNR: PNR must be exactly 10 digits');
    }

    // Check if all characters are digits
    for (let i = 0; i < pnr.length; i++) {
      const char = pnr[i];
      if (char < '0' || char > '9') {
        throw new Error('Invalid PNR: PNR must contain only digits');
      }
    }

    return true;
  }

  /**
   * Checks if PNR format is valid without throwing errors
   * @param pnr - The PNR string to validate
   * @returns true if valid, false if invalid
   */
  static isValidPnr(pnr: string): boolean {
    try {
      return this.validatePnr(pnr);
    } catch {
      return false;
    }
  }
}