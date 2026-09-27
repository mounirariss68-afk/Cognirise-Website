import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';

import Login from '@/pages/auth/Login';
import Bootstrap from '@/pages/auth/Bootstrap';
import MFA from '@/pages/auth/MFA';
import MfaSetup from '@/pages/auth/MfaSetup';
import PasswordSetup from '@/pages/auth/PasswordSetup';
import Dashboard from '@/pages/Dashboard';
import DocumentList from '@/pages/documents/DocumentList';
import WebsitePages from '@/pages/documents/WebsitePages';
import DocumentDetail from '@/pages/documents/DocumentDetail';
import MediaLibrary from '@/pages/media/MediaLibrary';
import MarketEditions from '@/pages/markets/MarketEditions';
import Inbox from '@/pages/submissions/Inbox';
import UserAdmin from '@/pages/users/UserAdmin';
import AuditLog from '@/pages/audit/AuditLog';
import NavigationSettings from '@/pages/NavigationSettings';
import ContactSettings from '@/pages/ContactSettings';
import EditorialWork from '@/pages/EditorialWork';
import ReleaseCenter from '@/pages/releases/ReleaseCenter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/bootstrap" component={Bootstrap} />
      <Route path="/mfa" component={MFA} />
      <Route path="/mfa-setup" component={MfaSetup} />
      <Route path="/password-setup" component={PasswordSetup} />
      
      <Route path="/dashboard" component={() => <AppLayout><Dashboard /></AppLayout>} />
       <Route path="/editorial-work" component={() => <AppLayout><EditorialWork /></AppLayout>} />
       <Route path="/releases" component={() => <AppLayout administratorOnly><ReleaseCenter /></AppLayout>} />
      
      {/* Content routes */}
      <Route path="/website-pages" component={() => <AppLayout contentTopic="landing-page"><WebsitePages /></AppLayout>} />
      <Route path="/people" component={() => <AppLayout contentTopic="person"><DocumentList kind="person" /></AppLayout>} />
      <Route path="/partners" component={() => <AppLayout contentTopic="partner"><DocumentList kind="partner" /></AppLayout>} />
      <Route path="/platforms" component={() => <AppLayout contentTopic="platform"><DocumentList kind="platform" /></AppLayout>} />
      <Route path="/publications" component={() => <AppLayout contentTopic="publication"><DocumentList kind="publication" /></AppLayout>} />
      <Route path="/case-studies" component={() => <AppLayout contentTopic="case-study"><DocumentList kind="case-study" /></AppLayout>} />
      <Route path="/industries" component={() => <AppLayout contentTopic="industry"><DocumentList kind="industry" /></AppLayout>} />
      <Route path="/frameworks" component={() => <AppLayout contentTopic="framework"><DocumentList kind="framework" /></AppLayout>} />
      <Route path="/offices" component={() => <AppLayout contentTopic="office"><DocumentList kind="office" /></AppLayout>} />
      
      {/* Content detail */}
      <Route path="/content/:id" component={() => <AppLayout><DocumentDetail /></AppLayout>} />
      
      {/* Other main routes */}
      <Route path="/media" component={() => <AppLayout><MediaLibrary /></AppLayout>} />
      <Route path="/markets" component={() => <AppLayout><MarketEditions /></AppLayout>} />
      <Route path="/submissions" component={() => <AppLayout administratorOnly><Inbox /></AppLayout>} />
      <Route path="/users" component={() => <AppLayout administratorOnly><UserAdmin /></AppLayout>} />
      <Route path="/audit-log" component={() => <AppLayout administratorOnly><AuditLog /></AppLayout>} />
      <Route path="/navigation" component={() => <AppLayout administratorOnly><NavigationSettings /></AppLayout>} />
      <Route path="/contact-settings" component={() => <AppLayout><ContactSettings /></AppLayout>} />
      
      <Route component={() => <AppLayout><NotFound /></AppLayout>} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  // Enforce light mode since it's a first-party editorial cockpit, but support class switching
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary>
            <Router />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
