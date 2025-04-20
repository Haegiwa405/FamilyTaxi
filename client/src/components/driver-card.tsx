import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Star, Car } from "lucide-react";

type DriverCardProps = {
  driver: User;
};

export default function DriverCard({ driver }: DriverCardProps) {
  const getInitials = (name: string) => {
    if (!name) return "D";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Mock vehicle info - in a real app, this would come from the driver's profile
  const vehicleInfo = {
    make: "Toyota",
    model: "Vios",
    color: "White",
    licensePlate: "29A-12345"
  };

  return (
    <div className="flex items-center">
      <div className="mr-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={driver.profilePicture || ""} alt={driver.fullName} />
          <AvatarFallback>{getInitials(driver.fullName)}</AvatarFallback>
        </Avatar>
      </div>
      <div>
        <p className="font-medium">{driver.fullName}</p>
        <div className="flex items-center text-sm">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="ml-1 text-neutral-600">{driver.rating?.toFixed(1) || "5.0"}</span>
          <span className="mx-1 text-neutral-400">•</span>
          <span className="text-neutral-600">{driver.tripCount || 0}+ trips</span>
        </div>
        <div className="mt-1 flex items-center text-sm text-neutral-600">
          <Car className="h-4 w-4 mr-1" />
          {vehicleInfo.make} {vehicleInfo.model} • {vehicleInfo.color} • <span className="ml-1">{vehicleInfo.licensePlate}</span>
        </div>
      </div>
    </div>
  );
}
