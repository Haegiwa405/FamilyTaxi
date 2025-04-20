import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import DriverLayout from "@/components/layout/driver-layout";
import GoogleMap from "@/components/ui/maps/google-map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function DriverHome() {
  const [, navigate] = useLocation();
  const { user, updateLocationMutation, toggleOnlineStatusMutation } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Fetch driver stats
  const { data: stats = { tripCount: 0, totalHours: 0, earnings: 0 } } = useQuery<{
    tripCount: number;
    totalHours: number;
    earnings: number;
  }>({
    queryKey: ["/api/driver/stats/today"],
  });

  // Check for active trip
  const { data: activeTrip } = useQuery<Trip>({
    queryKey: ["/api/driver/trips/active"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Redirect to active trip if exists
  useEffect(() => {
    if (activeTrip) {
      if (activeTrip.status === "accepted") {
        navigate(`/driver/active-ride/${activeTrip.id}`);
      } else if (activeTrip.status === "in_progress") {
        navigate(`/driver/trip-in-progress/${activeTrip.id}`);
      }
    }
  }, [activeTrip, navigate]);

  // Get and watch current location
  useEffect(() => {
    if (navigator.geolocation) {
      // Initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Update user's location in the backend
          if (user) {
            updateLocationMutation.mutate({
              latitude: newLocation.lat,
              longitude: newLocation.lng,
            });
          }
        },
        (error) => {
          console.error("Error getting location", error);
        }
      );

      // Watch position
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Update user's location in the backend
          if (user) {
            updateLocationMutation.mutate({
              latitude: newLocation.lat,
              longitude: newLocation.lng,
            });
          }
        },
        (error) => {
          console.error("Error watching location", error);
        }
      );

      setWatchId(id);

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }
  }, [user, updateLocationMutation]);

  const handleToggleOnlineStatus = () => {
    if (user) {
      toggleOnlineStatusMutation.mutate({
        isOnline: !user.isOnline,
      });
    }
  };

  // Check for new trip requests
  useQuery<Trip>({
    queryKey: ["/api/driver/trips/requests"],
    refetchInterval: 3000, // Poll every 3 seconds
    enabled: !!user?.isOnline,
    onSuccess: (data) => {
      if (data) {
        navigate(`/driver/ride-request/${data.id}`);
      }
    },
  });

  if (!user) {
    return <DriverLayout isLoading={true} />;
  }

  return (
    <DriverLayout>
      <div className="flex flex-col h-full">
        <div className="h-[50vh] relative">
          <GoogleMap
            center={currentLocation || { lat: 21.0285, lng: 105.8542 }}
            markers={currentLocation ? [
              {
                position: currentLocation,
                title: "Your location",
                icon: "driver"
              }
            ] : []}
            className="w-full h-full"
          />
        </div>
        
        <div className="bg-white flex-1 rounded-t-2xl -mt-6 relative z-10 shadow-lg p-6">
          <div className="pb-4">
            <h2 className="text-xl font-medium text-neutral-800">
              {user.isOnline ? "Ready for trips" : "You're offline"}
            </h2>
            <p className="text-neutral-500 mt-1">
              {user.isOnline 
                ? "You'll be notified when there are ride requests nearby" 
                : "Go online to start receiving trip requests"}
            </p>
          </div>
          
          <div className="mt-4 border-t border-neutral-200 pt-4">
            <h3 className="text-lg font-medium text-neutral-800">Today's stats</h3>
            
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="border border-neutral-200 rounded-md p-3 text-center">
                <span className="text-2xl font-medium text-secondary">{stats.tripCount}</span>
                <p className="text-sm text-neutral-500 mt-1">Trips</p>
              </div>
              
              <div className="border border-neutral-200 rounded-md p-3 text-center">
                <span className="text-2xl font-medium text-secondary">{stats.totalHours.toFixed(1)}</span>
                <p className="text-sm text-neutral-500 mt-1">Hours</p>
              </div>
              
              <div className="border border-neutral-200 rounded-md p-3 text-center">
                <span className="text-2xl font-medium text-secondary">${stats.earnings.toFixed(0)}</span>
                <p className="text-sm text-neutral-500 mt-1">Earned</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <Button 
              variant={user.isOnline ? "secondary" : "default"}
              className={`w-full ${user.isOnline ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800' : ''}`}
              onClick={handleToggleOnlineStatus}
              disabled={toggleOnlineStatusMutation.isPending}
            >
              {toggleOnlineStatusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {user.isOnline ? "Go Offline" : "Go Online"}
            </Button>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}
