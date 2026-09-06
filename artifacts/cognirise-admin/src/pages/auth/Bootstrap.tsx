import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBootstrapAuth, useGetAuthBootstrap } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { CogniriseBrand } from "@/components/brand/CogniriseBrand";

const bootstrapSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export default function Bootstrap() {
  const [, setLocation] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  
  const { data: bootstrapData, isLoading } = useGetAuthBootstrap();
  const bootstrap = useBootstrapAuth();

  const form = useForm<z.infer<typeof bootstrapSchema>>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isLoading && bootstrapData && !bootstrapData.setupRequired) {
      setLocation("/");
    }
  }, [bootstrapData, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bootstrapData && !bootstrapData.setupRequired) {
    return null;
  }

  function onSubmit(values: z.infer<typeof bootstrapSchema>) {
    setAuthError(null);
    bootstrap.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.mfaChallenge) {
            setLocation(`/mfa?challenge=${data.mfaChallenge.id}`);
          } else if (data.authenticated) {
            if (data.session && !data.session.user.mfaEnabled) {
              setLocation("/mfa-setup");
            } else {
              setLocation("/dashboard");
            }
          }
        },
        onError: (error) => {
          setAuthError("Failed to initialize administrator account.");
        },
      }
    );
  }

  return (
    <div className="auth-surface min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(400px,0.7fr)]">
      <div className="flex flex-col justify-center p-8 sm:p-16 lg:p-24 max-w-[600px] w-full mx-auto relative z-10">
        <div className="mb-12">
          <CogniriseBrand className="mb-10" />
          <div className="pulse-rule mb-6 h-1 w-14 rounded-full" />
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">System Initialization</h1>
          <p className="text-muted-foreground text-sm font-mono tracking-tight">Create the primary administrator account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Jane Doe" 
                      className="bg-muted/50 border-transparent focus-visible:bg-transparent" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Administrator Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="admin@cognirise.com" 
                      autoComplete="email" 
                      className="bg-muted/50 border-transparent focus-visible:bg-transparent" 
                      {...field} 
                    />
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
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Secure Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      autoComplete="new-password" 
                      className="bg-muted/50 border-transparent focus-visible:bg-transparent" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Minimum 12 characters</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authError && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full font-medium" disabled={bootstrap.isPending}>
              {bootstrap.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Initialize System
            </Button>
          </form>
        </Form>
      </div>

      <div className="hidden lg:flex bg-gradient-to-br from-sidebar to-[#0a1224] border-l border-border/50 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
        </div>

        {/* Abstract brand graphics */}
        <div className="absolute -top-64 -left-64 w-[800px] h-[800px] bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-64 -right-64 w-[600px] h-[600px] bg-gradient-to-tl from-primary/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
