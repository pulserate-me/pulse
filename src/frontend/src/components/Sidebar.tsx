import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  Radio,
  ScanLine,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, ConversationId, UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useCreateDirectConversation,
  useGetGroupAvatars,
  useGetUserProfile,
  useListUserConversations,
  useSearchUserByUsername,
  useSearchUsers,
} from "../hooks/useQueries";
import type {
  ChannelId,
  ChannelPost,
  ChannelWithMeta,
} from "../hooks/useQueries";
import { useQRScanner } from "../qr-code/useQRScanner";
import ChannelsTab from "./ChannelsTab";
import EditProfileModal from "./EditProfileModal";
import NewChatModal from "./NewChatModal";
import NotificationBell from "./NotificationBell";
import StatusView from "./StatusView";
import UserProfileModal from "./UserProfileModal";
import WalletTab from "./WalletTab";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "";
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  const date = new Date(ms);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
  index: number;
  groupAvatar?: string;
}

function ConversationItem({
  conversation,
  currentUserId,
  isActive,
  onClick,
  index,
  groupAvatar,
}: ConversationItemProps) {
  const isGroup = conversation.type.__kind__ === "group";
  const otherUserId = isGroup
    ? null
    : (conversation.members
        .find((m) => m.toString() !== currentUserId)
        ?.toString() ?? null);

  const { data: otherProfile } = useGetUserProfile(otherUserId);

  const name = isGroup
    ? (conversation.type as { __kind__: "group"; group: string }).group
    : (otherProfile?.displayName ?? otherUserId?.slice(0, 8) ?? "Unknown");

  const messages = conversation.messages;
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastText = lastMsg?.content.mediaUrl
    ? lastMsg.content.mediaType?.__kind__ === "image"
      ? "📷 Photo"
      : lastMsg.content.mediaType?.__kind__ === "video"
        ? "🎥 Video"
        : lastMsg.content.mediaType?.__kind__ === "audio"
          ? "🎤 Voice message"
          : "📎 Media"
    : (lastMsg?.content.text ?? "");

  const unreadCount = messages.filter(
    (m) =>
      m.sender.toString() !== currentUserId &&
      !m.readReceipts.some((r) => r.userId.toString() === currentUserId),
  ).length;

  const ocidIndex = index + 1;

  return (
    <button
      type="button"
      data-ocid={`sidebar.conversation_item.${ocidIndex}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
        isActive ? "bg-muted/70 border-r-2 border-primary" : ""
      }`}
    >
      <Avatar className="w-11 h-11 shrink-0">
        {isGroup && groupAvatar ? (
          <AvatarImage src={groupAvatar} alt={name} />
        ) : !isGroup && otherProfile?.avatarUrl ? (
          <AvatarImage src={otherProfile.avatarUrl} alt={name} />
        ) : null}
        <AvatarFallback
          className="text-sm font-semibold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
            color: "oklch(0.82 0.15 72)",
            border: "1px solid oklch(0.76 0.13 72 / 0.3)",
          }}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={`font-medium text-sm truncate ${
              unreadCount > 0 ? "text-foreground" : "text-foreground/80"
            }`}
          >
            {name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {formatTimestamp(conversation.lastMessageTimestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate flex-1">
            {lastText || "No messages yet"}
          </p>
          {unreadCount > 0 && (
            <Badge
              className="ml-2 min-w-[20px] h-5 flex items-center justify-center text-xs shrink-0 px-1.5"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ConversationSections component
interface ConversationSectionsProps {
  filteredConversations: import("../backend").Conversation[];
  currentUserId: string;
  activeConversationId: import("../backend").ConversationId | null;
  onSelectConversation: (id: import("../backend").ConversationId) => void;
  groupAvatarMap: Map<string, string>;
  showAllDMs: boolean;
  setShowAllDMs: (fn: (v: boolean) => boolean) => void;
  showAllGroups: boolean;
  setShowAllGroups: (fn: (v: boolean) => boolean) => void;
}

function ConversationSections({
  filteredConversations,
  currentUserId,
  activeConversationId,
  onSelectConversation,
  groupAvatarMap,
  showAllDMs,
  setShowAllDMs,
  showAllGroups,
  setShowAllGroups,
}: ConversationSectionsProps) {
  const dmConvs = filteredConversations.filter(
    (c) => c.type.__kind__ !== "group",
  );
  const groupConvs = filteredConversations.filter(
    (c) => c.type.__kind__ === "group",
  );
  const visibleDMs = showAllDMs ? dmConvs : dmConvs.slice(0, 9);
  const visibleGroups = showAllGroups ? groupConvs : groupConvs.slice(0, 9);

  return (
    <>
      {dmConvs.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
              Conversations
            </span>
          </div>
          {visibleDMs.map((conv, idx) => (
            <ConversationItem
              key={conv.id.toString()}
              conversation={conv}
              currentUserId={currentUserId}
              isActive={activeConversationId === conv.id}
              onClick={() => onSelectConversation(conv.id)}
              index={idx}
              groupAvatar={undefined}
            />
          ))}
          {dmConvs.length > 9 && (
            <button
              type="button"
              className="w-full text-xs py-2 px-4 text-left font-medium"
              style={{ color: "oklch(0.82 0.15 72)" }}
              onClick={() => setShowAllDMs((v) => !v)}
              data-ocid="sidebar.dms.show_more_button"
            >
              {showAllDMs ? "Show less" : `Show ${dmConvs.length - 9} more`}
            </button>
          )}
        </>
      )}
      {groupConvs.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
              Groups
            </span>
          </div>
          {visibleGroups.map((conv, idx) => (
            <ConversationItem
              key={conv.id.toString()}
              conversation={conv}
              currentUserId={currentUserId}
              isActive={activeConversationId === conv.id}
              onClick={() => onSelectConversation(conv.id)}
              index={dmConvs.length + idx}
              groupAvatar={groupAvatarMap.get(conv.id.toString())}
            />
          ))}
          {groupConvs.length > 9 && (
            <button
              type="button"
              className="w-full text-xs py-2 px-4 text-left font-medium"
              style={{ color: "oklch(0.82 0.15 72)" }}
              onClick={() => setShowAllGroups((v) => !v)}
              data-ocid="sidebar.groups.show_more_button"
            >
              {showAllGroups
                ? "Show less"
                : `Show ${groupConvs.length - 9} more`}
            </button>
          )}
        </>
      )}
    </>
  );
}

// QR Scanner Modal
function QRScannerModal({
  open,
  onClose,
  onScanned,
}: {
  open: boolean;
  onClose: () => void;
  onScanned: (username: string) => void;
}) {
  const { videoRef, canvasRef, startScanning, stopScanning, qrResults } =
    useQRScanner({});
  const hasHandled = useRef(false);

  useEffect(() => {
    if (open) {
      hasHandled.current = false;
      startScanning();
    } else {
      stopScanning();
    }
    return () => {
      stopScanning();
    };
  }, [open, startScanning, stopScanning]);

  useEffect(() => {
    if (!qrResults || qrResults.length === 0 || hasHandled.current) return;
    const raw = qrResults[0].data;
    // Match pattern: <origin>/profile/<username>
    const origin = window.location.origin;
    const escaped = origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const profilePattern = new RegExp(`^${escaped}/profile/([^/]+)$`);
    const match = raw.match(profilePattern);
    if (match) {
      hasHandled.current = true;
      onScanned(decodeURIComponent(match[1]));
      onClose();
    }
  }, [qrResults, onScanned, onClose]);

  if (!open) return null;

  const corners = [
    { pos: "top-2 left-2", border: "3px 0 0 3px", radius: "6px 0 0 0" },
    { pos: "top-2 right-2", border: "3px 3px 0 0", radius: "0 6px 0 0" },
    { pos: "bottom-2 left-2", border: "0 0 3px 3px", radius: "0 0 0 6px" },
    { pos: "bottom-2 right-2", border: "0 3px 3px 0", radius: "0 0 6px 0" },
  ];

  return (
    <div
      data-ocid="qrscanner.modal"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      {/* Close button */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <span
          className="font-display text-lg font-semibold"
          style={{ color: "oklch(0.76 0.13 72)" }}
        >
          Scan Profile QR
        </span>
        <Button
          data-ocid="qrscanner.close_button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-9 w-9 rounded-xl"
          style={{ color: "oklch(0.76 0.13 72)" }}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera area */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="relative w-full max-w-sm aspect-square mx-4">
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-2xl"
            style={{ background: "oklch(0.08 0.003 55)" }}
          />
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className="hidden"
          />

          {/* Gold scan frame overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: "1rem",
              boxShadow: "inset 0 0 0 2px oklch(0.76 0.13 72 / 0.6)",
            }}
          >
            {corners.map(({ pos, border, radius }) => (
              <div
                key={pos}
                className={`absolute ${pos} w-8 h-8`}
                style={{
                  borderColor: "oklch(0.76 0.13 72)",
                  borderStyle: "solid",
                  borderWidth: border,
                  borderRadius: radius,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="p-6 text-center shrink-0">
        <p className="text-sm" style={{ color: "oklch(0.55 0.06 70)" }}>
          Point your camera at a Pulse profile QR code
        </p>
      </div>
    </div>
  );
}

interface SidebarProps {
  currentUserId: string;
  currentProfile: UserProfile | null;
  activeConversationId: ConversationId | null;
  onSelectConversation: (id: ConversationId) => void;
  onSelectChannel: (id: ChannelId) => void;
  onStartChat: (userId: string) => void;
  onViewProfile: (username: string) => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentUserId,
  currentProfile,
  activeConversationId,
  onSelectConversation,
  onSelectChannel,
  onStartChat,
  onViewProfile,
  onLogout,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [universalSearchActive, setUniversalSearchActive] = useState(false);
  const [universalQuery, setUniversalQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<
    Array<{
      userId: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
    }>
  >([]);
  const [msgSearchResults, setMsgSearchResults] = useState<
    Array<{ convId: string; convName: string; msgText: string }>
  >([]);
  const [postSearchResults, setPostSearchResults] = useState<
    Array<{ channelId: bigint; channelName: string; postText: string }>
  >([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [showAllDMs, setShowAllDMs] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [channelCreatorUserId, setChannelCreatorUserId] = useState<
    string | null
  >(null);
  const [channelCreatorOpen, setChannelCreatorOpen] = useState(false);
  const { data: conversations, isLoading } = useListUserConversations();
  const { data: groupAvatarsData } = useGetGroupAvatars();
  const { mutateAsync: searchUser } = useSearchUserByUsername();
  const { mutateAsync: searchUsers } = useSearchUsers();
  const { mutateAsync: createDirectConversation } =
    useCreateDirectConversation();
  const { actor } = useActor();

  const groupAvatarMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, url] of groupAvatarsData ?? []) {
      m.set(id.toString(), url);
    }
    return m;
  }, [groupAvatarsData]);

  const filteredConversations = useCallback(() => {
    if (!conversations) return [];
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      if (c.type.__kind__ === "group") {
        return (c.type as { __kind__: "group"; group: string }).group
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [conversations, search])();

  const handleConversationCreated = (id: ConversationId) => {
    setNewChatOpen(false);
    onSelectConversation(id);
  };

  const handleOpenChatByUsername = async (username: string) => {
    try {
      const result = await searchUser(username);
      if (!result) {
        return;
      }
      const convId = await createDirectConversation(result.userId);
      setActiveTab("chats");
      onSelectConversation(convId);
    } catch {
      // silently fail; user can try manually
    }
  };

  const handleChannelAvatarClick = (userId: string) => {
    setChannelCreatorUserId(userId);
    setChannelCreatorOpen(true);
  };

  const handleStartChatFromChannelProfile = async (userId: string) => {
    try {
      const principal = (
        await import("@icp-sdk/core/principal")
      ).Principal.fromText(userId);
      const convId = await createDirectConversation(principal);
      setChannelCreatorOpen(false);
      setActiveTab("chats");
      onSelectConversation(convId);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold gold-shimmer">
              Pulse
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Universal Search - always visible */}
            {universalSearchActive ? (
              <div className="flex items-center gap-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    data-ocid="sidebar.universal_search.input"
                    autoFocus
                    value={universalQuery}
                    onChange={async (e) => {
                      const q = e.target.value;
                      setUniversalQuery(q);
                      if (q.trim().length >= 1) {
                        // Search users
                        try {
                          const users = await searchUsers(q.trim());
                          setUserSearchResults(
                            (users as any[]).slice(0, 5).map((u: any) => ({
                              userId: u.userId?.toString() ?? "",
                              username: u.profile?.username ?? "",
                              displayName: u.profile?.displayName ?? "",
                              avatarUrl: u.profile?.avatarUrl?.[0] ?? undefined,
                            })),
                          );
                        } catch {
                          setUserSearchResults([]);
                        }
                        // Search messages in loaded conversations
                        const qLow = q.toLowerCase();
                        const msgResults: Array<{
                          convId: string;
                          convName: string;
                          msgText: string;
                        }> = [];
                        for (const conv of conversations ?? []) {
                          const name =
                            conv.type.__kind__ === "group"
                              ? (conv.type as any).group
                              : "Direct";
                          for (const msg of conv.messages.slice(-50)) {
                            if (msg.content.text.toLowerCase().includes(qLow)) {
                              msgResults.push({
                                convId: conv.id.toString(),
                                convName: name,
                                msgText: msg.content.text.slice(0, 60),
                              });
                              break;
                            }
                          }
                          if (msgResults.length >= 5) break;
                        }
                        setMsgSearchResults(msgResults);
                        // Search channel posts
                        if (actor) {
                          try {
                            const channels = (await (
                              actor as any
                            ).getAllChannels()) as any[];
                            const postResults: Array<{
                              channelId: bigint;
                              channelName: string;
                              postText: string;
                            }> = [];
                            for (const ch of channels.slice(0, 15)) {
                              const posts = (await (
                                actor as any
                              ).getChannelPosts(ch.channel.id)) as any[];
                              for (const post of posts.slice(-30)) {
                                if (
                                  (post.content?.text ?? "")
                                    .toLowerCase()
                                    .includes(qLow)
                                ) {
                                  postResults.push({
                                    channelId: ch.channel.id as bigint,
                                    channelName: ch.channel.name as string,
                                    postText: (
                                      post.content.text as string
                                    ).slice(0, 80),
                                  });
                                  break;
                                }
                              }
                              if (postResults.length >= 5) break;
                            }
                            setPostSearchResults(postResults);
                          } catch {
                            setPostSearchResults([]);
                          }
                        }
                      } else {
                        setUserSearchResults([]);
                        setMsgSearchResults([]);
                        setPostSearchResults([]);
                      }
                    }}
                    placeholder="Search..."
                    className="pl-7 h-8 w-40 sm:w-52 text-xs bg-input border-border rounded-lg"
                  />
                </div>
                <Button
                  data-ocid="sidebar.universal_search.close_button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setUniversalSearchActive(false);
                    setUniversalQuery("");
                    setUserSearchResults([]);
                    setMsgSearchResults([]);
                    setPostSearchResults([]);
                  }}
                  className="h-8 w-8 rounded-xl hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                data-ocid="sidebar.universal_search_button"
                size="icon"
                variant="ghost"
                onClick={() => setUniversalSearchActive(true)}
                className="h-9 w-9 rounded-xl hover:bg-muted"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            {activeTab === "chats" && !universalSearchActive && (
              <>
                <Button
                  data-ocid="sidebar.scan_qr_button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setQrScannerOpen(true)}
                  className="h-9 w-9 rounded-xl hover:bg-muted"
                  aria-label="Scan QR code"
                >
                  <ScanLine className="h-5 w-5" />
                </Button>
                <Button
                  data-ocid="sidebar.new_chat_button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setNewChatOpen(true)}
                  className="h-9 w-9 rounded-xl hover:bg-muted"
                  aria-label="New chat"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </>
            )}
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-xl hover:bg-muted"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border"
              >
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Profile chip */}
        {currentProfile && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="w-7 h-7">
              {currentProfile.avatarUrl && (
                <AvatarImage
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.displayName}
                />
              )}
              <AvatarFallback
                className="text-xs font-semibold"
                style={{
                  background: "oklch(0.76 0.13 72 / 0.2)",
                  color: "oklch(0.82 0.15 72)",
                }}
              >
                {getInitials(currentProfile.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground flex-1 truncate">
              {currentProfile.displayName}
            </span>
            <Button
              data-ocid="sidebar.edit_profile_button"
              size="icon"
              variant="ghost"
              onClick={() => setEditProfileOpen(true)}
              className="h-7 w-7 rounded-lg hover:bg-muted shrink-0"
              aria-label="Edit profile"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Chats / Stories / Channels Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted/50" data-ocid="sidebar.tab">
            <TabsTrigger
              value="chats"
              className="flex-1"
              data-ocid="sidebar.chats_tab"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="flex-1"
              data-ocid="sidebar.status_tab"
            >
              <div
                className="w-3 h-3 mr-1 rounded-full border-2 shrink-0"
                style={{ borderColor: "currentColor" }}
              />
              Stories
            </TabsTrigger>
            <TabsTrigger
              value="channels"
              className="flex-1"
              data-ocid="sidebar.channels_tab"
            >
              <Radio className="h-3.5 w-3.5 mr-1" />
              Channels
            </TabsTrigger>
            <TabsTrigger
              value="wallet"
              className="flex-1"
              data-ocid="sidebar.wallet_tab"
            >
              <Wallet className="h-3.5 w-3.5 mr-1" />
              Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="mt-0">
            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-ocid="sidebar.search_input"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-input border-border h-9 text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-0" />
          <TabsContent value="channels" className="mt-0" />
          <TabsContent value="wallet" className="mt-0" />
        </Tabs>
      </div>

      {/* Universal Search Results */}
      {universalSearchActive && universalQuery.trim().length > 0 && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pt-2">
          {userSearchResults.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                People
              </div>
              {userSearchResults.map((u, i) => (
                <button
                  type="button"
                  key={u.userId ?? i}
                  data-ocid={`sidebar.search.user.${i + 1}`}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left mb-1"
                  onClick={async () => {
                    try {
                      const result = await searchUser(u.username);
                      if (result) {
                        const convId = await createDirectConversation(
                          result.userId,
                        );
                        setUniversalSearchActive(false);
                        setUniversalQuery("");
                        setUserSearchResults([]);
                        setMsgSearchResults([]);
                        setPostSearchResults([]);
                        setActiveTab("chats");
                        onSelectConversation(convId);
                      }
                    } catch {}
                  }}
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    {u.avatarUrl ? (
                      <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                    ) : null}
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{
                        background: "oklch(0.76 0.13 72 / 0.2)",
                        color: "oklch(0.82 0.15 72)",
                      }}
                    >
                      {u.displayName
                        ? u.displayName.slice(0, 2).toUpperCase()
                        : u.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {u.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{u.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {msgSearchResults.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                Messages
              </div>
              {msgSearchResults.map((m, i) => (
                <button
                  type="button"
                  key={m.convId ?? i}
                  data-ocid={`sidebar.search.message.${i + 1}`}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left mb-1"
                  onClick={() => {
                    setUniversalSearchActive(false);
                    setUniversalQuery("");
                    setUserSearchResults([]);
                    setMsgSearchResults([]);
                    setPostSearchResults([]);
                    onSelectConversation(BigInt(m.convId));
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.18 0.04 55)" }}
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {m.convName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.msgText}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {postSearchResults.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                Posts
              </div>
              {postSearchResults.map((p, i) => (
                <button
                  type="button"
                  key={p.channelId.toString()}
                  data-ocid={`sidebar.search.post.${i + 1}`}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left mb-1"
                  onClick={() => {
                    setUniversalSearchActive(false);
                    setUniversalQuery("");
                    setUserSearchResults([]);
                    setMsgSearchResults([]);
                    setPostSearchResults([]);
                    setActiveTab("channels");
                    onSelectChannel(p.channelId);
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.18 0.04 55)" }}
                  >
                    <Radio className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {p.channelName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.postText}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {userSearchResults.length === 0 &&
            msgSearchResults.length === 0 &&
            postSearchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">
                  No results for &quot;{universalQuery}&quot;
                </p>
              </div>
            )}
        </div>
      )}

      {/* Content area */}
      {!universalSearchActive && activeTab === "status" ? (
        <StatusView
          currentUserId={currentUserId}
          currentProfile={currentProfile}
          onStartChat={onStartChat}
        />
      ) : !universalSearchActive && activeTab === "channels" ? (
        <ChannelsTab
          currentUserId={currentUserId}
          onSelectChannel={onSelectChannel}
          onAvatarClick={handleChannelAvatarClick}
        />
      ) : !universalSearchActive && activeTab === "wallet" ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <WalletTab
            currentUsername={currentProfile?.username ?? ""}
            onOpenChat={handleOpenChatByUsername}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div data-ocid="sidebar.conversation_list">
            {isLoading ? (
              <div className="flex flex-col gap-1 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div
                data-ocid="sidebar.empty_state"
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {!search && "Tap + to start a new chat"}
                </p>
              </div>
            ) : (
              <ConversationSections
                filteredConversations={filteredConversations}
                currentUserId={currentUserId}
                activeConversationId={activeConversationId}
                onSelectConversation={onSelectConversation}
                groupAvatarMap={groupAvatarMap}
                showAllDMs={showAllDMs}
                setShowAllDMs={setShowAllDMs}
                showAllGroups={showAllGroups}
                setShowAllGroups={setShowAllGroups}
              />
            )}
          </div>
        </div>
      )}

      {/* Edit Profile & New Chat Modals */}
      <EditProfileModal
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        currentProfile={currentProfile}
      />
      <NewChatModal
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        currentUserId={currentUserId}
        onConversationCreated={handleConversationCreated}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScanned={onViewProfile}
      />

      {/* Channel creator profile modal */}
      <UserProfileModal
        userId={channelCreatorUserId}
        open={channelCreatorOpen}
        onOpenChange={setChannelCreatorOpen}
        onStartChat={handleStartChatFromChannelProfile}
      />
    </div>
  );
}
