import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetSession, useLogout, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, LayoutDashboard, Users, UserSquare2, Component, Newspaper, Briefcase, Factory, PanelsTopLeft, Image as ImageIcon, Globe, Inbox, ShieldAlert, LogOut, ChevronUp, Lock, ListTree, MapPin, Mail } from "lucide-react";
import { CogniriseBrand } from "@/components/brand/CogniriseBrand";

function AppSidebar() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: session } = useGetSession({
    query: { queryKey: getGetSessionQueryKey(), retry: false },
  });
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/");
      }
    });
  };

  const isAdministrator = session?.user?.role === "administrator";

  const navGroups = [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        ...(isAdministrator ? [{ title: "Submissions", url: "/submissions", icon: Inbox }] : []),
      ]
    },
    {
      title: "Content",
      items: [
        { title: "Publications", url: "/publications", icon: Newspaper },
        { title: "Case Studies", url: "/case-studies", icon: Briefcase },
        { title: "People", url: "/people", icon: UserSquare2 },
        { title: "Partners", url: "/partners", icon: Users },
        { title: "Platforms", url: "/platforms", icon: Component },
        { title: "Industries", url: "/industries", icon: Factory },
        { title: "Frameworks", url: "/frameworks", icon: PanelsTopLeft },
        { title: "Offices", url: "/offices", icon: MapPin },
      ]
    },
    {
      title: "Resources",
      items: [
        { title: "Media Library", url: "/media", icon: ImageIcon },
        { title: "Market Editions", url: "/markets", icon: Globe },
        { title: "Contact Email", url: "/contact-settings", icon: Mail },
        ...(isAdministrator ? [{ title: "Website Navigation", url: "/navigation", icon: ListTree }] : []),
      ]
    },
    ...(isAdministrator ? [{
      title: "System",
      items: [
        { title: "Users", url: "/users", icon: Users },
        { title: "Audit Log", url: "/audit-log", icon: ShieldAlert },
      ]
    }] : [])
  ];

  return (
    <Sidebar className="border-r border-sidebar-border shadow-sm" variant="inset">
      <SidebarHeader className="p-4">
        <CogniriseBrand inverse compact />
        <div className="pulse-rule mt-4 h-px w-full opacity-70" />
      </SidebarHeader>
      
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.startsWith(item.url)}
                    tooltip={item.title}
                    className="font-medium tracking-tight h-9 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 opacity-80" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2 py-2 h-auto hover:bg-sidebar-accent group data-[state=open]:bg-sidebar-accent border border-transparent rounded-lg">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-sidebar-primary/80 to-accent/80 text-sidebar-primary-foreground flex items-center justify-center mr-3 shadow-xs border border-sidebar-primary/20 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-widest">{session?.user?.name?.substring(0, 2).toUpperCase() || 'U'}</span>
              </div>
              <div className="flex flex-col items-start text-left flex-1 overflow-hidden">
                <span className="text-sm font-semibold truncate w-full text-sidebar-foreground tracking-tight">{session?.user?.name || 'User'}</span>
                <span className="text-[10px] text-sidebar-foreground/60 truncate w-full font-mono uppercase tracking-wider">{session?.user?.role || 'Role'}</span>
              </div>
              <ChevronUp className="w-4 h-4 text-sidebar-foreground/40 group-hover:text-sidebar-foreground ml-2 transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-mono">
              {session?.user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children, administratorOnly = false }: { children: ReactNode, administratorOnly?: boolean }) {
  const { data: session, isLoading, isError } = useGetSession({
    query: { queryKey: getGetSessionQueryKey(), retry: false },
  });
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (isError || !session) {
        setLocation("/");
      } else if (session.user.mustRotate) {
        setLocation("/password-setup");
      } else if (!session.user.mfaEnabled || !session.mfaVerified) {
        setLocation("/mfa-setup");
      }
    }
  }, [isLoading, isError, session, setLocation]);

  if (isLoading || isError || !session || session.user.mustRotate || !session.user.mfaEnabled || !session.mfaVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (administratorOnly && session.user.role !== "administrator") {
    return (
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full bg-sidebar text-foreground overflow-hidden">
          <AppSidebar />
          <main className="flex-1 flex flex-col items-center justify-center min-w-0 bg-background rounded-tl-2xl border-t border-l border-border/50 shadow-xl h-screen text-center p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <Lock className="w-12 h-12 text-muted-foreground mb-4 opacity-50 mx-auto" />
              <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Access Denied</h1>
              <p className="text-sm text-muted-foreground font-mono">You do not have the required administrator privileges to view this section.</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-sidebar text-foreground overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-background rounded-tl-2xl border-t border-l border-border/50 shadow-xl overflow-hidden h-screen relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
