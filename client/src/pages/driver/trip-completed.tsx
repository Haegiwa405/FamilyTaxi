import { useRoute, useLocation } from "wouter";
import DriverLayout from "@/components/layout/driver-layout";
import TripRouteDisplay from "@/components/trip-route-display";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { CheckCircle } from "lucide-react";

export default function TripCompleted() {
  const [, params] = useRoute("/driver/trip-completed/:id");
  const [, navigate] = useLocation();
  const tripId = params?.id || "";

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/driver/trips/${tripId}`],
    enabled: !!tripId,
  });

  const handleContinue = () => {
    navigate("/driver/home");
  };

  if (isLoading || !trip) {
    return <DriverLayout isLoading={true} />;
  }

  // Calculate driver earnings (80% of total fare)
  const driverEarnings = trip.totalFare * 0.8;

  return (
    <DriverLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">Trip completed</h2>
            <p className="text-neutral-500">Passenger has been dropped off successfully!</p>
            
            <div className="mt-8 border border-neutral-200 rounded-md p-4">
              <TripRouteDisplay
                pickupLocation={trip.pickupAddress}
                destinationLocation={trip.destinationAddress}
              />
            </div>
            
            <div className="mt-6 border-t border-neutral-200 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-600">Base fare</span>
                <span className="font-medium">${trip.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-600">Distance ({trip.distance.toFixed(1)} km)</span>
                <span className="font-medium">${(trip.perKmRate * trip.distance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-neutral-200 pt-2 mt-2">
                <span className="text-lg font-medium">Your earnings</span>
                <span className="text-lg font-medium text-secondary">${driverEarnings.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                variant="secondary"
                className="w-full bg-secondary hover:bg-secondary-dark text-white"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}
