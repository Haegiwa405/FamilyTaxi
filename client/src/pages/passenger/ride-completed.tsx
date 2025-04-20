import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import PassengerLayout from "@/components/layout/passenger-layout";
import TripRouteDisplay from "@/components/trip-route-display";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trip } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Star } from "lucide-react";

export default function RideCompleted() {
  const [, params] = useRoute("/passenger/ride-completed/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tripId = params?.id || "";
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/passenger/trips/${tripId}`],
    enabled: !!tripId,
  });

  const submitRatingMutation = useMutation({
    mutationFn: async ({
      tripId,
      rating,
      review,
    }: {
      tripId: string;
      rating: number;
      review: string;
    }) => {
      const res = await apiRequest("POST", `/api/passenger/trips/${tripId}/rate`, {
        rating,
        review,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/passenger/trips/${tripId}`] });
      navigate("/");
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (tripId && rating > 0) {
      submitRatingMutation.mutate({
        tripId,
        rating,
        review,
      });
    } else {
      toast({
        title: "Please select a rating",
        description: "You must provide a rating to continue",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !trip) {
    return <PassengerLayout isLoading={true} />;
  }

  return (
    <PassengerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">Trip completed</h2>
            <p className="text-neutral-500">Thank you for using Family Taxi!</p>
            
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
                <span className="text-lg font-medium">Total</span>
                <span className="text-lg font-medium text-primary">${trip.totalFare.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6 text-left">
              <h3 className="text-lg font-medium text-neutral-800 mb-3">Rate your ride</h3>
              <div className="flex justify-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`p-2 rounded-full focus:outline-none ${rating >= star ? 'text-yellow-400' : 'text-neutral-300'}`}
                    onClick={() => setRating(star)}
                  >
                    <Star className="h-8 w-8 fill-current" />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Leave a comment (optional)"
                className="w-full"
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>
            
            <div className="mt-6">
              <Button 
                className="w-full"
                onClick={handleSubmit}
                disabled={submitRatingMutation.isPending}
              >
                {submitRatingMutation.isPending ? "Submitting..." : "Done"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PassengerLayout>
  );
}
