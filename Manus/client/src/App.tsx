import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import Home from "./pages/Home";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import GemeentenBeheer from "./pages/admin/GemeentenBeheer";
import SeatsBeheer from "./pages/admin/SeatsBeheer";
import AdviseursBeheer from "./pages/admin/AdviseursBeheer";
import RapportenOverzicht from "./pages/admin/RapportenOverzicht";
import Kennisbank from "./pages/admin/Kennisbank";
import PilotDashboard from "./pages/admin/PilotDashboard";
import ToetsingsmatrixBeheer from "./pages/ToetsingsmatrixBeheer";
import KennisbankBeheer from "./pages/KennisbankBeheer";
import BeheerderDashboard from "./pages/beheerder/BeheerderDashboard";
import OnboardingChat from "./pages/beheerder/OnboardingChat";
import BeheerderSeats from "./pages/beheerder/BeheerderSeats";
import BeheerderDocumenten from "./pages/beheerder/BeheerderDocumenten";
import FeedbackDashboard from "./pages/beheerder/FeedbackDashboard";
import BeleidSuggesties from "./pages/beheerder/BeleidSuggesties";
import Feedback from "./pages/Feedback";
import GebruikerDashboard from "./pages/gebruiker/GebruikerDashboard";
import DSOUpload from "./pages/gebruiker/DSOUpload";
import MijnRapporten from "./pages/gebruiker/MijnRapporten";
import GebruikerPrivacy from "./pages/gebruiker/Privacy";
import RapportenArchief from "./pages/RapportenArchief";

import Voorwaarden from "./pages/Voorwaarden";
import Privacy from "./pages/Privacy";
import Demo from "./pages/Demo";
import PilotAanvraag from "./pages/PilotAanvraag";
import Subscription from "./pages/Subscription";
import FAQ from "./pages/FAQ";
import VerantwoordeAI from "./pages/VerantwoordeAI";
import GelaagdeKennisbank from "./pages/GelaagdeKennisbank";
import OmgevingsscanHome from "./pages/OmgevingsscanHome";
import OmgevingsscanDashboard from "./pages/OmgevingsscanDashboard";
import IndicatorenOverzicht from "./pages/IndicatorenOverzicht";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      
      <Route path="/voorwaarden" component={Voorwaarden} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/demo" component={Demo} />
      <Route path="/pilot" component={PilotAanvraag} />
      <Route path="/abonnement" component={Subscription} />
      <Route path="/faq" component={FAQ} />
      <Route path="/verantwoorde-ai" component={VerantwoordeAI} />
      <Route path="/gelaagde-kennisbank" component={GelaagdeKennisbank} />
      <Route path="/omgevingsscan" component={OmgevingsscanHome} />
      <Route path="/omgevingsscan/dashboard" component={OmgevingsscanDashboard} />
      <Route path="/omgevingsscan/indicatoren" component={IndicatorenOverzicht} />
      
      {/* Super Admin routes */}
      <Route path="/admin" component={SuperAdminDashboard} />
      <Route path="/admin/gemeenten" component={GemeentenBeheer} />
      <Route path="/admin/seats" component={SeatsBeheer} />
      <Route path="/admin/adviseurs" component={AdviseursBeheer} />
      <Route path="/admin/rapporten" component={RapportenOverzicht} />
      <Route path="/admin/kennisbank" component={Kennisbank} />
      <Route path="/admin/pilots" component={PilotDashboard} />
      <Route path="/admin/toetsingsmatrix" component={ToetsingsmatrixBeheer} />
      
      {/* Beheerder routes */}
      <Route path="/beheerder" component={BeheerderDashboard} />
      <Route path="/beheerder/onboarding" component={OnboardingChat} />
      <Route path="/beheerder/seats" component={BeheerderSeats} />
      <Route path="/beheerder/documenten" component={BeheerderDocumenten} />
      <Route path="/beheerder/feedback" component={FeedbackDashboard} />
      <Route path="/beheerder/beleid-suggesties" component={BeleidSuggesties} />
      
      {/* Kennisbank beheer (alle behandelaars) */}
      <Route path="/kennisbank" component={KennisbankBeheer} />
      
      {/* Gebruiker routes */}
      <Route path="/gebruiker" component={GebruikerDashboard} />
      <Route path="/gebruiker/upload" component={DSOUpload} />
      <Route path="/gebruiker/rapporten" component={MijnRapporten} />
      <Route path="/gebruiker/privacy" component={GebruikerPrivacy} />
      <Route path="/archief" component={RapportenArchief} />
      <Route path="/feedback" component={Feedback} />
      
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <ScrollToTop />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
