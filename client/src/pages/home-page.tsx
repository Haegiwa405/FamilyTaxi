import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import PassengerLayout from "@/components/layout/passenger-layout";
import DriverLayout from "@/components/layout/driver-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { formatDistance, formatRelativeTime } from "@/lib/utils";
import { PlusCircle, Clock, MapPin, ChevronRight } from "lucide-react";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect based on role if user is logged in
    if (user) {
      if (user.role === "driver") {
        navigate("/driver/home");
      } else if (user.role === "admin") {
        navigate("/admin");
      }
      // If passenger, stay on this page
    }
  }, [user, navigate]);

  // If we don't have a user yet, or if it's being redirected,
  // just render a loading state or blank
  if (!user || user.role === "driver" || user.role === "admin") {
    return null;
  }

  return <PassengerHome />;
}

function PassengerHome() {
  const [, navigate] = useLocation();
  
  // Fetch recent trips
  const { data: recentTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/passenger/trips/recent"],
  });

  const handleBookRide = () => {
    navigate("/passenger/select-location");
  };

  return (
    <PassengerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-xl font-medium text-neutral-800">Where are you going?</h2>
            <p className="text-neutral-500 mt-1">Book a ride for yourself or your family members</p>
            
            <div className="mt-6">
              <Button 
                onClick={handleBookRide}
                className="w-full flex items-center justify-center"
                size="lg"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Book a Ride
              </Button>
            </div>
          </CardContent>
          
          {recentTrips.length > 0 && (
            <div className="border-t border-neutral-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-neutral-800">Recent Trips</h3>
                
                <div className="mt-4 space-y-4">
                  {recentTrips.map((trip) => (
                    <Card 
                      key={trip.id}
                      className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (trip.status === "completed") {
                          navigate(`/passenger/ride-completed/${trip.id}`);
                        } else {
                          navigate(`/passenger/ride-status/${trip.id}`);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-neutral-500" />
                              <span>{trip.pickupAddress.split(',')[0]} → {trip.destinationAddress.split(',')[0]}</span>
                            </div>
                            <div className="text-sm text-neutral-500 mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatRelativeTime(new Date(trip.requestedAt))}</span>
                              <span className="mx-1">•</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                trip.status === "completed" 
                                  ? "bg-green-100 text-green-800" 
                                  : trip.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1).replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-primary font-medium mr-1">
                              ${trip.totalFare.toFixed(2)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PassengerLayout>
  );
}
