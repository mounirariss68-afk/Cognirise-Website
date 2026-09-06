import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminSignIn from "@/pages/admin/AdminSignIn";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminContentList from "@/pages/admin/AdminContentList";
import AdminContentEditor from "@/pages/admin/AdminContentEditor";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminAssistant from "@/pages/admin/AdminAssistant";

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(253 66% 61%)",
    colorBackground: "hsl(217 76% 12%)",
    colorInput: "hsl(219 69% 20%)",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.6)",
  },
  elements: {
    cardBox: "bg-[hsl(217,76%,12%)] border border-white/10 shadow-xl",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

export default function AdminApp() {
  const [, setLocation] = useLocation();

  if (!clerkPubKey) {
    return <div className="p-8 text-red-500">Missing VITE_CLERK_PUBLISHABLE_KEY</div>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/admin/sign-in`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <Switch>
        <Route path="/admin/sign-in/*?" component={AdminSignIn} />
        <Route>
          <AdminLayout>
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/content" component={AdminContentList} />
              <Route path="/admin/content/:documentId/:market" component={AdminContentEditor} />
              <Route path="/admin/media" component={AdminMedia} />
              <Route path="/admin/audit" component={AdminAudit} />
              <Route path="/admin/assistant" component={AdminAssistant} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </Route>
      </Switch>
    </ClerkProvider>
  );
}