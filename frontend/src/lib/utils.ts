import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date-only string (YYYY-MM-DD) in fr-FR locale.
 * Uses timeZone: 'UTC' to prevent the off-by-one-day shift that
 * occurs when new Date("YYYY-MM-DD") is parsed as UTC midnight
 * and then rendered in a timezone behind UTC (e.g. Haiti UTC-5).
 */
export function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options });
}
