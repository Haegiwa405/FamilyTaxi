import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNavigation from "@/components/bottom-navigation";
import { Bell, Loader2 } from "lucide-react";

type PassengerLayoutProps = {
  children: ReactNode;
  hideNavigation?: boolean;
  isLoading?: boolean;
};

export default function PassengerLayout({
  children,
  hideNavigation = false,
  isLoading = false,
}: PassengerLayoutProps) {
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                onClick={() => navigate("/")}
              >
                <h1 className="text-2xl font-bold text-primary">Family Taxi</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6 text-neutral-600" />
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

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {!hideNavigation && <BottomNavigation userRole="passenger" />}
    </div>
  );
}
