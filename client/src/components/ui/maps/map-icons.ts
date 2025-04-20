// This file defines reusable map icons to be used with Google Maps

declare global {
  interface Window {
    google: any;
  }
}

// Function to create map icons after Google Maps API is loaded
export const createMapIcons = () => {
  if (!window.google || !window.google.maps) {
    console.error("Google Maps API not loaded when trying to create map icons");
    return null;
  }

  return {
    PICKUP_ICON: {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: "#0077B6",
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#FFFFFF",
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 24),
    },

    DESTINATION_ICON: {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: "#FF6B00",
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#FFFFFF",
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 24),
    },

    DRIVER_ICON: {
      path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
      fillColor: "#0077B6",
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#FFFFFF",
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 12),
    }
  };
};

// Predefined map styles
export const DEFAULT_MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

export const DEFAULT_POLYLINE_OPTIONS = {
  strokeColor: "#0077B6",
  strokeWeight: 5,
  strokeOpacity: 0.7,
};