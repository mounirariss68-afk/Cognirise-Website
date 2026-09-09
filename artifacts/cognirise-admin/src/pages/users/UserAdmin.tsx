import { useState } from "react";
import { useListUsers, useInviteUser, useResetUserPassword, useUpdateUser, useListMarketEditions, getListUsersQueryKey, UserInvitation, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users as UsersIcon, ShieldAlert, MoreHorizontal, KeyRound, Ban, CheckCircle2, Lock, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const inviteSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["administrator", "publisher", "editor", "viewer"] as const)
  ,marketCodes: z.array(z.string())
});

export default function UserAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitationData, setInvitationData] = useState<UserInvitation | null>(null);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [accessMarkets, setAccessMarkets] = useState<string[]>([]);

  const { data, isLoading, isError, error } = useListUsers({ page: 1, pageSize: 50 }, { query: { queryKey: getListUsersQueryKey({ page: 1, pageSize: 50 }) } });
  const { data: markets } = useListMarketEditions({ page: 1, pageSize: 100 });
  
  const inviteUser = useInviteUser();
  const resetUserPassword = useResetUserPassword();
  const updateUser = useUpdateUser();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "editor", marketCodes: [] }
  });
  const inviteRole = form.watch("role");

  const onSubmitInvite = (values: z.infer<typeof inviteSchema>) => {
    inviteUser.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({ title: "User invited successfully" });
        setInvitationData(data);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ page: 1, pageSize: 50 }) });
        form.reset();
      },
      onError: (err) => toast({ title: "Failed to invite", description: (err as any).error, variant: "destructive" })
    });
  };

  const openResetDialog = (userId: string) => {
    setResetUserId(userId);
    setIsResetOpen(true);
  };

  const handleConfirmReset = () => {
    if (!resetUserId) return;
    resetUserPassword.mutate({ 
      userId: resetUserId,
      data: {}
    }, {
      onSuccess: (data) => {
        toast({ title: "Reset link sent", description: "A secure one-time link was delivered by email." });
        setIsResetOpen(false);
      },
      onError: (err) => toast({ title: "Failed to reset password", description: (err as any).error, variant: "destructive" })
    });
  };

  const handleRoleChange = (user: User, role: User["role"]) => {
    updateUser.mutate({ userId: user.id, data: { role } }, {
      onSuccess: () => {
        toast({ title: "Role updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ page: 1, pageSize: 50 }) });
      },
      onError: (err) => toast({ title: "Update failed", description: (err as any).error, variant: "destructive" }),
    });
  };

  const saveMarketAccess = () => {
    if (!accessUser) return;
    updateUser.mutate({ userId: accessUser.id, data: { marketCodes: accessMarkets } }, {
      onSuccess: () => {
        toast({ title: "Market access updated" });
        setAccessUser(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ page: 1, pageSize: 50 }) });
      },
      onError: (err) => toast({ title: "Update failed", description: (err as any).error, variant: "destructive" }),
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    updateUser.mutate({ userId, data: { status: newStatus as any } }, {
      onSuccess: () => {
        toast({ title: `User ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ page: 1, pageSize: 50 }) });
      },
      onError: (err) => toast({ title: "Update failed", description: (err as any).error, variant: "destructive" })
    });
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card rounded-xl border border-destructive/20 shadow-sm max-w-2xl mx-auto mt-8">
        <Lock className="w-12 h-12 text-destructive mb-4 opacity-50" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Failed to load users</h2>
        <p className="text-sm text-muted-foreground font-mono">
          {(error as any)?.error || "You do not have permission to view or manage users."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" /> Users & Roles
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Manage platform access and permissions</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="gap-2 font-mono uppercase tracking-wider text-xs">
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Security</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Last Login</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(user => (
                  <TableRow key={user.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(role) => handleRoleChange(user, role as User["role"])}>
                        <SelectTrigger className="h-8 w-36 font-mono text-[10px] uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="publisher">Publisher</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                        {user.marketCodes.length
                          ? user.marketCodes.join(", ").toUpperCase()
                          : user.role === "administrator" ? "ALL MARKETS" : "NO MARKETS"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`font-mono text-[10px] uppercase rounded-sm ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.mfaEnabled ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit">
                          <ShieldAlert className="w-3 h-3" /> MFA ON
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground border border-border bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                           MFA OFF
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground text-right">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy HH:mm") : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/10 hover:text-accent">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-mono text-xs">
                          <DropdownMenuItem onClick={() => openResetDialog(user.id)}>
                            <KeyRound className="w-3.5 h-3.5 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setAccessUser(user); setAccessMarkets(user.marketCodes); }}>
                            <Settings2 className="w-3.5 h-3.5 mr-2" /> Edit Market Access
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className={user.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}
                          >
                            {user.status === 'active' ? (
                              <><Ban className="w-3.5 h-3.5 mr-2" /> Suspend Access</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Reactivate User</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isInviteOpen} onOpenChange={(open) => {
        if (!open) {
          setIsInviteOpen(false);
          setInvitationData(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{invitationData ? "Invitation Created" : "Invite New User"}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {invitationData 
                ? "A secure one-time invitation link was delivered to the user's email."
                : "Create a user account and deliver a secure one-time invitation link by email."}
            </DialogDescription>
          </DialogHeader>
          
          {invitationData ? (
            <div className="space-y-4 pt-4">
              <div className="bg-emerald-500/10 p-4 rounded-md border border-emerald-500/20 text-sm text-emerald-700">
                Email delivery confirmed. No credential is shown or stored here.
              </div>
              <p className="text-[10px] text-muted-foreground font-mono text-center">
                Valid until {format(new Date(invitationData.expiresAt), "MMM d, yyyy HH:mm")}
              </p>
              <DialogFooter>
                <Button onClick={() => setIsInviteOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInvite)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider">Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marketCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider">Market Access</FormLabel>
                      <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                        {markets?.items.filter((market) => market.enabled).map((market) => (
                          <label key={market.code} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={field.value.includes(market.code)}
                              onChange={(event) => field.onChange(event.target.checked ? [...field.value, market.code] : field.value.filter((code) => code !== market.code))} />
                            {market.displayName}
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {inviteRole === "administrator"
                          ? "Administrators have all-market access."
                          : "Select at least one market. No selection grants no market access."}
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider">Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider">Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                          <SelectItem value="editor">Editor (Draft & Review)</SelectItem>
                          <SelectItem value="publisher">Publisher (Publish to Markets)</SelectItem>
                          <SelectItem value="administrator">Administrator (Full Access)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button variant="ghost" type="button" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviteUser.isPending}>
                    {inviteUser.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isResetOpen} onOpenChange={(open) => {
        if (!open) {
          setIsResetOpen(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Send a secure one-time password reset link by email. Existing sessions are revoked when the link is consumed.
            </DialogDescription>
          </DialogHeader>
          
            <div className="pt-4 space-y-4">
              <p className="text-sm text-foreground">Are you sure you want to send a reset link to this user?</p>
              <DialogFooter className="pt-4">
                <Button variant="ghost" type="button" onClick={() => setIsResetOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmReset} disabled={resetUserPassword.isPending}>
                  {resetUserPassword.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Send Reset Link
                </Button>
              </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(accessUser)} onOpenChange={(open) => { if (!open) setAccessUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Market Access</DialogTitle>
            <DialogDescription>
              Limit {accessUser?.name} to assigned markets.
              {accessUser?.role === "administrator"
                ? " Administrators have all-market access."
                : " No selection grants no market access."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {markets?.items.filter((market) => market.enabled).map((market) => (
              <label key={market.code} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <input type="checkbox" checked={accessMarkets.includes(market.code)}
                  onChange={(event) => setAccessMarkets(event.target.checked ? [...accessMarkets, market.code] : accessMarkets.filter((code) => code !== market.code))} />
                {market.displayName}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAccessUser(null)}>Cancel</Button>
            <Button onClick={saveMarketAccess} disabled={updateUser.isPending}>Save Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}