/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth's radius in kilometers
  const R = 6371;
  
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
}

/**
 * Converts degrees to radians
 * @param deg Degrees
 * @returns Radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @param rad Radians
 * @returns Degrees
 */
function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * Finds the closest driver to a given location
 * @param pickupLat Pickup latitude
 * @param pickupLng Pickup longitude
 * @param drivers Array of available drivers with coordinates
 * @returns The closest driver or null if no drivers available
 */
export function findClosestDriver(
  pickupLat: number,
  pickupLng: number,
  drivers: Array<{ id: number; latitude: number; longitude: number }>
): { id: number; distance: number } | null {
  if (!drivers.length) return null;
  
  let closestDriver = null;
  let minDistance = Infinity;
  
  for (const driver of drivers) {
    const distance = calculateDistance(
      pickupLat,
      pickupLng,
      driver.latitude,
      driver.longitude
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestDriver = { id: driver.id, distance };
    }
  }
  
  return closestDriver;
}

/**
 * Estimates the trip time based on distance
 * @param distanceInKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h (default: 30)
 * @returns Estimated time in minutes
 */
export function estimateTripTime(
  distanceInKm: number,
  averageSpeedKmh: number = 30
): number {
  // Calculate time in hours and convert to minutes
  const timeInHours = distanceInKm / averageSpeedKmh;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  
  return timeInMinutes;
}

/**
 * Calculates fare based on distance
 * @param distanceInKm Distance in kilometers
 * @param baseFare Base fare amount
 * @param ratePerKm Rate per kilometer
 * @returns Total fare
 */
export function calculateFare(
  distanceInKm: number,
  baseFare: number = 5.0,
  ratePerKm: number = 1.5
): number {
  return baseFare + (distanceInKm * ratePerKm);
}

/**
 * Formats a coordinate pair for display
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted coordinate string
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
