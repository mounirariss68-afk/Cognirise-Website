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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      <div className="flex flex-col justify-center p-8 sm:p-16 lg:p-24 max-w-[600px] w-full mx-auto">
        <div className="mb-12">
          <div className="w-10 h-10 bg-accent rounded flex items-center justify-center text-sm font-bold text-accent-foreground uppercase tracking-widest leading-none mb-6">
            CG
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {mode === "login" ? "Sign in to Cognirise" : "Account Recovery"}
          </h1>
          <p className="text-muted-foreground text-sm font-mono">
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
      
      <div className="hidden lg:block bg-sidebar border-l border-border p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
        </div>
        
        <div className="h-full flex flex-col justify-between relative z-10 text-sidebar-foreground/80">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-widest text-sidebar-primary mb-4">CogniOS Architecture</h2>
            <p className="text-lg max-w-md leading-relaxed">
              Precision delivery system for advisory profiles, platforms, and intelligence.
            </p>
          </div>
          
          <div className="font-mono text-[10px] uppercase tracking-widest flex justify-between opacity-50">
            <span>Systems Online</span>
            <span>v0.2.0-core</span>
          </div>
        </div>
      </div>
    </div>
  );
}