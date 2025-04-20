import { useLocation, Link } from "wouter";
import { Home, Clock, User, DollarSign } from "lucide-react";

type BottomNavigationProps = {
  userRole: "passenger" | "driver";
};

export default function BottomNavigation({ userRole }: BottomNavigationProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = {
    passenger: [
      { icon: Home, label: "Home", path: "/" },
      { icon: Clock, label: "Activity", path: "/activity" },
      { icon: User, label: "Profile", path: "/profile" },
    ],
    driver: [
      { icon: Home, label: "Home", path: "/driver/home" },
      { icon: Clock, label: "History", path: "/driver/history" },
      { icon: DollarSign, label: "Earnings", path: "/driver/earnings" },
      { icon: User, label: "Profile", path: "/profile" },
    ],
  };

  const currentNavItems = navItems[userRole];

  return (
    <nav className="bg-white border-t border-neutral-200 fixed bottom-0 inset-x-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-around">
          {currentNavItems.map((item, index) => (
            <Link
              key={index}
              href={item.path}
              className={`flex flex-col items-center py-3 px-4 ${
                isActive(item.path)
                  ? userRole === "passenger"
                    ? "text-primary"
                    : "text-secondary"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
