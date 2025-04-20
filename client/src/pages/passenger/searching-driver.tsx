import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import PassengerLayout from "@/components/layout/passenger-layout";
import GoogleMap from "@/components/ui/maps/google-map";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trip } from "@shared/schema";
import { MapPin, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SearchingDriver() {
  const [, params] = useRoute("/passenger/searching-driver");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const tripId = searchParams.get("tripId") || "";
  
  const [progress, setProgress] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/passenger/trips/${tripId}`],
    enabled: !!tripId,
    refetchInterval: 3000, // Poll every 3 seconds to check if a driver has accepted
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
        description: "Your trip request has been cancelled",
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

  // Animate progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 1;
        return newProgress > 100 ? 0 : newProgress;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Check if trip status has changed
  useEffect(() => {
    if (trip && trip.status !== "requested" && trip.driverId) {
      // Driver has accepted the trip
      navigate(`/passenger/ride-status/${tripId}`);
    }
  }, [trip, tripId, navigate]);

  // Set a timeout for the search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (trip && trip.status === "requested") {
        toast({
          title: "No drivers available",
          description: "We couldn't find a driver at this time. Please try again later.",
        });
        cancelTripMutation.mutate(tripId);
      }
    }, 60000); // 1 minute timeout

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [tripId, trip]);

  const handleCancel = () => {
    if (tripId) {
      cancelTripMutation.mutate(tripId);
    }
  };

  if (isLoading || !trip) {
    return <PassengerLayout isLoading={true} />;
  }

  return (
    <PassengerLayout hideNavigation>
      <div className="flex flex-col h-full">
        <div className="h-[50vh] relative">
          <GoogleMap
            center={{ lat: trip.pickupLatitude, lng: trip.pickupLongitude }}
            markers={[
              {
                position: { lat: trip.pickupLatitude, lng: trip.pickupLongitude },
                title: "Pickup",
                icon: "pickup",
                animation: true
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
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">Finding you a driver</h2>
            <p className="text-neutral-500">We're looking for drivers nearby</p>
            
            <div className="w-full mt-8">
              <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <Button
              variant="outline"
              className="mt-8"
              onClick={handleCancel}
              disabled={cancelTripMutation.isPending}
            >
              {cancelTripMutation.isPending ? "Cancelling..." : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </PassengerLayout>
  );
}
