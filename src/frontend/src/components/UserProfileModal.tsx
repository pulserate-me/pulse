import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  QrCode,
  Radio,
  Share2,
  Shield,
  ShieldOff,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useBlockUser,
  useFollowChannel,
  useGetAllChannels,
  useGetMyBlockedUsers,
  useGetUserProfile,
  useIsUserOnline,
  useUnblockUser,
  useUnfollowChannel,
} from "../hooks/useQueries";
import type { ChannelId } from "../hooks/useQueries";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastSeen(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms === 0) return "";
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "Last seen just now";
  if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
  return `Last seen ${new Date(ms).toLocaleDateString()}`;
}

/** Build a QR code image URL using the public api.qrserver.com service */
function buildQrUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=C8A84B&color=1A1208&margin=4`;
}

function ChannelFollowCard({
  channelId,
  name,
  avatarUrl,
  description,
  followerCount,
  isFollowing,
  isOwner,
  index,
}: {
  channelId: ChannelId;
  name: string;
  avatarUrl?: string;
  description?: string;
  followerCount: number;
  isFollowing: boolean;
  isOwner: boolean;
  index: number;
}) {
  const { mutate: follow, isPending: following } = useFollowChannel();
  const { mutate: unfollow, isPending: unfollowing } = useUnfollowChannel();
  const ocid = index + 1;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowing) {
      unfollow(channelId);
    } else {
      follow(channelId);
    }
  };

  return (
    <div
      data-ocid={`profile.channels.item.${ocid}`}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0"
    >
      <Avatar className="w-10 h-10 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback
          className="text-sm font-bold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.25), oklch(0.65 0.11 65 / 0.15))",
            color: "oklch(0.82 0.15 72)",
            border: "1.5px solid oklch(0.76 0.13 72 / 0.3)",
          }}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs text-foreground truncate">{name}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground truncate">
            {description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5 text-muted-foreground/60">
          <Users className="h-2.5 w-2.5" />
          <span className="text-[10px]">{followerCount}</span>
        </div>
      </div>

      {!isOwner && (
        <button
          type="button"
          data-ocid={`profile.channels.toggle.${ocid}`}
          onClick={handleToggle}
          disabled={following || unfollowing}
          className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors"
          style={{
            background: isFollowing ? "transparent" : "oklch(0.82 0.15 72)",
            color: isFollowing ? "oklch(0.6 0.05 55)" : "oklch(0.08 0.004 55)",
            borderColor: isFollowing
              ? "oklch(0.3 0.01 55)"
              : "oklch(0.82 0.15 72)",
          }}
        >
          {following || unfollowing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isFollowing ? (
            "Following"
          ) : (
            "Follow"
          )}
        </button>
      )}
    </div>
  );
}

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat: (userId: string) => void;
}

export default function UserProfileModal({
  userId,
  open,
  onOpenChange,
  onStartChat,
}: UserProfileModalProps) {
  const { data: profile, isLoading } = useGetUserProfile(userId);
  const { data: isOnline } = useIsUserOnline(userId);
  const { data: allChannels = [] } = useGetAllChannels();
  const { data: blockedUsers = [] } = useGetMyBlockedUsers();
  const { mutate: blockUser, isPending: blocking } = useBlockUser();
  const { mutate: unblockUser, isPending: unblocking } = useUnblockUser();
  const isBlocked = profile
    ? blockedUsers.some((u) => u.username === profile.username)
    : false;
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Channels owned by this user
  const userChannels = userId
    ? allChannels.filter((m) => m.channel.owner.toString() === userId)
    : [];

  const profileUrl = profile
    ? `${window.location.origin}/profile/${encodeURIComponent(profile.username)}`
    : null;

  const handleCopy = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!profileUrl || !profile) return;
    try {
      await navigator.share({
        title: `${profile.displayName} on Pulse`,
        text: `Chat with @${profile.username} on Pulse`,
        url: profileUrl,
      });
    } catch {
      // user cancelled or not supported
    }
  };

  // Reset QR when modal closes
  const handleOpenChange = (val: boolean) => {
    if (!val) setShowQr(false);
    onOpenChange(val);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        data-ocid="profile.sheet"
        side="right"
        className="w-full sm:w-80 bg-sidebar border-border p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground font-display text-lg">
              Profile
            </SheetTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="h-8 w-8 rounded-xl"
              data-ocid="profile.close_button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div
              data-ocid="profile.loading_state"
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <div
                className="w-20 h-20 rounded-full animate-pulse"
                style={{ background: "oklch(0.76 0.13 72 / 0.15)" }}
              />
              <div
                className="h-4 w-32 rounded animate-pulse"
                style={{ background: "oklch(0.76 0.13 72 / 0.15)" }}
              />
            </div>
          ) : !profile ? (
            <div
              data-ocid="profile.error_state"
              className="flex flex-col items-center justify-center py-16 text-center px-6"
            >
              <p className="text-muted-foreground text-sm">Profile not found</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-8 gap-4">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-24 h-24">
                  {profile.avatarUrl && (
                    <AvatarImage
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                    />
                  )}
                  <AvatarFallback
                    className="text-2xl font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.4), oklch(0.65 0.11 65 / 0.3))",
                      color: "oklch(0.82 0.15 72)",
                      border: "2px solid oklch(0.76 0.13 72 / 0.4)",
                    }}
                  >
                    {getInitials(profile.displayName)}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-sidebar"
                  style={{
                    background: isOnline
                      ? "oklch(0.72 0.20 140)"
                      : "oklch(0.45 0.01 70)",
                    boxShadow: isOnline
                      ? "0 0 8px oklch(0.72 0.20 140 / 0.6)"
                      : "none",
                  }}
                />
              </div>

              {/* Name & username */}
              <div className="text-center">
                <h3 className="font-display text-xl font-bold text-foreground">
                  {profile.displayName}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{profile.username}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.72 0.20 140)" }}
                >
                  {isOnline ? "● Online" : formatLastSeen(profile.lastSeen)}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div
                  className="w-full rounded-xl p-4 text-sm text-foreground/80 leading-relaxed text-center"
                  style={{ background: "oklch(0.12 0.005 55)" }}
                >
                  {profile.bio}
                </div>
              )}

              {/* Message button */}
              {userId && (
                <>
                  <Button
                    data-ocid="profile.primary_button"
                    className="w-full h-11 rounded-xl font-semibold mt-2"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }}
                    onClick={() => {
                      onStartChat(userId);
                      handleOpenChange(false);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button
                    data-ocid={
                      isBlocked
                        ? "profile.unblock_button"
                        : "profile.block_button"
                    }
                    variant="outline"
                    className="w-full h-9 rounded-xl font-medium text-sm"
                    disabled={blocking || unblocking}
                    style={{
                      borderColor: isBlocked
                        ? "oklch(0.76 0.13 72 / 0.4)"
                        : "oklch(0.35 0.02 55)",
                      color: isBlocked
                        ? "oklch(0.76 0.13 72)"
                        : "oklch(0.6 0.05 55)",
                      background: "transparent",
                    }}
                    onClick={() => {
                      if (isBlocked) {
                        unblockUser(userId);
                      } else {
                        blockUser(userId);
                      }
                    }}
                  >
                    {blocking || unblocking ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : isBlocked ? (
                      <ShieldOff className="h-3.5 w-3.5 mr-2" />
                    ) : (
                      <Shield className="h-3.5 w-3.5 mr-2" />
                    )}
                    {isBlocked ? "Unblock User" : "Block User"}
                  </Button>
                </>
              )}

              {/* Channels section */}
              {userChannels.length > 0 && (
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio
                      className="h-3.5 w-3.5"
                      style={{ color: "oklch(0.82 0.15 72 / 0.7)" }}
                    />
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.82 0.15 72 / 0.7)" }}
                    >
                      Channels
                    </span>
                  </div>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: "oklch(0.12 0.005 55)" }}
                  >
                    {userChannels.map((meta, idx) => (
                      <ChannelFollowCard
                        key={meta.channel.id.toString()}
                        channelId={meta.channel.id}
                        name={meta.channel.name}
                        avatarUrl={meta.channel.avatarUrl || undefined}
                        description={meta.channel.description || undefined}
                        followerCount={Number(meta.followerCount)}
                        isFollowing={meta.isFollowing}
                        isOwner={meta.channel.owner.toString() === userId}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Profile link section */}
              {profileUrl && (
                <div className="w-full">
                  <div
                    className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ background: "oklch(0.12 0.005 55)" }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="text-xs truncate flex-1"
                        style={{ color: "oklch(0.65 0.08 72)" }}
                      >
                        {profileUrl}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          data-ocid="profile.secondary_button"
                          size="icon"
                          variant="ghost"
                          onClick={handleCopy}
                          className="h-7 w-7 rounded-lg"
                          title="Copy profile link"
                          style={{ color: "oklch(0.76 0.13 72)" }}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {typeof navigator !== "undefined" &&
                          "share" in navigator && (
                            <Button
                              data-ocid="profile.share_button"
                              size="icon"
                              variant="ghost"
                              onClick={handleShare}
                              className="h-7 w-7 rounded-lg"
                              title="Share profile"
                              style={{ color: "oklch(0.76 0.13 72)" }}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        <Button
                          data-ocid="profile.qr_toggle"
                          size="icon"
                          variant="ghost"
                          onClick={() => setShowQr((v) => !v)}
                          className="h-7 w-7 rounded-lg"
                          title="Show QR code"
                          style={{
                            color: showQr
                              ? "oklch(0.08 0.004 55)"
                              : "oklch(0.76 0.13 72)",
                            background: showQr
                              ? "oklch(0.76 0.13 72)"
                              : "transparent",
                          }}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* QR Code — generated via qrserver.com, no library needed */}
                    {showQr && (
                      <div
                        className="flex flex-col items-center gap-2 pt-2 pb-1"
                        data-ocid="profile.panel"
                      >
                        <div
                          className="rounded-xl p-3"
                          style={{
                            background: "oklch(0.76 0.13 72)",
                            boxShadow: "0 0 20px oklch(0.76 0.13 72 / 0.3)",
                          }}
                        >
                          <img
                            src={buildQrUrl(profileUrl)}
                            alt={`QR code for @${profile.username}`}
                            className="w-40 h-40 rounded-lg"
                            loading="lazy"
                          />
                        </div>
                        <p
                          className="text-xs text-center"
                          style={{ color: "oklch(0.55 0.06 70)" }}
                        >
                          Scan to visit @{profile.username}&apos;s profile
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
