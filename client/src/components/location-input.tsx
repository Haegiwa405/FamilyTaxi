import { useState, useEffect, useRef, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import googleMapsLoader from "@/lib/google-maps-loader";

type LocationData = {
  address: string;
  placeId?: string;
  latitude: number;
  longitude: number;
};

type LocationInputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (location: LocationData | null) => void;
  actionIcon?: ReactNode;
};

export default function LocationInput({
  label,
  placeholder = "Enter location",
  value,
  onChange,
  actionIcon,
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const setupAutocomplete = async () => {
      try {
        // Load Google Maps API with places library
        await googleMapsLoader.load({ libraries: ["places"] });
        
        if (isMounted) {
          initializeAutocomplete();
        }
      } catch (error) {
        console.error("Failed to load Google Maps API:", error);
      }
    };
    
    setupAutocomplete();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      console.error("Google Maps Places API not available");
      return;
    }

    // Initialize Google Places Autocomplete
    const autoComplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
    });

    autoComplete.addListener("place_changed", () => {
      const place = autoComplete.getPlace();
      
      if (!place.geometry) {
        // User entered the name of a place that was not suggested
        onChange(null);
        return;
      }

      const location: LocationData = {
        address: place.formatted_address || "",
        placeId: place.place_id,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      };

      onChange(location);
    });

    setAutocomplete(autoComplete);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When the user types, pass null to indicate location is being modified
    if (e.target.value !== value) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>{label}</Label>}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-neutral-400" />
        </div>
        <Input
          id={label?.toLowerCase().replace(/\s/g, '-')}
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className="pl-10 pr-12"
        />
        {actionIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {actionIcon}
          </div>
        )}
      </div>
    </div>
  );
}
