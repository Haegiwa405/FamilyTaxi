import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

type TripRouteDisplayProps = {
  pickupLocation: string;
  destinationLocation: string;
  onEdit?: () => void;
  highlightPickup?: boolean;
  highlightDestination?: boolean;
  grayoutPickup?: boolean;
};

export default function TripRouteDisplay({
  pickupLocation,
  destinationLocation,
  onEdit,
  highlightPickup = false,
  highlightDestination = false,
  grayoutPickup = false,
}: TripRouteDisplayProps) {
  return (
    <div className="mt-4 flex items-start">
      <div className="mr-4 flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${highlightPickup ? 'bg-secondary ring-4 ring-secondary/20' : grayoutPickup ? 'bg-neutral-300' : 'bg-secondary'}`} />
        <div className="w-0.5 h-16 bg-neutral-300 my-1" />
        <div className={`w-3 h-3 rounded-full ${highlightDestination ? 'bg-primary ring-4 ring-primary/20' : 'bg-primary'}`} />
      </div>
      
      <div className="flex-1">
        <div className={`mb-4 ${grayoutPickup ? 'opacity-50' : ''}`}>
          <p className="font-medium">Pickup location</p>
          <p className="text-neutral-500">{pickupLocation}</p>
        </div>
        
        <div>
          <p className="font-medium">Destination</p>
          <p className="text-neutral-500">{destinationLocation}</p>
        </div>
      </div>
      
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="shrink-0"
        >
          <Edit className="h-5 w-5 text-neutral-500 hover:text-neutral-700" />
        </Button>
      )}
    </div>
  );
}
