import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useVerifyMfa } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ArrowRight } from "lucide-react";
import { CogniriseBrand } from "@/components/brand/CogniriseBrand";

const mfaSchema = z.object({
  code: z.string().length(6, "Code must be exactly 6 digits"),
});

export default function MFA() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const challengeId = searchParams.get("challenge");
  
  const [authError, setAuthError] = useState<string | null>(null);
  const verifyMfa = useVerifyMfa();

  const form = useForm<z.infer<typeof mfaSchema>>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: "",
    },
  });

  if (!challengeId) {
    setLocation("/");
    return null;
  }

  function onSubmit(values: z.infer<typeof mfaSchema>) {
    setAuthError(null);
    verifyMfa.mutate(
      { data: { challengeId: challengeId!, code: values.code } },
      {
        onSuccess: (data) => {
          if (data.authenticated) {
            setLocation("/dashboard");
          }
        },
        onError: (error) => {
          setAuthError("Invalid or expired code.");
        },
      }
    );
  }

  return (
    <div className="auth-surface min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
      </div>
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border relative z-10">
        <CogniriseBrand compact className="mb-8 justify-center" />
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Two-Factor Authentication</h1>
          <p className="text-muted-foreground text-sm font-mono tracking-tight">Enter the 6-digit code from your authenticator app</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormLabel className="sr-only">Authentication Code</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                        <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                        <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                        <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                        <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                        <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage className="text-center w-full" />
                </FormItem>
              )}
            />

            {authError && (
              <div className="w-full text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 text-center">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full font-medium" disabled={verifyMfa.isPending}>
              {verifyMfa.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Verify Session
            </Button>
            
            <Button variant="ghost" type="button" className="w-full text-xs text-muted-foreground" onClick={() => setLocation("/")}>
              Cancel and return to login
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
