import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import PassengerLayout from "@/components/layout/passenger-layout";
import GoogleMap from "@/components/ui/maps/google-map";
import TripRouteDisplay from "@/components/trip-route-display";
import DriverCard from "@/components/driver-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trip, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Phone } from "lucide-react";

export default function RideStatus() {
  const [, params] = useRoute("/passenger/ride-status/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tripId = params?.id || "";
  
  const [arrivalTime, setArrivalTime] = useState("5 min");
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/passenger/trips/${tripId}`],
    enabled: !!tripId,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Fetch driver details
  const { data: driver } = useQuery<User>({
    queryKey: [`/api/users/${trip?.driverId}`],
    enabled: !!trip?.driverId,
  });

  const cancelTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/passenger/trips/${id}/cancel`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/passenger/trips/${tripId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/passenger/trips/recent"] });
      navigate("/");
      toast({
        title: "Trip Cancelled",
        description: "Your trip has been cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Redirect to completed page if trip is completed
  useEffect(() => {
    if (trip && trip.status === "completed") {
      navigate(`/passenger/ride-completed/${tripId}`);
    }
  }, [trip, tripId, navigate]);

  // Check for driver location updates
  useEffect(() => {
    if (driver && driver.currentLatitude && driver.currentLongitude) {
      setDriverLocation({
        lat: driver.currentLatitude,
        lng: driver.currentLongitude,
      });
    }
  }, [driver]);

  // Update arrival time estimate
  useEffect(() => {
    if (trip && driver) {
      // Simulate a decreasing arrival time as trip progresses
      if (trip.status === "accepted") {
        setArrivalTime("5 min");
      } else if (trip.status === "in_progress") {
        setArrivalTime("2 min to destination");
      }
    }
  }, [trip, driver]);

  const handleCancel = () => {
    if (tripId) {
      cancelTripMutation.mutate(tripId);
    }
  };

  const handleContactDriver = () => {
    if (driver && driver.phone) {
      window.location.href = `tel:${driver.phone}`;
    } else {
      toast({
        title: "Cannot contact driver",
        description: "Driver contact information is not available",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !trip) {
    return <PassengerLayout isLoading={true} />;
  }

  // If no driver yet, redirect to searching page
  if (!trip.driverId) {
    navigate(`/passenger/searching-driver?tripId=${tripId}`);
    return null;
  }

  return (
    <PassengerLayout hideNavigation>
      <div className="flex flex-col h-full">
        <div className="h-[50vh] relative">
          <GoogleMap
            drawRoute={true}
            origin={
              trip.status === "accepted" 
                ? driverLocation || { lat: trip.pickupLatitude, lng: trip.pickupLongitude }
                : { lat: trip.pickupLatitude, lng: trip.pickupLongitude }
            }
            destination={
              trip.status === "accepted"
                ? { lat: trip.pickupLatitude, lng: trip.pickupLongitude }
                : { lat: trip.destinationLatitude, lng: trip.destinationLongitude }
            }
            markers={[
              {
                position: { lat: trip.pickupLatitude, lng: trip.pickupLongitude },
                title: "Pickup",
                icon: "pickup"
              },
              {
                position: { lat: trip.destinationLatitude, lng: trip.destinationLongitude },
                title: "Destination",
                icon: "destination"
              },
              ...(driverLocation ? [{
                position: driverLocation,
                title: "Driver",
                icon: "driver"
              }] : [])
            ]}
            className="w-full h-full"
          />
        </div>
        
        <div className="bg-white flex-1 rounded-t-2xl -mt-6 relative z-10 shadow-lg">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Badge variant="outline" className="bg-green-500 text-white border-0">
                  {trip.status === "accepted" ? "Driver on the way" : "Trip in progress"}
                </Badge>
                <span className="ml-2 text-sm text-neutral-500">{arrivalTime}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleContactDriver}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {driver && (
            <div className="p-4 border-b border-neutral-200">
              <DriverCard driver={driver} />
            </div>
          )}

          <div className="p-4">
            <TripRouteDisplay
              pickupLocation={trip.pickupAddress}
              destinationLocation={trip.destinationAddress}
              highlightPickup={trip.status === "accepted"}
              highlightDestination={trip.status === "in_progress"}
            />
            
            <div className="mt-6 flex justify-between border-t border-neutral-200 pt-4">
              <div>
                <p className="text-neutral-500">Estimated fare</p>
                <p className="text-xl font-medium">${trip.totalFare.toFixed(2)}</p>
              </div>
              {trip.status === "accepted" && (
                <Button
                  variant="outline"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={cancelTripMutation.isPending}
                >
                  {cancelTripMutation.isPending ? "Cancelling..." : "Cancel"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PassengerLayout>
  );
}
