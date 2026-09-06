import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeSVG } from "qrcode.react";
import { useSetupMfa, useConfirmMfa, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ShieldCheck, Download, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const confirmSchema = z.object({
  code: z.string().length(6, "Code must be exactly 6 digits"),
});

export default function MfaSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const setupMfa = useSetupMfa();
  const confirmMfa = useConfirmMfa();
  
  const [step, setStep] = useState<"setup" | "recovery">("setup");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof confirmSchema>>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { code: "" },
  });

  // Start setup on mount
  useEffect(() => {
    if (!setupMfa.data && !setupMfa.isPending && !setupMfa.isError) {
      setupMfa.mutate();
    }
  }, [setupMfa.data, setupMfa.isPending, setupMfa.isError, setupMfa.mutate]);

  function onSubmit(values: z.infer<typeof confirmSchema>) {
    if (!setupMfa.data) return;
    
    confirmMfa.mutate(
      { data: { secret: setupMfa.data.secret, code: values.code } },
      {
        onSuccess: (data) => {
          setRecoveryCodes(data.recoveryCodes);
          setStep("recovery");
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Verification failed", description: (err as any).error, variant: "destructive" });
        },
      }
    );
  }

  const handleDownloadRecovery = () => {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cognirise-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full border border-border bg-card rounded-xl p-8 shadow-sm">
        
        {step === "setup" && (
          <>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Secure Your Account</h1>
              <p className="text-muted-foreground text-sm font-mono leading-relaxed">
                Scan this QR code with an authenticator app (like Google Authenticator or Authy) to set up two-factor authentication.
              </p>
            </div>

            {setupMfa.isPending ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : setupMfa.isError ? (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 text-center">
                Failed to initialize MFA setup. Please try again.
              </div>
            ) : setupMfa.data ? (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg flex justify-center border shadow-sm">
                  <QRCodeSVG value={setupMfa.data.provisioningUri} size={200} />
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Manual Entry Code</p>
                  <code className="text-sm font-bold bg-muted/50 px-2 py-1 rounded select-all break-all">{setupMfa.data.secret}</code>
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-sm font-medium mb-3 text-center">Verify Setup</h3>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col items-center">
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem className="flex flex-col items-center">
                            <FormControl>
                              <InputOTP maxLength={6} {...field}>
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                                  <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                                  <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                                  <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                                  <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                                  <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                                </InputOTPGroup>
                              </InputOTP>
                            </FormControl>
                            <FormMessage className="text-center" />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full font-medium" disabled={confirmMfa.isPending}>
                        {confirmMfa.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 mr-2" />
                        )}
                        Verify and Enable MFA
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
            ) : null}
          </>
        )}

        {step === "recovery" && (
          <div className="space-y-6 text-center">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Save Recovery Codes</h1>
            <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">
              If you lose access to your authenticator app, these one-time codes are the ONLY way to regain access to your account.
            </p>
            
            <div className="bg-muted/30 border border-border/50 rounded-lg p-4 grid grid-cols-2 gap-2 text-left mb-6">
              {recoveryCodes.map(code => (
                <code key={code} className="text-xs font-bold tracking-widest">{code}</code>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleDownloadRecovery} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Codes
              </Button>
              <Button onClick={handleFinish} className="w-full">
                I have saved these codes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}