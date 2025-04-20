import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import DriverLayout from "@/components/layout/driver-layout";
import GoogleMap from "@/components/ui/maps/google-map";
import TripRouteDisplay from "@/components/trip-route-display";
import PassengerCard from "@/components/passenger-card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trip, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Clock, ArrowRight } from "lucide-react";
import { formatDistance } from "@/lib/utils";

export default function RideRequest() {
  const [, params] = useRoute("/driver/ride-request/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tripId = params?.id || "";
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [estimatedPickupTime, setEstimatedPickupTime] = useState("5 min to pickup");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  // Accept trip mutation
  const acceptTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/trips/${id}/accept`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/driver/trips/${tripId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/trips/active"] });
      navigate(`/driver/active-ride/${tripId}`);
      toast({
        title: "Trip Accepted",
        description: "You have accepted the trip",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error accepting trip",
        description: error.message,
        variant: "destructive",
      });
      navigate("/driver/home");
    },
  });

  // Decline trip mutation
  const declineTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/driver/trips/${id}/decline`, {});
      return await res.json();
    },
    onSuccess: () => {
      navigate("/driver/home");
      toast({
        title: "Trip Declined",
        description: "You have declined the trip",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error declining trip",
        description: error.message,
        variant: "destructive",
      });
      navigate("/driver/home");
    },
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location", error);
        }
      );
    }
  }, []);

  // Calculate estimated pickup time
  useEffect(() => {
    if (trip && currentLocation) {
      // In a real app, you would use the Distance Matrix API to calculate this
      setEstimatedPickupTime("5 min to pickup");
    }
  }, [trip, currentLocation]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      declineTripMutation.mutate(tripId);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, tripId, declineTripMutation]);

  const handleAccept = () => {
    if (tripId) {
      acceptTripMutation.mutate(tripId);
    }
  };

  const handleDecline = () => {
    if (tripId) {
      declineTripMutation.mutate(tripId);
    }
  };

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
        </div>
        
        <div className="bg-white flex-1 rounded-t-2xl -mt-6 relative z-10 shadow-lg p-6">
          <div className="py-4 border-b border-neutral-200">
            <h2 className="text-xl font-medium text-neutral-800">New ride request!</h2>
            {passenger && <PassengerCard passenger={passenger} />}
          </div>
          
          <div className="py-4 border-b border-neutral-200">
            <TripRouteDisplay
              pickupLocation={trip.pickupAddress}
              destinationLocation={trip.destinationAddress}
            />
          </div>
          
          <div className="pt-4">
            <div className="flex justify-between">
              <div>
                <div className="flex items-center text-sm text-neutral-600 mb-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{estimatedPickupTime}</span>
                </div>
                <div className="flex items-center text-sm text-neutral-600">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  <span>{formatDistance(trip.distance)} trip</span>
                </div>
              </div>
              <div>
                <p className="text-neutral-500">Estimated fare</p>
                <p className="text-xl font-medium text-secondary">${trip.totalFare.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Button
                variant="secondary"
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                onClick={handleDecline}
                disabled={declineTripMutation.isPending || acceptTripMutation.isPending}
              >
                Decline
              </Button>
              <Button
                variant="default"
                className="bg-secondary hover:bg-secondary-dark text-white"
                onClick={handleAccept}
                disabled={declineTripMutation.isPending || acceptTripMutation.isPending}
              >
                Accept
              </Button>
            </div>
            
            <div className="mt-4">
              <div className="w-full bg-neutral-200 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-secondary h-full transition-all"
                  style={{ width: `${(timeLeft / 15) * 100}%` }}
                />
              </div>
              <p className="text-xs text-center text-neutral-500 mt-1">
                Request expires in {timeLeft} seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}
