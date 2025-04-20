import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Star } from "lucide-react";

type PassengerCardProps = {
  passenger: User;
};

export default function PassengerCard({ passenger }: PassengerCardProps) {
  const getInitials = (name: string) => {
    if (!name) return "P";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center">
      <div className="mr-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={passenger.profilePicture || ""} alt={passenger.fullName} />
          <AvatarFallback>{getInitials(passenger.fullName)}</AvatarFallback>
        </Avatar>
      </div>
      <div>
        <p className="font-medium">{passenger.fullName}</p>
        <div className="flex items-center text-sm">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="ml-1 text-neutral-600">{passenger.rating?.toFixed(1) || "5.0"}</span>
        </div>
      </div>
    </div>
  );
}
