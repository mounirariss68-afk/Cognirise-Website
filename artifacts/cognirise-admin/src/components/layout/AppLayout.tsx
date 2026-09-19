import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetSession, useLogout, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarGroup, SidebarGroupLabel, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, LayoutDashboard, Users, UserSquare2, Component, Newspaper, Briefcase, Factory, PanelsTopLeft, Image as ImageIcon, Globe, Inbox, ShieldAlert, LogOut, ChevronUp, Lock, ListTree, MapPin, Mail, UserRoundCheck, Rocket } from "lucide-react";
import { CogniriseBrand } from "@/components/brand/CogniriseBrand";
import { canAccessAnyTopic, type ContentTopic } from "@/lib/content-capability";

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
  const isRepresentative = (session?.user as { accountType?: string } | undefined)?.accountType === "external-representative";
  const canViewTopic = (topic: ContentTopic) => canAccessAnyTopic(session?.user, topic, "view");

  const navGroups = isRepresentative ? [
    {
      title: "My workspace",
      items: [
        { title: "My assigned content", url: "/dashboard", icon: LayoutDashboard },
        { title: "Partner page", url: "/partners", icon: Users },
        { title: "Case studies", url: "/case-studies", icon: Briefcase },
        { title: "Submission status", url: "/editorial-work", icon: UserRoundCheck },
      ],
    },
  ] : [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Editorial Work", url: "/editorial-work", icon: UserRoundCheck },
        ...(isAdministrator ? [{ title: "Release Center", url: "/releases", icon: Rocket }] : []),
        ...(isAdministrator ? [{ title: "Submissions", url: "/submissions", icon: Inbox }] : []),
      ]
    },
    {
      title: "Content",
      items: [
        ...(canViewTopic("publication") ? [{ title: "Publications", url: "/publications", icon: Newspaper }] : []),
        ...(canViewTopic("case-study") ? [{ title: "Case Studies", url: "/case-studies", icon: Briefcase }] : []),
        ...(canViewTopic("person") ? [{ title: "People", url: "/people", icon: UserSquare2 }] : []),
        ...(canViewTopic("partner") ? [{ title: "Partners", url: "/partners", icon: Users }] : []),
        ...(canViewTopic("platform") ? [{ title: "Platforms", url: "/platforms", icon: Component }] : []),
        ...(canViewTopic("industry") ? [{ title: "Industries", url: "/industries", icon: Factory }] : []),
        ...(canViewTopic("framework") ? [{ title: "Frameworks", url: "/frameworks", icon: PanelsTopLeft }] : []),
        ...(canViewTopic("office") ? [{ title: "Offices", url: "/offices", icon: MapPin }] : []),
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
                    isActive={location === item.url || location.startsWith(`${item.url}/`)}
                    tooltip={item.title}
                    className="font-medium tracking-tight h-9 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm"
                  >
                    <Link href={item.url} className="flex items-center gap-3" aria-current={location === item.url || location.startsWith(`${item.url}/`) ? "page" : undefined}>
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
            <Button
              variant="ghost"
              aria-label="Open account menu"
              data-testid="account-menu-trigger"
              className="w-full justify-start px-2 py-2 h-auto hover:bg-sidebar-accent group data-[state=open]:bg-sidebar-accent border border-transparent rounded-lg"
            >
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

export function AppLayout({
  children,
  administratorOnly = false,
  contentTopic,
}: {
  children: ReactNode;
  administratorOnly?: boolean;
  contentTopic?: ContentTopic;
}) {
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
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-hidden bg-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none z-0" />

          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring">
            Skip to main content
          </a>

          <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border/10 bg-background relative z-40 shrink-0 shadow-sm">
            <SidebarTrigger className="-ml-2" />
            <CogniriseBrand compact />
            <div className="w-8" />
          </header>

          <div id="main-content" tabIndex={-1} className="flex-1 min-w-0 flex flex-col items-center justify-center relative z-10 p-8 w-full h-full focus:outline-none">
            <Lock className="w-12 h-12 text-muted-foreground mb-4 opacity-50 mx-auto" />
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Access Denied</h1>
            <p className="text-sm text-muted-foreground font-mono">You do not have the required administrator privileges to view this section.</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (contentTopic && !canAccessAnyTopic(session.user, contentTopic, "view")) {
    return (
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-hidden bg-background">
          <div id="main-content" tabIndex={-1} className="flex-1 min-w-0 flex flex-col items-center justify-center relative z-10 p-8 w-full h-full focus:outline-none">
            <Lock className="w-12 h-12 text-muted-foreground mb-4 opacity-50 mx-auto" />
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Access Denied</h1>
            <p className="text-sm text-muted-foreground font-mono">You do not have view capability for this content family.</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none z-0" />

        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring">
          Skip to main content
        </a>

        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border/10 bg-background relative z-40 shrink-0 shadow-sm">
          <SidebarTrigger className="-ml-2" />
          <CogniriseBrand compact />
          <div className="w-8" />
        </header>

        <div id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-y-auto custom-scrollbar relative z-10 w-full h-full flex flex-col focus:outline-none">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
