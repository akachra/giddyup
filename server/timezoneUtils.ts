/**
 * Timezone utility functions to ensure consistent EST handling across all importers
 */

/**
 * Convert UTC time to EST timezone
 * @param utcDate Date object in UTC
 * @returns Date object adjusted to EST
 */
export function convertToEST(utcDate: Date): Date {
  const estOffset = -5 * 60; // EST is UTC-5 (ignoring DST for simplicity)
  return new Date(utcDate.getTime() + (estOffset - utcDate.getTimezoneOffset()) * 60000);
}

/**
 * Get current date in EST timezone
 * @returns Date object representing today in EST
 */
export function getCurrentDateEST(): Date {
  const estToday = convertToEST(new Date());
  estToday.setHours(0, 0, 0, 0);
  return estToday;
}

/**
 * Check if a given date is today in EST timezone
 * @param date Date to check
 * @returns true if the date is today in EST
 */
export function isToday(date: Date): boolean {
  const estToday = getCurrentDateEST();
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === estToday.getTime();
}

/**
 * Check if a given date is before today in EST timezone
 * @param date Date to check
 * @returns true if the date is before today in EST
 */
export function isBeforeToday(date: Date): boolean {
  const estToday = getCurrentDateEST();
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() < estToday.getTime();
}