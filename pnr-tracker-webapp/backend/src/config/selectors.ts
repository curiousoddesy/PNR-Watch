/**
 * CSS Selectors Configuration
 * Migrated from check-pnr-status/defineSelectors.js
 */

// CSS selectors for extracting data from IRCTC HTML response
const csspath_from = 'body > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(3) > td > table > tbody > tr > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td.text_back_color > table > tbody > tr:nth-child(2) > td:nth-child(1) > table:nth-child(2) > tbody > tr:nth-child(3) > td:nth-child(7)';

const csspath_to = 'body > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(3) > td > table > tbody > tr > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td.text_back_color > table > tbody > tr:nth-child(2) > td:nth-child(1) > table:nth-child(2) > tbody > tr:nth-child(3) > td:nth-child(6)';

const csspath_date = 'body > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(3) > td > table > tbody > tr > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td.text_back_color > table > tbody > tr:nth-child(2) > td:nth-child(1) > table:nth-child(2) > tbody > tr:nth-child(3) > td:nth-child(3)';

const csspath_status = 'body > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(3) > td > table > tbody > tr > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td.text_back_color > table > tbody > tr:nth-child(2) > td:nth-child(1) > table:nth-child(5) > tbody > tr:nth-child(2) > td:nth-child(3)';

export const selectors = [csspath_from, csspath_to, csspath_date, csspath_status];

export const tableHeaders = ['from', 'to', 'date', 'status'];