import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import PassengerLayout from "@/components/layout/passenger-layout";
import LocationInput from "@/components/location-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Briefcase, Home, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface LocationCoordinates {
  address: string;
  latitude: number;
  longitude: number;
}

export default function LocationSelection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, updateLocationMutation } = useAuth();
  const [pickup, setPickup] = useState<LocationCoordinates | null>(null);
  const [destination, setDestination] = useState<LocationCoordinates | null>(null);

  // Fetch saved locations
  const { data: savedLocations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Store trip data in session storage mutation
  const createTripMutation = useMutation({
    mutationFn: async (tripData: {
      passengerId: number;
      pickupAddress: string;
      pickupLatitude: number;
      pickupLongitude: number;
      destinationAddress: string;
      destinationLatitude: number;
      destinationLongitude: number;
      distance: number;
      baseFare: number;
      perKmRate: number;
      totalFare: number;
    }) => {
      const res = await apiRequest("POST", "/api/passenger/trips", tripData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/passenger/trips/recent"] });
      navigate(`/passenger/confirm-route?tripId=${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Get address from coordinates
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBwWILNRbEoL8T-Meav_SOpkRNdAS_yv6I"}`
            );
            const data = await response.json();
            if (data.results?.[0]) {
              const address = data.results[0].formatted_address;
              setPickup({
                address,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            }

            // Update user's current location
            if (user) {
              updateLocationMutation.mutate({
                latitude: position.coords.latitude, 
                longitude: position.coords.longitude
              });
            }
          } catch (error) {
            console.error("Error getting address from coordinates", error);
          }
        },
        (error) => {
          console.error("Error getting location", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please enter it manually.",
            variant: "destructive",
          });
        }
      );
    }
  }, [updateLocationMutation, user, toast]);

  const handleBackClick = () => {
    navigate("/");
  };

  const handleContinue = async () => {
    if (!pickup || !destination || !user) {
      toast({
        title: "Missing Information",
        description: "Please provide both pickup and destination locations.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate distance between pickup and destination
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickup.latitude},${pickup.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBwWILNRbEoL8T-Meav_SOpkRNdAS_yv6I"}`
      );
      const data = await response.json();
      
      // Calculate fare
      const distanceInKm = data.rows?.[0]?.elements?.[0]?.distance?.value / 1000 || 5;
      const baseFare = 5.0;
      const perKmRate = 1.5;
      const totalFare = baseFare + perKmRate * distanceInKm;

      // Create trip
      createTripMutation.mutate({
        passengerId: user.id,
        pickupAddress: pickup.address,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        destinationAddress: destination.address,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        distance: distanceInKm,
        baseFare,
        perKmRate,
        totalFare,
      });

    } catch (error) {
      console.error("Error calculating distance", error);
      toast({
        title: "Error",
        description: "Unable to calculate trip distance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Get address from coordinates
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBwWILNRbEoL8T-Meav_SOpkRNdAS_yv6I"}`
            );
            const data = await response.json();
            if (data.results?.[0]) {
              const address = data.results[0].formatted_address;
              setPickup({
                address,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            }
          } catch (error) {
            console.error("Error getting address from coordinates", error);
          }
        },
        (error) => {
          console.error("Error getting location", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please try again.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const applyLocation = (location: Location, type: 'pickup' | 'destination') => {
    const locationData = {
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    if (type === 'pickup') {
      setPickup(locationData);
    } else {
      setDestination(locationData);
    }
  };

  return (
    <PassengerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackClick}
                className="mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-medium text-neutral-800">Set your pickup location</h2>
            </div>
            
            <div className="space-y-4">
              <LocationInput
                label="Pickup Location"
                placeholder="Enter pickup location"
                value={pickup?.address || ""}
                onChange={(location) => {
                  if (location) {
                    setPickup({
                      address: location.address,
                      latitude: location.latitude,
                      longitude: location.longitude,
                    });
                  } else {
                    setPickup(null);
                  }
                }}
                actionIcon={
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={useCurrentLocation}
                    className="text-primary"
                  >
                    GPS
                  </Button>
                }
              />
              
              <LocationInput
                label="Destination"
                placeholder="Enter destination"
                value={destination?.address || ""}
                onChange={(location) => {
                  if (location) {
                    setDestination({
                      address: location.address,
                      latitude: location.latitude,
                      longitude: location.longitude,
                    });
                  } else {
                    setDestination(null);
                  }
                }}
              />
              
              <Button 
                className="w-full"
                onClick={handleContinue}
                disabled={!pickup || !destination || createTripMutation.isPending}
              >
                Continue
              </Button>
            </div>
          </CardContent>
          
          {savedLocations.length > 0 && (
            <div className="border-t border-neutral-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-neutral-800">Saved Locations</h3>
                
                <div className="mt-4 space-y-2">
                  {savedLocations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center p-3 hover:bg-neutral-50 rounded-md cursor-pointer transition-colors"
                      onClick={() => applyLocation(location, destination ? 'pickup' : 'destination')}
                    >
                      <div className="p-2 bg-neutral-100 rounded-full mr-4">
                        {location.name.toLowerCase().includes('home') ? (
                          <Home className="h-5 w-5 text-neutral-600" />
                        ) : location.name.toLowerCase().includes('work') ? (
                          <Briefcase className="h-5 w-5 text-neutral-600" />
                        ) : (
                          <MapPin className="h-5 w-5 text-neutral-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-neutral-500">{location.address}</p>
                      </div>
                    </div>
                  ))}

                  <Button variant="ghost" className="w-full flex items-center justify-center mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Location
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PassengerLayout>
  );
}
