"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "@/lib/api/notifications";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Loader2,
  Mail,
  Smartphone,
  AppWindow,
  BellRing,
  Info,
  Route,
  ShieldAlert,
  Wrench,
  Target,
  Plus,
  Trash2,
  ExternalLink,
  SlidersHorizontal,
  Users,
  CalendarClock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermission } from "@/hooks/usePermission";
import { UpgradeGate } from "@/components/shared/UpgradeGate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invalidateNotificationInbox } from "@/hooks/useRealtimeNotifications";

const todayIso = () => new Date().toISOString().slice(0, 10);

const getUserName = (user: any) =>
  user?.attributes?.full_name ||
  user?.name ||
  [user?.f_name, user?.l_name].filter(Boolean).join(" ") ||
  "User";
const getGroupMembers = (group: any) =>
  group?.members || group?.relationships?.users?.data || [];
const getRuleCode = (rule: any) =>
  rule?.notification_type?.code ||
  rule?.notificationType?.code ||
  rule?.event_type ||
  `Type #${rule?.notification_type_id}`;
const getRuleChannels = (rule: any) =>
  rule?.enabled_channels || rule?.channel_types || [];
const isRuleEnabled = (rule: any) =>
  rule?.is_enabled ?? rule?.is_active ?? false;
const getDelegationTarget = (delegation: any) =>
  delegation?.delegate_user || delegation?.relationships?.delegated_to?.data;
const getDelegationTypes = (delegation: any) =>
  delegation?.notification_type_ids?.map((id: number) => `#${id}`) ||
  delegation?.event_types || ["All types"];
const getNotificationTitle = (notification: api.Notification) => {
  const data = notification.attributes.data;
  return (
    notification.attributes.subject ||
    (typeof data.message === "string" ? data.message : null) ||
    notification.attributes.type.replace(/[_-]/g, " ")
  );
};
const getNotificationBody = (notification: api.Notification) => {
  const data = notification.attributes.data;
  return (
    notification.attributes.body ||
    (typeof data.description === "string" ? data.description : null) ||
    "A new fleet event was recorded."
  );
};
const getActionUrl = (notification: api.Notification) => {
  const value =
    notification.attributes.data.action_url || notification.attributes.data.url;
  return typeof value === "string" ? value : null;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { hasCapability } = useSubscription();
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState("inbox");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    notification_type_id: "",
    is_enabled: true,
    channel_types: ["in_app"],
    recipient_groups: [],
    recipient_roles: [],
    recipient_users: [],
    notification_type_ids: [],
    name: "",
    description: "",
    user_ids: [],
    initial_user_id: "",
    delegate_user_id: "",
    start_date: todayIso(),
    end_date: "",
    reason: "",
  });

  const isAdvancedUser =
    can("notifications:configure") &&
    (hasCapability("notification_routing") ||
      hasCapability("notification_groups") ||
      hasCapability("notification_delegation"));

  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const {
    data: inboxData,
    isLoading: isLoadingInbox,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications-inbox"],
    queryFn: ({ pageParam = 1 }) =>
      api.getInbox({ page: pageParam, per_page: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.data.pagination;
      return current_page < last_page ? current_page + 1 : undefined;
    },
  });

  const notifications =
    inboxData?.pages.flatMap((p) => p.data.notifications) ?? [];

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: prefData, isLoading: isLoadingPref } = useQuery({
    queryKey: ["notifications-prefs"],
    queryFn: api.getPreferences,
  });

  // Advanced Data
  const { data: rulesData, isLoading: isLoadingRules } = useQuery({
    queryKey: ["notification-rules"],
    queryFn: api.getRules,
    enabled: activeTab === "rules",
  });

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["notification-groups"],
    queryFn: api.getGroups,
    enabled: activeTab === "rules" || activeTab === "groups",
  });

  const { data: delegationsData, isLoading: isLoadingDelegations } = useQuery({
    queryKey: ["notification-delegations"],
    queryFn: api.getDelegations,
    enabled: activeTab === "delegations",
  });

  const { data: userData } = useQuery({
    queryKey: ["users-list-simple"],
    queryFn: () =>
      import("@/lib/api/settings").then((api) =>
        api.getUsers({ per_page: 100 }),
      ),
    enabled:
      isAdvancedUser && ["rules", "groups", "delegations"].includes(activeTab),
  });

  const { data: channelData } = useQuery({
    queryKey: ["channel-availability"],
    queryFn: api.getChannelAvailability,
    enabled: activeTab === "preferences" || activeTab === "rules",
  });

  const { data: notificationTypes } = useQuery({
    queryKey: ["notification-types"],
    queryFn: () => api.getNotificationTypes({ configurable: true }),
    enabled: activeTab === "rules" || activeTab === "delegations",
  });

  const { data: rolesData } = useQuery({
    queryKey: ["settings-roles-simple"],
    queryFn: () => import("@/lib/api/settings").then((api) => api.getRoles()),
    enabled: activeTab === "rules",
  });

  const markReadMutation = useMutation({
    mutationFn: api.markAsRead,
    onSuccess: () => {
      invalidateNotificationInbox(queryClient);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: api.markAllAsRead,
    onSuccess: () => {
      invalidateNotificationInbox(queryClient);
      toast.success("All messages marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteNotification,
    onSuccess: () => {
      invalidateNotificationInbox(queryClient);
      toast.success("Notification removed");
    },
    onError: () => toast.error("Failed to remove notification"),
  });

  const prefMutation = useMutation({
    mutationFn: api.updatePreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-prefs"] });
      toast.success("Preferences updated");
    },
    onError: () => toast.error("Failed to update preference"),
  });

  const createRuleMutation = useMutation({
    mutationFn: api.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Routing rule created");
      handleClose();
    },
    onError: () => toast.error("Failed to create rule"),
  });

  const createGroupMutation = useMutation({
    mutationFn: api.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      toast.success("Notification group created");
      handleClose();
    },
    onError: () => toast.error("Failed to create group"),
  });

  const createDelegationMutation = useMutation({
    mutationFn: api.createDelegation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-delegations"] });
      toast.success("Delegation assigned");
      handleClose();
    },
    onError: () => toast.error("Failed to assign delegation"),
  });

  const endDelegationMutation = useMutation({
    mutationFn: api.endDelegation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-delegations"] });
      toast.success("Delegation ended");
    },
    onError: () => toast.error("Failed to end delegation"),
  });

  const handleClose = () => {
    setIsCreateOpen(false);
    setFormData({
      notification_type_id: "",
      is_enabled: true,
      channel_types: ["in_app"],
      recipient_groups: [],
      recipient_roles: [],
      recipient_users: [],
      notification_type_ids: [],
      name: "",
      description: "",
      user_ids: [],
      initial_user_id: "",
      delegate_user_id: "",
      start_date: todayIso(),
      end_date: "",
      reason: "",
    });
  };

  const handleSave = () => {
    if (activeTab === "rules") {
      if (!formData.notification_type_id)
        return toast.error("Please select a notification type");
      createRuleMutation.mutate({
        notification_type_id: parseInt(formData.notification_type_id),
        is_enabled: formData.is_enabled,
        enabled_channels: formData.channel_types,
        recipient_group_ids: formData.recipient_groups,
        recipient_roles: formData.recipient_roles,
        recipient_user_ids: formData.recipient_users,
      });
    } else if (activeTab === "groups") {
      if (!formData.name) return toast.error("Group name is required");
      createGroupMutation.mutate({
        name: formData.name,
        description: formData.description,
        user_ids: formData.user_ids,
      });
    } else {
      if (
        !formData.initial_user_id ||
        !formData.delegate_user_id ||
        !formData.start_date
      )
        return toast.error("Source, recipient, and start date are required");
      createDelegationMutation.mutate({
        initial_user_id: formData.initial_user_id,
        delegate_user_id: formData.delegate_user_id,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        notification_type_ids: formData.notification_type_ids,
        reason: formData.reason,
      });
    }
  };

  const getIcon = (type: string) => {
    if (type.includes("trip"))
      return <Route className="w-5 h-5 text-indigo-500" />;
    if (type.includes("incident") || type.includes("anomaly"))
      return <ShieldAlert className="w-5 h-5 text-rose-500" />;
    if (type.includes("maintenance"))
      return <Wrench className="w-5 h-5 text-amber-500" />;
    if (type.includes("geofence"))
      return <Target className="w-5 h-5 text-emerald-500" />;
    return <Info className="w-5 h-5 text-sky-500" />;
  };

  const channels = prefData?.data?.channels || {
    email: false,
    sms: false,
    push: false,
    in_app: false,
  };

  const handleToggleChannel = (
    channel: keyof api.ChannelAvailability,
    enabled: boolean,
  ) => {
    const newChannels = { ...channels, [channel]: enabled };
    prefMutation.mutate(newChannels);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-20 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">
            <BellRing className="h-3.5 w-3.5" />
            Signal hub
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Notifications Center
          </h1>
          <p className="text-slate-500 mt-1">
            A clean stream for alerts, preferences, and routing.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right sm:min-w-56">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Unread
            </p>
            <p className="text-2xl font-black text-slate-900">
              {notifications.filter((item) => !item.attributes.is_read).length}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Loaded
            </p>
            <p className="text-2xl font-black text-emerald-700">
              {notifications.length}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className=" rounded-2xl border border-slate-200 bg-white  h-auto! shadow-sm p-2">
          <TabsTrigger
            value="inbox"
            className=" gap-2 rounded-xl px-4 py-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Bell className="w-4 h-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="py-1 gap-2 rounded-xl px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <SlidersHorizontal className="w-4 h-4" /> Channels
          </TabsTrigger>
          {isAdvancedUser && (
            <>
              <TabsTrigger
                value="rules"
                className="py-1 gap-2 rounded-xl px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Target className="w-4 h-4" /> Rules
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="py-1 gap-2 rounded-xl px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Users className="w-4 h-4" /> Groups
              </TabsTrigger>
              <TabsTrigger
                value="delegations"
                className="py-1 gap-2 rounded-xl px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <CalendarClock className="w-4 h-4" /> Delegations
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="inbox" className="mt-6">
          <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base font-black text-slate-900">
                Recent Activity
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl bg-white text-xs font-black"
                onClick={() => markAllReadMutation.mutate()}
                disabled={
                  markAllReadMutation.isPending || !notifications.length
                }
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-2 text-emerald-600" />
                )}
                Mark all as read
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingInbox ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                </div>
              ) : !notifications.length ? (
                <div className="py-24 text-center text-slate-500">
                  <BellRing className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="font-medium text-slate-400">
                    Everything clear!
                  </p>
                  <p className="text-xs text-slate-300">
                    You don&apos;t have any unread notifications.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 bg-slate-50/60 p-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group flex gap-4 rounded-2xl border p-4 transition-colors ${!notification.attributes.is_read ? "border-indigo-100 bg-white shadow-sm shadow-indigo-100/40" : "border-slate-100 bg-white/80 hover:bg-white"}`}
                      onClick={() => {
                        if (!notification.attributes.is_read)
                          markReadMutation.mutate(notification.id);
                      }}
                    >
                      <div className="shrink-0 mt-1">
                        {getIcon(notification.attributes.type)}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <p
                            className={`text-sm capitalize ${!notification.attributes.is_read ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}
                          >
                            {getNotificationTitle(notification)}
                          </p>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {formatDistanceToNow(
                              new Date(notification.attributes.created_at),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {getNotificationBody(notification)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {getActionUrl(notification) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-indigo-600"
                            onClick={(event) => {
                              event.stopPropagation();
                              window.location.href = getActionUrl(
                                notification,
                              ) as string;
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteMutation.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {!notification.attributes.is_read && (
                          <div className="ml-1 h-2 w-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="py-4 flex justify-center">
                    {isFetchingNextPage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                    ) : hasNextPage ? (
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                        Scroll for more
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-200 font-bold uppercase tracking-widest">
                        All caught up
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                My Delivery Channels
              </CardTitle>
              <CardDescription>
                Select which platforms should receive your activity alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingPref ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      id: "in_app",
                      label: "In-App Desktop",
                      icon: BellRing,
                      desc: "Real-time alerts within the portal interface.",
                    },
                    {
                      id: "email",
                      label: "Email Reports",
                      icon: Mail,
                      desc: "Daily and emergency updates to your inbox.",
                    },
                    {
                      id: "sms",
                      label: "SMS Messages",
                      icon: Smartphone,
                      desc: "High-priority push text for critical events.",
                    },
                    {
                      id: "push",
                      label: "Mobile Push",
                      icon: AppWindow,
                      desc: "Mobile app notifications for on-the-go tracking.",
                    },
                  ].map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-white shadow-sm border border-slate-100 text-slate-600">
                          <channel.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {channel.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {channel.desc}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={
                          channels[channel.id as keyof api.ChannelAvailability]
                        }
                        onCheckedChange={(v) =>
                          handleToggleChannel(
                            channel.id as keyof api.ChannelAvailability,
                            v,
                          )
                        }
                        disabled={prefMutation.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdvancedUser && (
          <TabsContent value="rules" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Routing Rules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Route notification types to roles, users, groups, and
                    channels.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-black border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Rule
                </Button>
              </div>
              <UpgradeGate
                module="notification_routing"
                featureName="Operational Routing"
                requiredPlan="growth"
                description="Configure complex notification routing rules to ensure the right people are notified at the right time."
              >
                <Card className="shadow-none border-slate-200">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                        <TableRow>
                          <TableHead>Event Code</TableHead>
                          <TableHead>Target Groups</TableHead>
                          <TableHead>Channels</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingRules ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
                            </TableCell>
                          </TableRow>
                        ) : (
                          rulesData?.data?.rules?.map((rule) => (
                            <TableRow key={rule.id} className="text-sm">
                              <TableCell className="font-mono text-[11px] font-semibold text-slate-700">
                                {getRuleCode(rule)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(
                                    rule.recipient_group_ids ||
                                    rule.relationships?.recipient_groups?.data?.map(
                                      (g) => g.id,
                                    ) ||
                                    []
                                  ).map((groupId) => (
                                    <Badge
                                      key={groupId}
                                      variant="secondary"
                                      className="bg-slate-100 text-slate-600 border-none font-normal text-[10px]"
                                    >
                                      Group {groupId}
                                    </Badge>
                                  ))}
                                  {!rule.recipient_group_ids?.length &&
                                    !rule.relationships?.recipient_groups?.data
                                      ?.length && (
                                      <span className="text-xs text-slate-400">
                                        Roles/users
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {getRuleChannels(rule).map((c: string) => (
                                    <span
                                      key={c}
                                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold uppercase"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  className={
                                    isRuleEnabled(rule)
                                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                                      : "bg-slate-50 text-slate-400 border-slate-100"
                                  }
                                >
                                  {isRuleEnabled(rule) ? "Active" : "Muted"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {rulesData?.data?.rules?.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-32 text-center text-slate-400 text-sm italic"
                            >
                              No routing rules defined.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </UpgradeGate>
            </div>
          </TabsContent>
        )}

        {isAdvancedUser && (
          <TabsContent value="groups" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Notification Groups
                  </h2>
                  <p className="text-xs text-slate-500">
                    Create reusable recipient groups for operational alerts.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-black border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Group
                </Button>
              </div>
              <UpgradeGate
                module="notification_groups"
                featureName="Notification Groups"
                requiredPlan="growth"
                description="Create and manage user groups for targeted notification delivery."
              >
                <Card className="shadow-none border-slate-200">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                        <TableRow>
                          <TableHead>Cluster Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingGroups ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
                            </TableCell>
                          </TableRow>
                        ) : (
                          groupsData?.data?.groups?.map((group) => (
                            <TableRow key={group.id} className="text-sm">
                              <TableCell className="font-bold text-slate-900">
                                {group.name}
                              </TableCell>
                              <TableCell className="text-slate-500 line-clamp-1 max-w-[200px]">
                                {group.description || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex -space-x-2">
                                  {getGroupMembers(group)
                                    .slice(0, 4)
                                    .map((u: any) => (
                                      <div
                                        key={u.id}
                                        className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold"
                                        title={getUserName(u)}
                                      >
                                        {getUserName(u).charAt(0)}
                                      </div>
                                    ))}
                                  {getGroupMembers(group).length > 4 && (
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-indigo-600">
                                      +{getGroupMembers(group).length - 4}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold"
                                >
                                  Manage
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {groupsData?.data?.groups?.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-32 text-center text-slate-400 text-sm italic"
                            >
                              No user groups found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </UpgradeGate>
            </div>
          </TabsContent>
        )}

        {isAdvancedUser && (
          <TabsContent value="delegations" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Delegations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Temporarily hand notification responsibility to another
                    user.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-black border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Delegation
                </Button>
              </div>
              <UpgradeGate
                module="notification_delegation"
                featureName="Temporary Handover"
                requiredPlan="enterprise"
                description="Temporarily delegate your notification responsibilities to a colleague while you're away."
              >
                <Card className="shadow-none border-slate-200">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                        <TableRow>
                          <TableHead>Delegate</TableHead>
                          <TableHead>Events</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingDelegations ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
                            </TableCell>
                          </TableRow>
                        ) : (
                          delegationsData?.data?.delegations?.map((del) => {
                            const target = getDelegationTarget(del);
                            return (
                              <TableRow key={del.id} className="text-sm">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                      {getUserName(target).charAt(0)}
                                    </div>
                                    <span className="font-medium text-slate-800">
                                      {getUserName(target)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {getDelegationTypes(del).map(
                                      (e: string) => (
                                        <Badge
                                          key={e}
                                          variant="outline"
                                          className="text-[9px] font-mono h-4 px-1"
                                        >
                                          {e}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-[11px] text-slate-600 font-medium">
                                  {del.end_date
                                    ? format(
                                        new Date(del.end_date),
                                        "MMM d, yyyy",
                                      )
                                    : "Open-ended"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
                                    disabled={endDelegationMutation.isPending}
                                    onClick={() =>
                                      endDelegationMutation.mutate(del.id)
                                    }
                                  >
                                    Revoke
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                        {delegationsData?.data?.delegations?.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="h-32 text-center text-slate-400 text-sm italic"
                            >
                              No active delegations.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </UpgradeGate>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "rules"
                ? "Create Routing Rule"
                : activeTab === "groups"
                  ? "Create Notification Group"
                  : "New Temporary Delegation"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "rules"
                ? "Define automated routing conditions for operational events."
                : activeTab === "groups"
                  ? "Group users together to receive batch alerts."
                  : "Temporarily hand over alerts to another teammate."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto px-1">
            {activeTab === "rules" && (
              <>
                <div className="space-y-2">
                  <Label>Trigger Notification Type</Label>
                  <Select
                    value={formData.notification_type_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, notification_type_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select notification type" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes?.data?.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          <div className="flex flex-col">
                            <span>{t.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t.code}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Channels</Label>
                  <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-slate-50/50">
                    {[
                      { id: "in_app", label: "In-App" },
                      { id: "email", label: "Email" },
                      { id: "sms", label: "SMS" },
                      { id: "push", label: "Push" },
                    ]
                      .filter(
                        (c) =>
                          !channelData?.data?.channels ||
                          channelData.data.channels[
                            c.id as keyof api.ChannelAvailability
                          ] === true,
                      )
                      .map((c) => (
                        <div key={c.id} className="flex items-center space-x-2">
                          <Switch
                            id={c.id}
                            checked={formData.channel_types.includes(c.id)}
                            onCheckedChange={(checked) => {
                              const channels = checked
                                ? [...formData.channel_types, c.id]
                                : formData.channel_types.filter(
                                    (id: string) => id !== c.id,
                                  );
                              setFormData({
                                ...formData,
                                channel_types: channels,
                              });
                            }}
                          />
                          <Label
                            htmlFor={c.id}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            {c.label}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Roles</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-white">
                      {rolesData?.data?.roles?.map((r) => (
                        <div key={r.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`role-${r.id}`}
                            checked={formData.recipient_roles.includes(
                              r.attributes.name,
                            )}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                            onChange={(e) => {
                              const roles = e.target.checked
                                ? [
                                    ...formData.recipient_roles,
                                    r.attributes.name,
                                  ]
                                : formData.recipient_roles.filter(
                                    (n: string) => n !== r.attributes.name,
                                  );
                              setFormData({
                                ...formData,
                                recipient_roles: roles,
                              });
                            }}
                          />
                          <label
                            htmlFor={`role-${r.id}`}
                            className="text-[11px] font-medium capitalize"
                          >
                            {r.attributes.name.replace(/_/g, " ")}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Groups</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-white">
                      {groupsData?.data?.groups?.map((g) => (
                        <div key={g.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`group-${g.id}`}
                            checked={formData.recipient_groups.includes(g.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                            onChange={(e) => {
                              const groups = e.target.checked
                                ? [...formData.recipient_groups, g.id]
                                : formData.recipient_groups.filter(
                                    (id: any) => id !== g.id,
                                  );
                              setFormData({
                                ...formData,
                                recipient_groups: groups,
                              });
                            }}
                          />
                          <label
                            htmlFor={`group-${g.id}`}
                            className="text-[11px] font-medium"
                          >
                            {g.name}
                          </label>
                        </div>
                      ))}
                      {groupsData?.data?.groups?.length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">
                          No groups found.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Specific Users (Optional)</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto bg-white">
                    {userData?.data?.users?.map((u) => (
                      <div key={u.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`recipient-user-${u.id}`}
                          checked={formData.recipient_users.includes(u.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                          onChange={(e) => {
                            const users = e.target.checked
                              ? [...formData.recipient_users, u.id]
                              : formData.recipient_users.filter(
                                  (id: any) => id !== u.id,
                                );
                            setFormData({
                              ...formData,
                              recipient_users: users,
                            });
                          }}
                        />
                        <label
                          htmlFor={`recipient-user-${u.id}`}
                          className="text-[11px] font-medium"
                        >
                          {u.attributes.full_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "groups" && (
              <>
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    placeholder="e.g. Night Shift Mechanics"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Purpose of this group..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Members</Label>
                  <div className="border rounded-lg p-2 space-y-1 max-h-60 overflow-y-auto bg-slate-50">
                    {userData?.data?.users?.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`user-${u.id}`}
                          checked={formData.user_ids.includes(u.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const ids = checked
                              ? [...formData.user_ids, u.id]
                              : formData.user_ids.filter(
                                  (id: any) => id !== u.id,
                                );
                            setFormData({ ...formData, user_ids: ids });
                          }}
                        />
                        <label
                          htmlFor={`user-${u.id}`}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {u.attributes.full_name}{" "}
                          <span className="text-xs text-slate-400 font-normal ml-2">
                            {u.attributes.email}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "delegations" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Original User</Label>
                    <Select
                      value={formData.initial_user_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, initial_user_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="User on leave" />
                      </SelectTrigger>
                      <SelectContent>
                        {userData?.data?.users?.map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.attributes.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delegate To</Label>
                    <Select
                      value={formData.delegate_user_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, delegate_user_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select delegate" />
                      </SelectTrigger>
                      <SelectContent>
                        {userData?.data?.users?.map(
                          (u) =>
                            u.id.toString() !== formData.initial_user_id && (
                              <SelectItem key={u.id} value={u.id.toString()}>
                                {u.attributes.full_name}
                              </SelectItem>
                            ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notification Types</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-lg p-4 bg-slate-50 max-h-40 overflow-y-auto">
                    {notificationTypes?.data?.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`del-type-${type.id}`}
                          checked={formData.notification_type_ids.includes(
                            type.id,
                          )}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const notificationTypeIds = checked
                              ? [...formData.notification_type_ids, type.id]
                              : formData.notification_type_ids.filter(
                                  (id: number) => id !== type.id,
                                );
                            setFormData({
                              ...formData,
                              notification_type_ids: notificationTypeIds,
                            });
                          }}
                        />
                        <label
                          htmlFor={`del-type-${type.id}`}
                          className="text-[10px] font-mono leading-none"
                        >
                          {type.code}
                        </label>
                      </div>
                    ))}
                    {notificationTypes?.data?.length === 0 && (
                      <p className="col-span-2 text-xs text-slate-400">
                        Leave empty to delegate all notification types.
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Input
                    placeholder="e.g. Annual Leave, Shift Change"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSave}
              disabled={
                createRuleMutation.isPending ||
                createGroupMutation.isPending ||
                createDelegationMutation.isPending
              }
            >
              {(createRuleMutation.isPending ||
                createGroupMutation.isPending ||
                createDelegationMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {activeTab === "rules"
                ? "Create Rule"
                : activeTab === "groups"
                  ? "Create Group"
                  : "Assign Delegation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
