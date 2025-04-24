import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatSizeForDisplay(sizeInMB: number) {
  if (sizeInMB < 1000) {
    return `${sizeInMB.toFixed(1)} MB`;
  }
  return `${(sizeInMB / 1024).toFixed(1)} GB`;
}

export function getFileTypeIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return 'photo';
  } else if (fileType.startsWith('video/')) {
    return 'video';
  } else if (fileType.startsWith('application/pdf') || 
             fileType.includes('document') || 
             fileType.includes('spreadsheet') ||
             fileType.includes('presentation')) {
    return 'document';
  } else {
    return 'file';
  }
}

export function getCategoryColor(category: string) {
  switch (category) {
    case 'photos':
      return 'purple';
    case 'videos':
      return 'red';
    case 'documents':
      return 'green';
    case 'apps':
      return 'blue';
    default:
      return 'gray';
  }
}

export function getStatusDisplay(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending backup';
    case 'backing_up':
      return 'Backing up...';
    case 'backed_up':
      return 'Backed up';
    default:
      return 'Unknown';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'gray';
    case 'backing_up':
      return 'yellow';
    case 'backed_up':
      return 'green';
    default:
      return 'gray';
  }
}
