import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  return `${distance.toFixed(1)} km`;
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString();
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

export function getRandomCoordinateNearby(
  latitude: number,
  longitude: number,
  radiusInKm: number = 1
): { lat: number; lng: number } {
  // Earth's radius in km
  const earthRadius = 6371;
  
  // Convert radius from km to radians
  const radiusInRad = radiusInKm / earthRadius;
  
  // Random distance within the radius
  const randomDistance = Math.random() * radiusInRad;
  
  // Random angle
  const randomAngle = Math.random() * Math.PI * 2;
  
  // Calculate new coordinates
  const newLatitude = Math.asin(
    Math.sin(degreesToRadians(latitude)) * Math.cos(randomDistance) +
    Math.cos(degreesToRadians(latitude)) * Math.sin(randomDistance) * Math.cos(randomAngle)
  );
  
  const newLongitude = degreesToRadians(longitude) +
    Math.atan2(
      Math.sin(randomAngle) * Math.sin(randomDistance) * Math.cos(degreesToRadians(latitude)),
      Math.cos(randomDistance) - Math.sin(degreesToRadians(latitude)) * Math.sin(newLatitude)
    );
  
  return {
    lat: radiansToDegrees(newLatitude),
    lng: radiansToDegrees(newLongitude)
  };
}

function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}
