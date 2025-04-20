import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import DriverLayout from "@/components/layout/driver-layout";
import GoogleMap from "@/components/ui/maps/google-map";
import TripRouteDisplay from "@/components/trip-route-display";
import PassengerCard from "@/components/passenger-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trip, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Navigation, Phone } from "lucide-react";

export default function ActiveRide() {
  const [, params] = useRoute("/driver/active-ride/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tripId = params?.id || "";
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasArrived, setHasArrived] = useState(false);

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/driver/trips/${tripId}`],
    enabled: !!tripId,
  });

  // Fetch passenger details
  const { data: passenger } = useQuery<User>({
    queryKey: [`/api/users/${trip?.passengerId}`],
    enabled: !!trip?.passengerId,
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Check if driver is close to pickup location
          if (trip) {
            const distance = calculateDistance(
              newLocation.lat,
              newLocation.lng,
              trip.pickupLatitude,
              trip.pickupLongitude
            );
            
            // If within 100 meters of pickup
            if (distance < 0.1) {
              setHasArrived(true);
            }
          }
        },
        (error) => {
          console.error("Error watching location", error);
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [trip]);

  // Update trip status mutations
  const arrivedMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/trips/${id}/arrived`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver/trips/${tripId}`] });
      toast({
        title: "Arrival Confirmed",
        description: "You have arrived at the pickup location",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/trips/${id}/start`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver/trips/${tripId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/trips/active"] });
      navigate(`/driver/trip-in-progress/${tripId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error starting trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleArrived = () => {
    if (tripId) {
      arrivedMutation.mutate(tripId);
      setHasArrived(true);
    }
  };

  const handleStartTrip = () => {
    if (tripId) {
      startTripMutation.mutate(tripId);
    }
  };

  const handleNavigate = () => {
    if (trip) {
      // Open Google Maps app for navigation
      const url = `https://www.google.com/maps/dir/?api=1&destination=${trip.pickupLatitude},${trip.pickupLongitude}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const handleContactPassenger = () => {
    if (passenger && passenger.phone) {
      window.location.href = `tel:${passenger.phone}`;
    } else {
      toast({
        title: "Cannot contact passenger",
        description: "Passenger contact information is not available",
        variant: "destructive",
      });
    }
  };

  // Helper function to calculate distance between two points using Haversine formula
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  if (isLoading || !trip) {
    return <DriverLayout isLoading={true} />;
  }

  return (
    <DriverLayout hideNavigation>
      <div className="flex flex-col h-full">
        <div className="h-[50vh] relative">
          <GoogleMap
            drawRoute={true}
            origin={currentLocation || { lat: trip.pickupLatitude, lng: trip.pickupLongitude }}
            destination={{ lat: trip.pickupLatitude, lng: trip.pickupLongitude }}
            markers={[
              ...(currentLocation ? [{
                position: currentLocation,
                title: "Your location",
                icon: "driver"
              }] : []),
              {
                position: { lat: trip.pickupLatitude, lng: trip.pickupLongitude },
                title: "Pickup",
                icon: "pickup"
              },
              {
                position: { lat: trip.destinationLatitude, lng: trip.destinationLongitude },
                title: "Destination",
                icon: "destination"
              }
            ]}
            className="w-full h-full"
          />
          
          <Button
            className="absolute bottom-4 right-4 bg-secondary hover:bg-secondary-dark"
            size="icon"
            onClick={handleNavigate}
          >
            <Navigation className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="bg-white flex-1 rounded-t-2xl -mt-6 relative z-10 shadow-lg">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Badge variant="outline" className="bg-secondary text-white border-0" id="ride-status-badge">
                  {hasArrived ? "Arrived at pickup" : "Heading to pickup"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleContactPassenger}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {passenger && (
            <div className="p-4 border-b border-neutral-200">
              <PassengerCard passenger={passenger} />
            </div>
          )}

          <div className="p-4">
            <TripRouteDisplay
              pickupLocation={trip.pickupAddress}
              destinationLocation={trip.destinationAddress}
              highlightPickup={true}
            />
            
            <div className="mt-6 flex justify-between items-center">
              <div>
                <p className="text-neutral-500">Estimated fare</p>
                <p className="text-xl font-medium text-secondary">${trip.totalFare.toFixed(2)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={hasArrived ? "secondary" : "default"}
                  className={`px-4 py-2 ${hasArrived ? 'bg-neutral-200 text-neutral-400' : 'bg-secondary text-white'}`}
                  onClick={handleArrived}
                  disabled={hasArrived || arrivedMutation.isPending}
                >
                  Arrived
                </Button>
                <Button
                  variant={hasArrived ? "default" : "secondary"}
                  className={`px-4 py-2 ${!hasArrived ? 'bg-neutral-200 text-neutral-400' : 'bg-primary text-white'}`}
                  onClick={handleStartTrip}
                  disabled={!hasArrived || startTripMutation.isPending}
                >
                  Start Trip
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}
