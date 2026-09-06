import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getGetSessionQueryKey, useLogin, useGetAuthBootstrap, useGetSession, useRecoverAuth } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, KeyRound } from "lucide-react";
import { CogniriseBrand } from "@/components/brand/CogniriseBrand";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const recoverSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  recoveryCode: z.string().min(8, "Recovery code is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "recover">("login");
  
  // Check if we need to bootstrap
  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useGetAuthBootstrap();
  // Check if already logged in
  const { data: session, isLoading: isLoadingSession } = useGetSession({
    query: {
      queryKey: getGetSessionQueryKey(),
      enabled: bootstrapData?.setupRequired === false,
      retry: false,
    },
  });

  const login = useLogin();
  const recover = useRecoverAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const recoverForm = useForm<z.infer<typeof recoverSchema>>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "", recoveryCode: "" },
  });

  // Redirect if logged in or needs bootstrap
  useEffect(() => {
    if (!isLoadingSession && !isLoadingBootstrap) {
      if (bootstrapData?.setupRequired) {
        setLocation("/bootstrap");
      } else if (session) {
        if (session.user.mustRotate) {
          setLocation("/password-setup");
        } else if (!session.user.mfaEnabled || !session.mfaVerified) {
          setLocation("/mfa-setup");
        } else {
          setLocation("/dashboard");
        }
      }
    }
  }, [session, bootstrapData, isLoadingSession, isLoadingBootstrap, setLocation]);

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setAuthError(null);
    login.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.mfaChallenge) {
            setLocation(`/mfa?challenge=${data.mfaChallenge.id}`);
          } else if (data.authenticated) {
            if (data.session && data.session.user.mustRotate) {
              setLocation("/password-setup");
            } else if (data.session && !data.session.user.mfaEnabled) {
              setLocation("/mfa-setup");
            } else {
              setLocation("/dashboard");
            }
          }
        },
        onError: (error) => {
          setAuthError("Sign-in failed. Please check your credentials. If you are using a temporary password, it may have expired.");
        },
      }
    );
  }

  function onRecoverSubmit(values: z.infer<typeof recoverSchema>) {
    setAuthError(null);
    recover.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.authenticated) {
            setLocation("/mfa-setup"); // Prompt them to setup a new MFA since they used recovery
          }
        },
        onError: (error) => {
          setAuthError("Invalid recovery code.");
        },
      }
    );
  }

  if (isLoadingBootstrap || isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="auth-surface min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(400px,0.7fr)]">
      <div className="flex flex-col justify-center p-8 sm:p-16 lg:p-24 max-w-[600px] w-full mx-auto relative z-10">
        <div className="mb-12">
          <CogniriseBrand className="mb-10" />
          <div className="pulse-rule mb-6 h-1 w-14 rounded-full" />
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
            {mode === "login" ? "Sign in to Cognirise" : "Account Recovery"}
          </h1>
          <p className="text-muted-foreground text-sm font-mono tracking-tight">
            {mode === "login" ? "First-party editorial cockpit" : "Use a one-time recovery code"}
          </p>
        </div>

        {mode === "login" ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@cognirise.com" autoComplete="email" className="bg-muted/50 border-transparent focus-visible:bg-transparent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" className="bg-muted/50 border-transparent focus-visible:bg-transparent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {authError && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {authError}
                </div>
              )}

              <Button type="submit" className="w-full font-medium" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Sign In
              </Button>

              <div className="text-center mt-6">
                <Button variant="link" type="button" onClick={() => { setMode("recover"); setAuthError(null); }} className="text-xs text-muted-foreground font-mono">
                  Lost authenticator access?
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...recoverForm}>
            <form onSubmit={recoverForm.handleSubmit(onRecoverSubmit)} className="space-y-6">
              <FormField
                control={recoverForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@cognirise.com" autoComplete="email" className="bg-muted/50 border-transparent focus-visible:bg-transparent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={recoverForm.control}
                name="recoveryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recovery Code</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXX-XXXX-XXXX" autoComplete="off" className="font-mono bg-muted/50 border-transparent focus-visible:bg-transparent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {authError && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  {authError}
                </div>
              )}

              <Button type="submit" className="w-full font-medium" disabled={recover.isPending}>
                {recover.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Recover Account
              </Button>

              <div className="text-center mt-6">
                <Button variant="link" type="button" onClick={() => { setMode("login"); setAuthError(null); }} className="text-xs text-muted-foreground font-mono">
                  Return to sign in
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>

      <div className="hidden lg:block bg-gradient-to-br from-sidebar via-sidebar to-[#16285a] border-l border-border/50 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
        </div>

        {/* Abstract brand graphics */}
        <div className="absolute -top-64 -right-64 w-[800px] h-[800px] bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-64 -left-64 w-[600px] h-[600px] bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="h-full flex flex-col justify-between relative z-10 text-sidebar-foreground/90">
          <div>
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand-coral mb-4">CogniOS Architecture</h2>
            <p className="font-display text-2xl max-w-md leading-relaxed tracking-tight text-white">
              Precision delivery system for advisory profiles, platforms, and intelligence.
            </p>
          </div>
          
          <div className="font-mono text-[10px] uppercase tracking-widest flex justify-between opacity-60">
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Systems Online</span>
            <span>v0.2.0-core</span>
          </div>
        </div>
      </div>
    </div>
  );
}