import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { DateProvider } from "./contexts/DateContext";
import { useAuth } from "./hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import HistoricalImport from "./pages/HistoricalImport";
import MiFitnessExtractor from "./pages/MiFitnessExtractor";
import GoogleFitSync from "./pages/GoogleFitSync";
import Landing from "./pages/Landing";
import NotFound from "./pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, isError } = useAuth();

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <DateProvider>
      <Switch>
        {!isAuthenticated || isError ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/settings" component={Settings} />
            <Route path="/import-historical" component={HistoricalImport} />
            <Route path="/mi-fitness-extractor" component={MiFitnessExtractor} />
            <Route path="/google-fit-sync" component={GoogleFitSync} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </DateProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="dark">
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
