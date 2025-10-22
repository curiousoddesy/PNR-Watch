import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

// Format date for display
export const formatDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, 'MMM dd, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

// Format date and time for display
export const formatDateTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, 'MMM dd, yyyy hh:mm a');
  } catch (error) {
    return 'Invalid date';
  }
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
};

// Format journey date for PNR display
export const formatJourneyDate = (dateString: string): string => {
  try {
    // Handle various date formats that might come from IRCTC
    let dateObj: Date;
    
    // Try parsing as ISO string first
    if (dateString.includes('T') || dateString.includes('-')) {
      dateObj = parseISO(dateString);
    } else {
      // Handle DD/MM/YYYY or DD-MM-YYYY format
      const parts = dateString.split(/[\/\-]/);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        dateObj = new Date(dateString);
      }
    }
    
    if (!isValid(dateObj)) return dateString; // Return original if can't parse
    return format(dateObj, 'dd MMM yyyy');
  } catch (error) {
    return dateString; // Return original string if parsing fails
  }
};

// Check if a journey date is in the past
export const isJourneyDatePast = (dateString: string): boolean => {
  try {
    const dateObj = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(dateObj)) return false;
    return dateObj < new Date();
  } catch (error) {
    return false;
  }
};