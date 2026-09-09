import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useChangePassword, useConsumeAccessToken, useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CogniriseBrand } from "@/components/brand/CogniriseBrand";

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
    .min(12, "Must be at least 12 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/, "Must contain uppercase, lowercase, number, and special character"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function PasswordSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [authError, setAuthError] = useState<string | null>(null);
  const token = new URLSearchParams(window.location.search).get("token");

  const { data: session, isLoading } = useGetSession({
    query: { queryKey: getGetSessionQueryKey(), enabled: !token, retry: false },
  });
  const changePassword = useChangePassword();
  const consumeAccessToken = useConsumeAccessToken();

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token && !isLoading) {
      if (!session) {
        setLocation("/");
      } else if (!session.user.mustRotate) {
        if (!session.user.mfaEnabled || !session.mfaVerified) {
          setLocation("/mfa-setup");
        } else {
          setLocation("/dashboard");
        }
      }
    }
  }, [session, isLoading, setLocation, token]);

  if (!token && (isLoading || !session || !session.user.mustRotate)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function onSubmit(values: z.infer<typeof passwordSchema>) {
    setAuthError(null);
    if (token) {
      consumeAccessToken.mutate(
        { data: { token, newPassword: values.newPassword } },
        {
          onSuccess: () => {
            toast({ title: "Password set successfully", description: "Sign in with your new password." });
            setLocation("/");
          },
          onError: (err: any) => setAuthError(err.error || "This access link is invalid, expired, or already used."),
        },
      );
      return;
    }
    if (!values.currentPassword) {
      form.setError("currentPassword", { message: "Current password is required" });
      return;
    }
    changePassword.mutate(
      { data: { currentPassword: values.currentPassword, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          toast({ title: "Password updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
          
          // Let the effect handle routing once session updates, but we can optimistically route
          if (!session!.user.mfaEnabled || !session!.mfaVerified) {
            setLocation("/mfa-setup");
          } else {
            setLocation("/dashboard");
          }
        },
        onError: (err: any) => {
          setAuthError(err.error || "Failed to update password. Ensure your current password is correct.");
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
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-primary/10">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Set Your Password</h1>
          <p className="text-muted-foreground text-sm font-mono leading-relaxed tracking-tight">
            {token
              ? "Choose a secure password. This invitation or reset link can only be used once."
              : "You must change your temporary password to a secure permanent password before continuing."}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!token && <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Current / Temporary Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />}
            {!token && <div className="h-px bg-border my-4" />}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authError && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 text-center">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full font-medium mt-6" disabled={changePassword.isPending || consumeAccessToken.isPending}>
              {changePassword.isPending || consumeAccessToken.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Update Password
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}