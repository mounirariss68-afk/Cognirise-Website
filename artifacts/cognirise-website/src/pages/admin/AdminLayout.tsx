import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useUser, useClerk } from "@clerk/react";
import { Loader2, LayoutDashboard, FileText, Image as ImageIcon, Activity, Bot, LogOut, ShieldAlert, Menu, X } from "lucide-react";
import { useGetCmsAdminAccess, getGetCmsAdminAccessQueryKey } from "@workspace/api-client-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const access = useGetCmsAdminAccess({ query: { enabled: isLoaded && isSignedIn, retry: false, queryKey: getGetCmsAdminAccessQueryKey() } });

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/admin/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--brand-deep))] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-pink))]" />
      </div>
    );
  }

  if (access.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--brand-deep))] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-pink))]" />
      </div>
    );
  }

  if (access.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--brand-deep))] text-white p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-[hsl(var(--brand-coral))] mb-6" />
        <h1 className="text-2xl font-display font-bold mb-2">Access Denied</h1>
        <p className="text-white/70 max-w-md mb-8">
          Your account ({user?.primaryEmailAddress?.emailAddress}) does not have editorial privileges.
        </p>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded font-semibold text-sm"
        >
          Sign Out
        </button>
      </div>
    );
  }

  const role = access.data?.principal.role;
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { label: "Content", href: "/admin/content", icon: <FileText className="h-4 w-4" /> },
    { label: "Media", href: "/admin/media", icon: <ImageIcon className="h-4 w-4" /> },
    { label: "Audit Log", href: "/admin/audit", icon: <Activity className="h-4 w-4" /> },
    { label: "Assistant", href: "/admin/assistant", icon: <Bot className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-[hsl(var(--brand-deep))] text-white font-sans selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[hsl(var(--brand-deep))] flex flex-col hidden md:flex shrink-0">
        <div className="h-16 border-b border-white/10 flex items-center px-6">
          <span className="font-display font-bold tracking-tight text-lg text-white">Cognirise <span className="text-[hsl(var(--brand-coral))]">Pulse</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-3 rounded bg-white/5 mb-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))] flex items-center justify-center text-xs font-bold shrink-0">
              {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate leading-tight">{user?.fullName || "Editor"}</div>
              <div className="text-xs text-[hsl(var(--brand-coral))] uppercase tracking-wider font-bold mt-0.5">{role}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A101C]">
        <header className="h-16 md:hidden border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-[hsl(var(--brand-deep))]">
           <span className="font-display font-bold tracking-tight text-white">Cognirise <span className="text-[hsl(var(--brand-coral))]">Pulse</span></span>
           <button aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] rounded">
             {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
           </button>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 top-16 z-50 bg-[hsl(var(--brand-deep))] flex flex-col border-t border-white/10">
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.exact ? location === item.href : location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded text-base font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="flex items-center gap-3 px-4 py-3 rounded text-base font-medium text-white/60 hover:bg-white/5 hover:text-white w-full transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
