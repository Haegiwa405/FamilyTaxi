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

export default function TripInProgress() {
  const [, params] = useRoute("/driver/trip-in-progress/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tripId = params?.id || "";
  
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [arrivalTime, setArrivalTime] = useState("calculating...");
  const [isNearDestination, setIsNearDestination] = useState(false);

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

  // Complete trip mutation
  const completeTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/trips/${id}/complete`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver/trips/${tripId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/trips/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/stats/today"] });
      navigate(`/driver/trip-completed/${tripId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error completing trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Watch current location
  useEffect(() => {
    if (navigator.geolocation && trip) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Update arrival time estimate
          // In a real app, you would use the Distance Matrix API here
          const distance = calculateDistance(
            newLocation.lat,
            newLocation.lng,
            trip.destinationLatitude,
            trip.destinationLongitude
          );
          
          // Update arrival time based on distance
          if (distance < 1) {
            setArrivalTime("1 min to destination");
            setIsNearDestination(true);
          } else if (distance < 2) {
            setArrivalTime("2 min to destination");
          } else if (distance < 5) {
            setArrivalTime("5 min to destination");
          } else {
            setArrivalTime(`${Math.round(distance * 2)} min to destination`);
          }
        },
        (error) => {
          console.error("Error watching location", error);
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [trip]);

  const handleCompleteTrip = () => {
    if (tripId) {
      completeTripMutation.mutate(tripId);
    }
  };

  const handleNavigate = () => {
    if (trip) {
      // Open Google Maps app for navigation to destination
      const url = `https://www.google.com/maps/dir/?api=1&destination=${trip.destinationLatitude},${trip.destinationLongitude}&travelmode=driving`;
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

  // Helper function to calculate distance between two points
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
            destination={{ lat: trip.destinationLatitude, lng: trip.destinationLongitude }}
            markers={[
              ...(currentLocation ? [{
                position: currentLocation,
                title: "Your location",
                icon: "driver"
              }] : []),
              {
                position: { lat: trip.destinationLatitude, lng: trip.destinationLongitude },
                title: "Destination",
                icon: "destination"
              }
            ]}
            className="w-full h-full"
          />
          
          <Button
            className="absolute bottom-4 right-4 bg-primary hover:bg-primary-dark"
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
                <Badge variant="outline" className="bg-primary text-white border-0">
                  Trip in progress
                </Badge>
                <span className="ml-2 text-sm text-neutral-500">{arrivalTime}</span>
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
              highlightPickup={false}
              highlightDestination={true}
              grayoutPickup={true}
            />
            
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-neutral-500">Trip fare</p>
                  <p className="text-xl font-medium text-primary">${trip.totalFare.toFixed(2)}</p>
                </div>
                <Button
                  className="bg-primary hover:bg-primary-dark"
                  onClick={handleCompleteTrip}
                  disabled={completeTripMutation.isPending || !isNearDestination}
                >
                  {completeTripMutation.isPending ? "Processing..." : "Complete Trip"}
                </Button>
              </div>
              {!isNearDestination && (
                <p className="text-xs text-center text-neutral-500 mt-2">
                  You need to be closer to the destination to complete the trip
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}
