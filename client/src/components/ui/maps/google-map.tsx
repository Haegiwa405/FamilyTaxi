import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import googleMapsLoader from "@/lib/google-maps-loader";
import { createMapIcons, DEFAULT_MAP_OPTIONS, DEFAULT_POLYLINE_OPTIONS } from "./map-icons";

// Typescript declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

type Coords = {
  lat: number;
  lng: number;
};

type Marker = {
  position: Coords;
  title?: string;
  icon?: string;
  animation?: boolean;
};

type GoogleMapProps = {
  center?: Coords;
  zoom?: number;
  markers?: Marker[];
  drawRoute?: boolean;
  origin?: Coords;
  destination?: Coords;
  waypointsList?: Coords[];
  onClick?: (e: any) => void;
  onLoad?: (map: any) => void;
  className?: string;
};

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 }; // Default to Hanoi
const DEFAULT_ZOOM = 14;

export default function GoogleMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  drawRoute = false,
  origin,
  destination,
  waypointsList = [],
  onClick,
  onLoad,
  className = "h-[50vh] w-full",
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapIcons, setMapIcons] = useState<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Initialize the map when the component mounts
  useEffect(() => {
    let isMounted = true;
    
    const setupMap = async () => {
      try {
        // Load Google Maps API
        await googleMapsLoader.load({ libraries: ["places"] });
        
        // Initialize map if still mounted
        if (isMounted) {
          initializeMap();
        }
      } catch (error) {
        console.error("Failed to load Google Maps:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    setupMap();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    // Create our custom icons
    const icons = createMapIcons();
    setMapIcons(icons);

    // Create the map
    const mapOptions = {
      ...DEFAULT_MAP_OPTIONS,
      center,
      zoom,
    };

    const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
    setMap(newMap);

    // Initialize directions services if needed
    if (drawRoute) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: DEFAULT_POLYLINE_OPTIONS,
      });
      directionsRendererRef.current.setMap(newMap);
    }

    // Add click event if provided
    if (onClick) {
      newMap.addListener("click", onClick);
    }

    if (onLoad) {
      onLoad(newMap);
    }

    setLoading(false);
  };

  // Update map center when center prop changes
  useEffect(() => {
    if (map) {
      map.setCenter(center);
    }
  }, [map, center.lat, center.lng]);

  // Update map zoom when zoom prop changes
  useEffect(() => {
    if (map) {
      map.setZoom(zoom);
    }
  }, [map, zoom]);

  // Handle markers
  useEffect(() => {
    if (!map || !mapIcons) return;

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      const { position, title, icon, animation } = markerData;
      
      let markerIcon;
      if (icon === "pickup") {
        markerIcon = mapIcons.PICKUP_ICON;
      } else if (icon === "destination") {
        markerIcon = mapIcons.DESTINATION_ICON;
      } else if (icon === "driver") {
        markerIcon = mapIcons.DRIVER_ICON;
      } else {
        markerIcon = icon;
      }
      
      const marker = new window.google.maps.Marker({
        position,
        map,
        title,
        icon: markerIcon,
        animation: animation ? window.google.maps.Animation.BOUNCE : undefined,
      });
      
      markersRef.current.push(marker);
    });
  }, [map, markers, mapIcons]);

  // Handle route drawing
  useEffect(() => {
    if (!map || !drawRoute || !directionsServiceRef.current || !directionsRendererRef.current) return;
    if (!origin || !destination) return;

    const waypoints = waypointsList.map(coords => ({
      location: coords,
      stopover: true
    }));

    directionsServiceRef.current.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === "OK" && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
        }
      }
    );
  }, [map, drawRoute, origin, destination, waypointsList]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
