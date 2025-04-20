// A utility for loading the Google Maps API in a controlled way

type GoogleMapsLoaderOptions = {
  apiKey?: string;
  libraries?: string[];
  callback?: string;
};

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadPromise: Promise<void> | null = null;
  private defaultOptions: GoogleMapsLoaderOptions = {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBwWILNRbEoL8T-Meav_SOpkRNdAS_yv6I",
    libraries: ["places"],
  };

  private constructor() {}

  public static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  public load(options: GoogleMapsLoaderOptions = {}): Promise<void> {
    // If the API is already loaded, resolve immediately
    if (window.google && window.google.maps) {
      return Promise.resolve();
    }

    // If we're already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Merge default options with provided options
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Create and return a new promise for loading the API
    this.loadPromise = new Promise<void>((resolve, reject) => {
      try {
        // Create a unique callback name for this load request
        const callbackName = `googleMapsInitialize${Date.now()}`;
        
        // Set up the callback function
        window[callbackName] = () => {
          // Clean up the global callback
          delete window[callbackName];
          resolve();
        };

        // Create the script element
        const script = document.createElement("script");
        
        // Construct the API URL with parameters
        let url = `https://maps.googleapis.com/maps/api/js?key=${mergedOptions.apiKey}`;
        
        if (mergedOptions.libraries && mergedOptions.libraries.length > 0) {
          url += `&libraries=${mergedOptions.libraries.join(",")}`;
        }
        
        // Add the callback
        url += `&callback=${callbackName}`;
        
        script.src = url;
        script.async = true;
        script.defer = true;
        
        // Handle script load errors
        script.onerror = () => {
          delete window[callbackName];
          this.loadPromise = null;
          reject(new Error("Failed to load Google Maps API"));
        };
        
        // Add the script to the document
        document.head.appendChild(script);
      } catch (error) {
        this.loadPromise = null;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  // Check if the API is loaded
  public isLoaded(): boolean {
    return !!(window.google && window.google.maps);
  }
}

// Extend the Window interface to include google
declare global {
  interface Window {
    google: any;
    // Allow for dynamic callback properties
    [key: string]: any;
  }
}

export default GoogleMapsLoader.getInstance();