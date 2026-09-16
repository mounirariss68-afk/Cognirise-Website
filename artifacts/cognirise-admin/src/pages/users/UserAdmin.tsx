import { useMemo, useRef, useState } from "react";
import {
  getGetAccessDeliveryStatusQueryKey,
  getListUsersQueryKey,
  inviteUser as inviteUserRequest,
  resetUserPassword as resetUserPasswordRequest,
  retryAccessDelivery as retryAccessDeliveryRequest,
  useGetAccessDeliveryStatus,
  useInviteUser,
  useListMarketEditions,
  useListUsers,
  useDryRunUserCapabilityMigration,
  useResetUserPassword,
  useRetryAccessDelivery,
  useUpdateUser,
  type AccessDeliveryStatus,
  type CapabilityMigrationDryRunReceipt,
  type PasswordReset,
  type User,
  type UserInvitation,
  type UserRole,
  type UserStatus,
} from "@workspace/api-client-react";
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

const USER_PAGE_SIZE = 25;

const inviteSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["administrator", "publisher", "editor", "viewer"] as const)
  ,marketCodes: z.array(z.string())
});

type DeliveryReceipt = {
  delivery?: string;
  deliveryId?: string | null;
  deliveryStatus?: string | null;
  deliveryState?: string | null;
  status?: string | null;
};

type Capability = "view" | "edit" | "review" | "publish";
type CapabilityScope = "regional" | "shared";
type CapabilityGrant = {
  topic: "person" | "partner" | "platform" | "publication" | "case-study" | "industry" | "framework" | "office" | "landing-page" | "site-configuration";
  capability: Capability;
  scope: CapabilityScope;
  marketCode: string;
};

const CAPABILITIES: Capability[] = ["view", "edit", "review", "publish"];
const TOPICS = [
  ["person", "People"],
  ["partner", "Partners"],
  ["platform", "Platforms"],
  ["publication", "Publications"],
  ["case-study", "Case studies"],
  ["industry", "Industries"],
  ["framework", "Frameworks"],
  ["office", "Offices"],
  ["landing-page", "Landing pages"],
  ["site-configuration", "Site configuration"],
] as const;

function grantId(grant: CapabilityGrant) {
  return `${grant.topic}/${grant.capability}/${grant.scope}/${grant.marketCode}`;
}

function grantPrerequisites(capability: Capability): Capability[] {
  if (capability === "edit" || capability === "review") return ["view"];
  if (capability === "publish") return ["view", "review"];
  return [];
}

function grantDependents(capability: Capability): Capability[] {
  if (capability === "view") return ["edit", "review", "publish"];
  if (capability === "review") return ["publish"];
  return [];
}

function legacyProjection(user: User, marketCodes: readonly string[]): CapabilityGrant[] {
  const capabilities: Capability[] = user.role === "viewer"
    ? ["view"]
    : user.role === "editor"
      ? ["view", "edit", "review"]
      : CAPABILITIES;
  return TOPICS.flatMap(([topic]) =>
    capabilities.flatMap((capability) =>
      (["regional", "shared"] as const).flatMap((scope) =>
        marketCodes.map((marketCode) => ({ topic, capability, scope, marketCode }))),
    ),
  );
}

function legacyEffectiveMarkets(user: User): string[] {
  // Administrator role is not content authority. Before an administrator is
  // explicitly configured, only this durable 0040 snapshot describes its
  // compatibility geography; assigned markets remain a separate admin field.
  return user.role === "administrator"
    ? user.legacyAdministratorMarketCodes
    : user.marketCodes;
}

/**
 * The current API exposes the delivery channel and newer API responses may
 * expose a durable delivery state. Keep both visible without claiming that a
 * channel alone is proof of provider acceptance.
 */
export function describeDeliveryReceipt(receipt: DeliveryReceipt | null | undefined) {
  if (!receipt) return "Not sent";
  const state = receipt.deliveryStatus ?? receipt.deliveryState ?? receipt.status;
  if (state) {
    return state.replace(/[-_]/g, " ");
  }
  return receipt.delivery ? `${receipt.delivery} requested` : "Delivery status unavailable";
}

function createIdempotencyKey(scope: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${scope}-${crypto.randomUUID()}`;
  }
  return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function deliveryStatusLabel(status: string | null | undefined) {
  return status ? status.replace(/[-_]/g, " ") : "pending";
}

type DeliveryStatusPanelProps = {
  receipt: DeliveryReceipt;
  liveStatus?: AccessDeliveryStatus;
  isLoading: boolean;
  isError: boolean;
  retryReady: boolean;
  retryPending: boolean;
  onRetry: () => void;
};

function DeliveryStatusPanel({
  receipt,
  liveStatus,
  isLoading,
  isError,
  retryReady,
  retryPending,
  onRetry,
}: DeliveryStatusPanelProps) {
  const status = liveStatus?.status ?? receipt.deliveryStatus ?? receipt.deliveryState ?? receipt.status;
  const isFailed = status === "failed";

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/60 p-4 text-sm" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">Live delivery status</span>
        <Badge variant={isFailed ? "destructive" : "secondary"} className="font-mono text-[10px] uppercase">
          {deliveryStatusLabel(status)}
        </Badge>
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Checking the delivery worker…</p>}
      {isError && <p className="text-xs text-amber-700">Live status is temporarily unavailable. The original delivery receipt is still shown.</p>}
      {liveStatus && (
        <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div><dt className="inline font-medium">Attempts: </dt><dd className="inline">{liveStatus.attempts}</dd></div>
          <div><dt className="inline font-medium">Updated: </dt><dd className="inline">{new Date(liveStatus.updatedAt).toLocaleString()}</dd></div>
          {liveStatus.lastError && <div className="sm:col-span-2"><dt className="inline font-medium">Last error: </dt><dd className="inline">{liveStatus.lastError}</dd></div>}
        </dl>
      )}
      {isFailed && liveStatus?.retryAvailable && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={!retryReady || retryPending}>
          {retryPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {retryPending ? "Retrying delivery…" : retryReady ? "Retry delivery" : "Preparing retry…"}
        </Button>
      )}
    </div>
  );
}

export default function UserAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitationData, setInvitationData] = useState<UserInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetReceipt, setResetReceipt] = useState<PasswordReset | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [accessMarkets, setAccessMarkets] = useState<string[]>([]);
  const [accessGrants, setAccessGrants] = useState<CapabilityGrant[]>([]);
  const [matrixTouched, setMatrixTouched] = useState(false);
  const [dryRunReceipt, setDryRunReceipt] = useState<CapabilityMigrationDryRunReceipt | null>(null);
  const [matrixCapability, setMatrixCapability] = useState<Capability>("view");
  const [matrixScope, setMatrixScope] = useState<CapabilityScope>("regional");
  const [marketSearch, setMarketSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<UserRole | undefined>();
  const [userStatus, setUserStatus] = useState<UserStatus | undefined>();
  const [page, setPage] = useState(1);
  const [lockedUsers, setLockedUsers] = useState<Set<string>>(() => new Set());
  const inviteRequestKeyRef = useRef<string | null>(null);
  const invitePayloadRef = useRef<string | null>(null);
  const resetRequestKeyRef = useRef<string | null>(null);
  const retryDeliveryKeyRef = useRef<string | null>(null);

  const listParams = useMemo(() => ({
    page,
    pageSize: USER_PAGE_SIZE,
    search: userSearch.trim() || undefined,
    role: userRole,
    status: userStatus,
  }), [page, userRole, userSearch, userStatus]);
  const { data, isLoading, isError, error } = useListUsers(listParams, { query: { queryKey: getListUsersQueryKey(listParams) } });
  const { data: markets } = useListMarketEditions({ page: 1, pageSize: 100 });

  const inviteUser = useInviteUser({
    mutation: {
      mutationFn: ({ data }) => inviteUserRequest(data, {
        headers: inviteRequestKeyRef.current
          ? { "Idempotency-Key": inviteRequestKeyRef.current }
          : undefined,
      }),
    },
  });
  const resetUserPassword = useResetUserPassword({
    mutation: {
      mutationFn: ({ userId, data }) => resetUserPasswordRequest(userId, data, {
        headers: resetRequestKeyRef.current
          ? { "Idempotency-Key": resetRequestKeyRef.current }
          : undefined,
      }),
    },
  });
  const [retryDelivery, setRetryDelivery] = useState<{ userId: string; deliveryId: string; key: string } | null>(null);
  const retryAccessDelivery = useRetryAccessDelivery({
    mutation: {
      mutationFn: ({ userId, deliveryId }) => retryAccessDeliveryRequest(userId, deliveryId, {
        headers: retryDeliveryKeyRef.current
          ? { "Idempotency-Key": retryDeliveryKeyRef.current }
          : undefined,
      }),
    },
  });
  const updateUser = useUpdateUser();
  const dryRunCapabilityMigration = useDryRunUserCapabilityMigration();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "editor", marketCodes: [] }
  });
  const inviteRole = form.watch("role");
  const enabledMarkets = useMemo(
    () => {
      const query = marketSearch.trim().toLowerCase();
      return (markets?.items ?? []).filter((market) => market.enabled && (!query || `${market.code} ${market.displayName}`.toLowerCase().includes(query)));
    },
    [marketSearch, markets?.items],
  );

  const invitationDelivery = useGetAccessDeliveryStatus(
    invitationData?.user.id ?? "",
    invitationData?.deliveryId ?? "",
    {
      query: {
        queryKey: getGetAccessDeliveryStatusQueryKey(invitationData?.user.id ?? "", invitationData?.deliveryId ?? ""),
        enabled: Boolean(invitationData?.user.id && invitationData?.deliveryId),
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === undefined || status === "pending" ? 2000 : false;
        },
      },
    },
  );
  const resetDelivery = useGetAccessDeliveryStatus(
    resetUserId ?? "",
    resetReceipt?.deliveryId ?? "",
    {
      query: {
        queryKey: getGetAccessDeliveryStatusQueryKey(resetUserId ?? "", resetReceipt?.deliveryId ?? ""),
        enabled: Boolean(resetUserId && resetReceipt?.deliveryId),
        refetchInterval: (query) => {
          const status = query.state.data?.status;
          return status === undefined || status === "pending" ? 2000 : false;
        },
      },
    },
  );

  const setUserLock = (userId: string, locked: boolean) => {
    setLockedUsers((current) => {
      const next = new Set(current);
      if (locked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const isUserLocked = (userId: string) => lockedUsers.has(userId);
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const onSubmitInvite = (values: z.infer<typeof inviteSchema>) => {
    if (inviteUser.isPending) return;
    const payloadFingerprint = JSON.stringify(values);
    if (!inviteRequestKeyRef.current || invitePayloadRef.current !== payloadFingerprint) {
      inviteRequestKeyRef.current = createIdempotencyKey("invite");
      invitePayloadRef.current = payloadFingerprint;
    }
    setInviteError(null);
    inviteUser.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({ title: "User invited successfully" });
        setInvitationData(data);
        const retryKey = data.deliveryId ? createIdempotencyKey("delivery-retry") : null;
        retryDeliveryKeyRef.current = retryKey;
        setRetryDelivery(data.deliveryId && retryKey ? {
          userId: data.user.id,
          deliveryId: data.deliveryId,
          key: retryKey,
        } : null);
        invalidateUsers();
        form.reset();
      },
      onError: (err) => {
        const message = (err as any).error || "The invitation request may have completed. Retry with the same idempotency key.";
        setInviteError(message);
        toast({ title: "Failed to invite", description: message, variant: "destructive" });
      },
    });
  };

  const startNewInvitation = () => {
    setInvitationData(null);
    setInviteError(null);
    inviteRequestKeyRef.current = createIdempotencyKey("invite");
    invitePayloadRef.current = null;
    form.reset();
    setMarketSearch("");
  };

  const openInviteDialog = () => {
    if (invitationData || inviteError) {
      setIsInviteOpen(true);
      return;
    }
    startNewInvitation();
    setIsInviteOpen(true);
  };

  const openResetDialog = (userId: string) => {
    if (isUserLocked(userId)) return;
    if (resetUserId !== userId) {
      setResetReceipt(null);
      setResetError(null);
      resetRequestKeyRef.current = createIdempotencyKey("password-reset");
    } else if (!resetRequestKeyRef.current) {
      resetRequestKeyRef.current = createIdempotencyKey("password-reset");
    }
    setResetUserId(userId);
    setIsResetOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!resetUserId || isUserLocked(resetUserId)) return;
    const resetId = resetUserId;
    setUserLock(resetId, true);
    if (!resetRequestKeyRef.current) {
      resetRequestKeyRef.current = createIdempotencyKey("password-reset");
    }
    setResetError(null);
    try {
      const data = await resetUserPassword.mutateAsync({
        userId: resetId,
        data: {},
      });
      setResetReceipt(data);
      const retryKey = data.deliveryId ? createIdempotencyKey("delivery-retry") : null;
      retryDeliveryKeyRef.current = retryKey;
      setRetryDelivery(data.deliveryId && retryKey ? {
        userId: resetId,
        deliveryId: data.deliveryId,
        key: retryKey,
      } : null);
      toast({ title: "Reset link requested", description: "The delivery result is shown below. No credential is displayed." });
    } catch (err) {
      const message = (err as any).error || "The reset request may have completed. Retry with the same idempotency key.";
      setResetError(message);
      toast({ title: "Failed to reset password", description: message, variant: "destructive" });
    } finally {
      setUserLock(resetId, false);
    }
  };

  const handleRetryDelivery = (userId: string, deliveryId: string) => {
    if (retryAccessDelivery.isPending) return;
    if (!retryDelivery || retryDelivery.userId !== userId || retryDelivery.deliveryId !== deliveryId) return;
    retryDeliveryKeyRef.current = retryDelivery.key;
    retryAccessDelivery.mutate(
      { userId, deliveryId },
      {
        onSuccess: (status) => {
          const queryKey = getGetAccessDeliveryStatusQueryKey(userId, deliveryId);
          queryClient.setQueryData(queryKey, status);
          queryClient.invalidateQueries({ queryKey });
          const nextRetryKey = createIdempotencyKey("delivery-retry");
          retryDeliveryKeyRef.current = nextRetryKey;
          setRetryDelivery({ userId, deliveryId, key: nextRetryKey });
          toast({ title: "Delivery retry requested", description: "The live delivery status will update automatically." });
        },
        onError: (err) => {
          toast({
            title: "Delivery retry failed",
            description: (err as any).error || "The retry result is uncertain. Try again with the same idempotency key.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleRoleChange = async (user: User, role: User["role"]) => {
    if (isUserLocked(user.id)) return;
    setUserLock(user.id, true);
    try {
      await updateUser.mutateAsync({ userId: user.id, data: { role } });
      toast({ title: "Role updated" });
      invalidateUsers();
    } catch (err) {
      toast({ title: "Update failed", description: (err as any).error, variant: "destructive" });
    } finally {
      setUserLock(user.id, false);
    }
  };

  const saveMarketAccess = async () => {
    if (!accessUser || isUserLocked(accessUser.id)) return;
    const userId = accessUser.id;
    setUserLock(userId, true);
    try {
      await updateUser.mutateAsync({
        userId: accessUser.id,
        data: {
          marketCodes: accessMarkets,
          ...(accessUser.capabilityMatrixConfigured || matrixTouched
            ? { capabilityGrants: accessGrants }
            : {}),
        },
      });
      toast({ title: "Central access matrix updated" });
      setAccessUser(null);
      invalidateUsers();
    } catch (err) {
      toast({ title: "Update failed", description: (err as any).error, variant: "destructive" });
    } finally {
      setUserLock(userId, false);
    }
  };

  const recordCapabilityDryRun = async () => {
    if (!accessUser || isUserLocked(accessUser.id)) return;
    setUserLock(accessUser.id, true);
    try {
      const receipt = await dryRunCapabilityMigration.mutateAsync({
        userId: accessUser.id,
        data: { capabilityGrants: accessGrants },
      });
      setDryRunReceipt(receipt);
      toast({
        title: "Dry run recorded",
        description: "No user access, market, workflow, or live content was changed.",
      });
    } catch (err) {
      toast({ title: "Dry run failed", description: (err as any).error, variant: "destructive" });
    } finally {
      setUserLock(accessUser.id, false);
    }
  };

  const hasAccessGrant = (topic: CapabilityGrant["topic"], capability: Capability, scope: CapabilityScope, marketCode: string) =>
    accessGrants.some((grant) => grantId(grant) === grantId({ topic, capability, scope, marketCode }));

  const setAccessGrant = (
    topic: CapabilityGrant["topic"],
    capability: Capability,
    scope: CapabilityScope,
    marketCode: string,
    checked: boolean,
  ) => {
    setMatrixTouched(true);
    const target = { topic, capability, scope, marketCode };
    setAccessGrants((current) => {
      if (checked) {
        const additions = [target, ...grantPrerequisites(capability).map((required) => ({ ...target, capability: required }))];
        return [...current, ...additions.filter((grant) => !current.some((existing) => grantId(existing) === grantId(grant)))];
      }
      const removed = new Set([
        grantId(target),
        ...grantDependents(capability).map((dependent) => grantId({ ...target, capability: dependent })),
      ]);
      return current.filter((grant) => !removed.has(grantId(grant)));
    });
  };

  const setMatrixRow = (topic: CapabilityGrant["topic"], checked: boolean) => {
    accessMarkets.forEach((marketCode) => setAccessGrant(topic, matrixCapability, matrixScope, marketCode, checked));
  };

  const setMatrixColumn = (marketCode: string, checked: boolean) => {
    TOPICS.forEach(([topic]) => setAccessGrant(topic, matrixCapability, matrixScope, marketCode, checked));
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    if (isUserLocked(userId)) return;
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    setUserLock(userId, true);
    try {
      await updateUser.mutateAsync({ userId, data: { status: newStatus as any } });
      toast({ title: `User ${newStatus}` });
      invalidateUsers();
    } catch (err) {
      toast({ title: "Update failed", description: (err as any).error, variant: "destructive" });
    } finally {
      setUserLock(userId, false);
    }
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
        <Button onClick={openInviteDialog} className="gap-2 font-mono uppercase tracking-wider text-xs">
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/20 p-4">
          <Input
            aria-label="Search users"
            placeholder="Search name or email…"
            value={userSearch}
            onChange={(event) => {
              setUserSearch(event.target.value);
              setPage(1);
            }}
            className="w-full min-w-56 max-w-sm bg-background"
          />
          <Select value={userRole ?? "all"} onValueChange={(value) => { setUserRole(value === "all" ? undefined : value as UserRole); setPage(1); }}>
            <SelectTrigger aria-label="Filter users by role" className="w-[170px] bg-background">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="publisher">Publisher</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userStatus ?? "all"} onValueChange={(value) => { setUserStatus(value === "all" ? undefined : value as UserStatus); setPage(1); }}>
            <SelectTrigger aria-label="Filter users by status" className="w-[170px] bg-background">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                         <Select value={user.role} onValueChange={(role) => handleRoleChange(user, role as User["role"])} disabled={isUserLocked(user.id)}>
                        <SelectTrigger className="h-8 w-36 font-mono text-[10px] uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="publisher">Publisher</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                        {user.role === "administrator" && !user.capabilityMatrixConfigured
                          ? user.legacyAdministratorMarketCodes.length
                            ? `LEGACY: ${user.legacyAdministratorMarketCodes.join(", ").toUpperCase()}`
                            : "LEGACY: NO FROZEN MARKETS"
                          : user.marketCodes.length
                          ? user.marketCodes.join(", ").toUpperCase()
                          : "NO MARKETS"}
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
                           <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/10 hover:text-accent" aria-label={`Actions for ${user.name}`} disabled={isUserLocked(user.id)}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-mono text-xs">
                           <DropdownMenuItem onClick={() => openResetDialog(user.id)} disabled={isUserLocked(user.id)}>
                            <KeyRound className="w-3.5 h-3.5 mr-2" /> Reset Password
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => {
                              const compatibilityMarkets = legacyEffectiveMarkets(user);
                             setAccessUser(user);
                              setAccessMarkets(user.capabilityMatrixConfigured ? user.marketCodes : compatibilityMarkets);
                              setAccessGrants(user.capabilityMatrixConfigured
                                ? (user.capabilityGrants ?? []) as CapabilityGrant[]
                                : legacyProjection(user, compatibilityMarkets));
                             setMatrixTouched(false);
                             setMatrixCapability("view");
                             setMatrixScope("regional");
                             setDryRunReceipt(null);
                             setMarketSearch("");
                           }} disabled={isUserLocked(user.id)}>
                             <Settings2 className="w-3.5 h-3.5 mr-2" /> Edit Content Access
                          </DropdownMenuItem>
                           <DropdownMenuItem
                             onClick={() => handleToggleStatus(user.id, user.status)}
                             disabled={isUserLocked(user.id)}
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
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/10 p-4 text-sm font-mono text-muted-foreground">
            <span>
              Showing {((page - 1) * USER_PAGE_SIZE) + 1}–{Math.min(page * USER_PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isInviteOpen} onOpenChange={(open) => {
        if (!open) {
          if (inviteUser.isPending) return;
          setIsInviteOpen(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{invitationData ? "Invitation Created" : "Invite New User"}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {invitationData
                ? "The invitation request completed. Review the delivery channel and status before closing."
                : "Create a user account and deliver a secure one-time invitation link by email."}
            </DialogDescription>
          </DialogHeader>

          {invitationData ? (
            <div className="space-y-4 pt-4">
              <div className="bg-emerald-500/10 p-4 rounded-md border border-emerald-500/20 text-sm text-emerald-700">
                <p className="font-medium">Invitation created</p>
                <p className="mt-1">Delivery status: {describeDeliveryReceipt(invitationData)}</p>
                <p className="mt-1 text-xs">No credential is shown or stored here.</p>
              </div>
              {invitationData.deliveryId && (
                <DeliveryStatusPanel
                  receipt={invitationData}
                  liveStatus={invitationDelivery.data}
                  isLoading={invitationDelivery.isLoading}
                  isError={invitationDelivery.isError}
                  retryReady={retryDelivery?.userId === invitationData.user.id && retryDelivery.deliveryId === invitationData.deliveryId}
                  retryPending={retryAccessDelivery.isPending}
                  onRetry={() => handleRetryDelivery(invitationData.user.id, invitationData.deliveryId!)}
                />
              )}
              <p className="text-[10px] text-muted-foreground font-mono text-center">
                Valid until {format(new Date(invitationData.expiresAt), "MMM d, yyyy HH:mm")}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={startNewInvitation}>Invite another user</Button>
                <Button onClick={() => setIsInviteOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInvite)} className="space-y-4 pt-4">
                {inviteError && (
                  <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                    {inviteError} Retry with the same request key to safely recover an uncertain result.
                  </p>
                )}
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
                      <Input
                        aria-label="Search market access"
                        placeholder="Filter markets…"
                        value={marketSearch}
                        onChange={(event) => setMarketSearch(event.target.value)}
                        className="mb-2"
                      />
                      <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                        {enabledMarkets.map((market) => (
                          <label key={market.code} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={field.value.includes(market.code)}
                              onChange={(event) => field.onChange(event.target.checked ? [...field.value, market.code] : field.value.filter((code) => code !== market.code))} />
                            {market.displayName}
                          </label>
                        ))}
                        {enabledMarkets.length === 0 && <p className="col-span-2 text-xs text-muted-foreground">No enabled markets match this search.</p>}
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
                  <Button variant="ghost" type="button" onClick={() => setIsInviteOpen(false)} disabled={inviteUser.isPending}>Cancel</Button>
                  <Button type="submit" disabled={inviteUser.isPending}>
                    {inviteUser.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {inviteError ? "Retry Invitation" : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isResetOpen} onOpenChange={(open) => {
        if (!open) {
          if (resetUserPassword.isPending) return;
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
              {resetUserPassword.isPending && (
                <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground" role="status">
                  Sending the reset link… Keep this dialog open until the delivery result is available.
                </p>
              )}
              {resetReceipt ? (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700" role="status">
                  <p className="font-medium">Reset delivery requested</p>
                  <p className="mt-1">Delivery status: {describeDeliveryReceipt(resetReceipt)}</p>
                  <p className="mt-1 text-xs">Valid until {format(new Date(resetReceipt.expiresAt), "MMM d, yyyy HH:mm")}. No credential is shown or stored here.</p>
                </div>
              ) : (
                <>
                  {resetError && (
                    <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                      {resetError} Retry with the same request key to safely recover an uncertain result.
                    </p>
                  )}
                  <p className="text-sm text-foreground">Are you sure you want to send a reset link to this user?</p>
                </>
              )}
              {resetReceipt?.deliveryId && (
                <DeliveryStatusPanel
                  receipt={resetReceipt}
                  liveStatus={resetDelivery.data}
                  isLoading={resetDelivery.isLoading}
                  isError={resetDelivery.isError}
                  retryReady={retryDelivery?.userId === resetUserId && retryDelivery.deliveryId === resetReceipt.deliveryId}
                  retryPending={retryAccessDelivery.isPending}
                  onRetry={() => handleRetryDelivery(resetUserId!, resetReceipt.deliveryId!)}
                />
              )}
              <DialogFooter className="pt-4">
                <Button variant="ghost" type="button" onClick={() => setIsResetOpen(false)} disabled={resetUserPassword.isPending}>Done</Button>
                <Button onClick={handleConfirmReset} disabled={resetUserPassword.isPending || Boolean(resetReceipt)}>
                  {resetUserPassword.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  {resetReceipt ? "Sent" : resetError ? "Retry Reset Link" : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(accessUser)} onOpenChange={(open) => {
        if (!open) {
          if (accessUser && isUserLocked(accessUser.id)) return;
          setAccessUser(null);
          setMarketSearch("");
        }
      }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Central content access</DialogTitle>
            <DialogDescription>
              Set topic × geography authority for {accessUser?.name}. The matrix is the sole content-access control.
              {accessUser?.capabilityMatrixConfigured
                ? " This configured matrix is deny-all outside checked cells, including when no cells are checked."
                : accessUser?.role === "administrator"
                  ? " This legacy administrator is limited to its read-only frozen market snapshot until you change and save the matrix; the role itself grants no blanket content access."
                  : " This account is in legacy role and market compatibility mode until you change and save the matrix."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <section aria-labelledby="assigned-geographies">
              <h3 id="assigned-geographies" className="mb-2 text-sm font-medium">Matrix geographies</h3>
              {accessUser?.role === "administrator" && !accessUser.capabilityMatrixConfigured && (
                <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted-foreground">
                  Frozen legacy scope: {accessUser.legacyAdministratorMarketCodes.length
                    ? accessUser.legacyAdministratorMarketCodes.map((code) => code.toUpperCase()).join(", ")
                    : "none"}. This read-only snapshot is the current compatibility boundary; newly enabled markets are not included. Saving a matrix makes only checked cells authoritative.
                </p>
              )}
            <Input
              aria-label="Search market access"
              placeholder="Filter markets…"
              value={marketSearch}
              onChange={(event) => setMarketSearch(event.target.value)}
              className="mb-2"
              disabled={Boolean(accessUser && isUserLocked(accessUser.id))}
            />
            <div className="grid grid-cols-2 gap-2">
            {enabledMarkets.map((market) => (
              <label key={market.code} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <input type="checkbox" checked={accessMarkets.includes(market.code)}
                  onChange={(event) => {
                    // A legacy geography edit is an explicit migration: retain
                    // the frozen projection and persist the revised allow-list.
                    if (!accessUser?.capabilityMatrixConfigured) setMatrixTouched(true);
                    setAccessMarkets(event.target.checked
                      ? [...accessMarkets, market.code]
                      : accessMarkets.filter((code) => code !== market.code));
                  }} />
                {market.displayName}
              </label>
            ))}
            {enabledMarkets.length === 0 && <p className="col-span-2 text-xs text-muted-foreground">No enabled markets match this search.</p>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Changing matrix geographies does not enable a market or change live content. A checked capability must belong to a selected geography.</p>
            </section>
            <section aria-labelledby="capability-matrix">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 id="capability-matrix" className="text-sm font-medium">Capability matrix</h3>
                  <p className="text-xs text-muted-foreground">View is required for Edit and Review; Publish also requires Review. Removing a prerequisite clears dependent rights.</p>
                </div>
                <div className="flex gap-2" role="group" aria-label="Capability">
                  {CAPABILITIES.map((capability) => (
                    <Button key={capability} type="button" size="sm" variant={matrixCapability === capability ? "default" : "outline"}
                      onClick={() => setMatrixCapability(capability)}>
                      {capability}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-2" role="group" aria-label="Authority scope">
                <Button type="button" size="sm" variant={matrixScope === "regional" ? "secondary" : "outline"} onClick={() => setMatrixScope("regional")}>Regional versions</Button>
                <Button type="button" size="sm" variant={matrixScope === "shared" ? "secondary" : "outline"} onClick={() => setMatrixScope("shared")}>Shared sources</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {matrixScope === "shared"
                  ? "Shared authority is separate from regional authority. A shared operation also requires the same right in every affected regional destination."
                  : "Regional authority applies only to the selected geography and never broadens shared-source authority."}
              </p>
              <div className="mt-3 max-h-[340px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead className="min-w-48">Topic</TableHead>
                      {accessMarkets.map((marketCode) => (
                        <TableHead key={marketCode} className="min-w-28 text-center">
                          <label className="flex cursor-pointer flex-col items-center gap-1 text-[10px] font-mono uppercase">
                            <span>{marketCode}</span>
                            <input aria-label={`Select all ${matrixCapability} rights for ${marketCode}`}
                              type="checkbox"
                              checked={TOPICS.every(([topic]) => hasAccessGrant(topic, matrixCapability, matrixScope, marketCode))}
                              onChange={(event) => setMatrixColumn(marketCode, event.target.checked)} />
                            <span className="normal-case">all topics</span>
                          </label>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TOPICS.map(([topic, label]) => (
                      <TableRow key={topic}>
                        <TableCell>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input aria-label={`Select ${matrixCapability} for all assigned geographies in ${label}`}
                              type="checkbox"
                              checked={accessMarkets.length > 0 && accessMarkets.every((marketCode) => hasAccessGrant(topic, matrixCapability, matrixScope, marketCode))}
                              onChange={(event) => setMatrixRow(topic, event.target.checked)} />
                            {label}
                          </label>
                        </TableCell>
                        {accessMarkets.map((marketCode) => (
                          <TableCell key={marketCode} className="text-center">
                            <input type="checkbox" aria-label={`${matrixCapability} ${label} in ${marketCode}`}
                              checked={hasAccessGrant(topic, matrixCapability, matrixScope, marketCode)}
                              onChange={(event) => setAccessGrant(topic, matrixCapability, matrixScope, marketCode, event.target.checked)} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {!accessMarkets.length && (
                      <TableRow><TableCell colSpan={1} className="py-6 text-center text-sm text-muted-foreground">Assign one or more enabled geographies before granting rights.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                Effective rights: {accessUser?.capabilityMatrixConfigured || matrixTouched
                  ? accessGrants.length
                    ? `${accessGrants.length} explicit grant${accessGrants.length === 1 ? "" : "s"}; all unlisted rights are denied.`
                    : "Configured deny-all: no content topic, capability, or geography is allowed."
                  : accessUser?.role === "administrator"
                    ? `Legacy administrator compatibility rights across ${accessMarkets.length || "no"} frozen geograph${accessMarkets.length === 1 ? "y" : "ies"}; no role-wide or newly enabled-market authority is advertised.`
                    : `Legacy ${accessUser?.role ?? "user"} rights across ${accessMarkets.length || "no"} assigned geograph${accessMarkets.length === 1 ? "y" : "ies"}.`}
              </p>
              {dryRunReceipt && (
                <p className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-700" role="status">
                  Dry-run receipt {dryRunReceipt.id} recorded {format(new Date(dryRunReceipt.createdAt), "MMM d, yyyy HH:mm")}. It captured before/after effective-rights snapshots and made no persistent access change.
                </p>
              )}
            </section>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAccessUser(null)} disabled={Boolean(accessUser && isUserLocked(accessUser.id))}>Cancel</Button>
            <Button variant="outline" onClick={recordCapabilityDryRun} disabled={Boolean(accessUser && isUserLocked(accessUser.id)) || dryRunCapabilityMigration.isPending}>
              {dryRunCapabilityMigration.isPending ? "Recording dry run…" : "Record dry run"}
            </Button>
            <Button onClick={saveMarketAccess} disabled={Boolean(accessUser && isUserLocked(accessUser.id))}>Save Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}