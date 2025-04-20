import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import PassengerLayout from "@/components/layout/passenger-layout";
import GoogleMap from "@/components/ui/maps/google-map";
import TripRouteDisplay from "@/components/trip-route-display";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trip } from "@shared/schema";
import { formatDistance, formatTime } from "@/lib/utils";
import { Car, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RouteConfirmation() {
  const [, params] = useRoute("/passenger/confirm-route");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const tripId = searchParams.get("tripId") || "";

  const [estimatedTime, setEstimatedTime] = useState("15-20 min");

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/passenger/trips/${tripId}`],
    enabled: !!tripId,
  });

  const requestRideMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/passenger/trips/${id}/request`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/passenger/trips/${tripId}`] });
      navigate(`/passenger/searching-driver?tripId=${tripId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error requesting ride",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditLocations = () => {
    navigate(`/passenger/select-location?tripId=${tripId}`);
  };

  const handleRequestRide = () => {
    if (tripId) {
      requestRideMutation.mutate(tripId);
    }
  };

  // Calculate estimated time based on distance
  useEffect(() => {
    if (trip) {
      // Assuming average speed of 30 km/h
      const estimatedMinutes = Math.round((trip.distance / 30) * 60);
      if (estimatedMinutes < 10) {
        setEstimatedTime(`5-10 min`);
      } else if (estimatedMinutes < 20) {
        setEstimatedTime(`15-20 min`);
      } else if (estimatedMinutes < 30) {
        setEstimatedTime(`20-30 min`);
      } else {
        setEstimatedTime(`${Math.floor(estimatedMinutes / 10) * 10}-${Math.ceil(estimatedMinutes / 10) * 10} min`);
      }
    }
  }, [trip]);

  if (isLoading || !trip) {
    return <PassengerLayout isLoading={true} />;
  }

  return (
    <PassengerLayout hideNavigation>
      <div className="flex flex-col h-full">
        <div className="h-[50vh] relative">
          <GoogleMap
            drawRoute={true}
            origin={{ lat: trip.pickupLatitude, lng: trip.pickupLongitude }}
            destination={{ lat: trip.destinationLatitude, lng: trip.destinationLongitude }}
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
              }
            ]}
            center={{ lat: trip.pickupLatitude, lng: trip.pickupLongitude }}
            className="w-full h-full"
          />
        </div>
        
        <div className="bg-white flex-1 rounded-t-2xl -mt-6 relative z-10 shadow-lg p-6">
          <div className="pb-4 border-b border-neutral-200">
            <h2 className="text-xl font-medium text-neutral-800">Confirm your trip</h2>
            
            <TripRouteDisplay
              pickupLocation={trip.pickupAddress}
              destinationLocation={trip.destinationAddress}
              onEdit={handleEditLocations}
            />
          </div>
          
          <div className="py-4 border-b border-neutral-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Standard Taxi</p>
                <p className="text-sm text-neutral-500">Up to 4 passengers</p>
              </div>
              <span className="font-medium">${trip.totalFare.toFixed(2)}</span>
            </div>
            
            <div className="mt-2 text-sm text-neutral-500 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{estimatedTime}</span>
              <span className="mx-2">•</span>
              <span>{formatDistance(trip.distance)}</span>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              className="w-full"
              onClick={handleRequestRide}
              disabled={requestRideMutation.isPending}
            >
              {requestRideMutation.isPending ? "Processing..." : "Request Ride"}
            </Button>
          </div>
        </div>
      </div>
    </PassengerLayout>
  );
}
