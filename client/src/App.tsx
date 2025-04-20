import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin";

// Passenger pages
import LocationSelection from "@/pages/passenger/location-selection";
import RouteConfirmation from "@/pages/passenger/route-confirmation";
import SearchingDriver from "@/pages/passenger/searching-driver";
import RideStatus from "@/pages/passenger/ride-status";
import RideCompleted from "@/pages/passenger/ride-completed";

// Driver pages
import DriverHome from "@/pages/driver/home";
import RideRequest from "@/pages/driver/ride-request";
import ActiveRide from "@/pages/driver/active-ride";
import TripInProgress from "@/pages/driver/trip-in-progress";
import TripCompleted from "@/pages/driver/trip-completed";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin routes */}
      <ProtectedRoute path="/admin" component={AdminPage} allowedRoles={["admin"]} />
      
      {/* Passenger routes */}
      <ProtectedRoute path="/passenger/select-location" component={LocationSelection} allowedRoles={["passenger"]} />
      <ProtectedRoute path="/passenger/confirm-route" component={RouteConfirmation} allowedRoles={["passenger"]} />
      <ProtectedRoute path="/passenger/searching-driver" component={SearchingDriver} allowedRoles={["passenger"]} />
      <ProtectedRoute path="/passenger/ride-status/:id" component={RideStatus} allowedRoles={["passenger"]} />
      <ProtectedRoute path="/passenger/ride-completed/:id" component={RideCompleted} allowedRoles={["passenger"]} />
      
      {/* Driver routes */}
      <ProtectedRoute path="/driver/home" component={DriverHome} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/ride-request/:id" component={RideRequest} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/active-ride/:id" component={ActiveRide} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/trip-in-progress/:id" component={TripInProgress} allowedRoles={["driver"]} />
      <ProtectedRoute path="/driver/trip-completed/:id" component={TripCompleted} allowedRoles={["driver"]} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
