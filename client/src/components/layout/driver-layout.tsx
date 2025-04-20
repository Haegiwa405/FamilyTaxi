import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/components/bottom-navigation";
import { Loader2 } from "lucide-react";

type DriverLayoutProps = {
  children: ReactNode;
  hideNavigation?: boolean;
  isLoading?: boolean;
};

export default function DriverLayout({
  children,
  hideNavigation = false,
  isLoading = false,
}: DriverLayoutProps) {
  const [, navigate] = useLocation();
  const { user, logoutMutation, toggleOnlineStatusMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleToggleStatus = () => {
    if (user) {
      toggleOnlineStatusMutation.mutate({
        isOnline: !user.isOnline,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-100">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100">
      {!hideNavigation && (
        <header className="bg-white shadow z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div
                className="flex items-center cursor-pointer"
                onClick={() => navigate("/driver/home")}
              >
                <h1 className="text-2xl font-bold text-secondary">
                  Family Taxi{" "}
                  <Badge variant="outline" className="bg-secondary-light text-white ml-2 border-0">
                    Driver
                  </Badge>
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  size="sm"
                  variant={user?.isOnline ? "default" : "outline"}
                  className={
                    user?.isOnline
                      ? "bg-green-500 hover:bg-green-600 flex items-center gap-1"
                      : "border-neutral-300 hover:bg-neutral-50 flex items-center gap-1"
                  }
                  onClick={handleToggleStatus}
                  disabled={toggleOnlineStatusMutation.isPending}
                >
                  <span className={`w-2 h-2 rounded-full ${user?.isOnline ? 'bg-white' : 'bg-neutral-500'}`}></span>
                  {user?.isOnline ? "Online" : "Offline"}
                </Button>
                <Avatar
                  className="cursor-pointer"
                  onClick={() => navigate("/profile")}
                >
                  <AvatarImage
                    src={user?.profilePicture || ""}
                    alt={user?.fullName || ""}
                  />
                  <AvatarFallback>
                    {getInitials(user?.fullName || "")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto">{children}</main>

      {!hideNavigation && <BottomNavigation userRole="driver" />}
    </div>
  );
}
