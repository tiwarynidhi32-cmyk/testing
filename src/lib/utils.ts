import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

export function getAppointmentTimestamp(dateVal: any, timeVal: any): number {
  let dateStr = '';
  if (dateVal) {
    if (typeof dateVal === 'string') {
      dateStr = dateVal.split('T')[0];
    } else if (dateVal instanceof Date) {
      dateStr = dateVal.toISOString().split('T')[0];
    } else {
      dateStr = new Date(dateVal).toISOString().split('T')[0];
    }
  } else {
    dateStr = '1970-01-01';
  }

  let timeStr = typeof timeVal === 'string' ? timeVal : '12:00 AM';
  let hours = 12;
  let minutes = 0;

  // Attempt to parse standard 12-hour AM/PM format (e.g. "10:30 AM")
  const match12h = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12h) {
    hours = parseInt(match12h[1], 10);
    minutes = parseInt(match12h[2], 10);
    const ampm = match12h[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  } else {
    // Attempt to parse 24-hour format (e.g. "14:30")
    const match24h = timeStr.match(/(\d+):(\d+)/);
    if (match24h) {
      hours = parseInt(match24h[1], 10);
      minutes = parseInt(match24h[2], 10);
    }
  }

  const dt = new Date(dateStr);
  dt.setHours(hours, minutes, 0, 0);
  return dt.getTime();
}

