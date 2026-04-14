import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Eye,
  Film,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  QrCode,
  Radio,
  Share2,
  Shield,
  ShieldOff,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Status } from "../backend";
import { createActor } from "../backend";
import {
  useBlockUser,
  useFollowChannel,
  useGetAllChannels,
  useGetMyBlockedUsers,
  useGetStatusInteractions,
  useGetUserProfile,
  useIsUserOnline,
  useLikeStatus,
  useUnblockUser,
  useUnfollowChannel,
  useUnlikeStatus,
} from "../hooks/useQueries";
import type { ChannelId } from "../hooks/useQueries";

const HIGHLIGHTS_PAGE_SIZE = 9;

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

function buildQrUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=C8A84B&color=1A1208&margin=4`;
}

// ─── Highlight Thumbnail ────────────────────────────────────────────────────

function HighlightThumb({
  story,
  index,
  onClick,
  isOwner,
  onDelete,
}: {
  story: Status;
  index: number;
  onClick: () => void;
  isOwner: boolean;
  onDelete?: (storyId: bigint) => void;
}) {
  const mediaKind = story.content.mediaType?.__kind__;
  const isVideo = mediaKind === "video";
  const hasMedia = !!story.content.mediaUrl;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(story.id);
  };

  return (
    <div className="relative aspect-square">
      <button
        type="button"
        data-ocid={`profile.highlights.item.${index + 1}`}
        onClick={onClick}
        className="w-full h-full relative rounded-xl overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 transition-transform hover:scale-[1.03]"
        style={{ background: "oklch(0.14 0.008 55)" }}
        aria-label={`View highlight ${index + 1}`}
      >
        {hasMedia && !isVideo && (
          <img
            src={story.content.mediaUrl}
            alt="Highlight"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {hasMedia && isVideo && (
          <>
            <video
              src={story.content.mediaUrl}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                // Seek to first frame for thumbnail
                (e.currentTarget as HTMLVideoElement).currentTime = 0.1;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0 0 0 / 0.5)" }}
              >
                <Film
                  className="h-4 w-4"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                />
              </div>
            </div>
          </>
        )}
        {!hasMedia && story.content.text && (
          <div className="w-full h-full flex items-center justify-center p-2">
            <p
              className="text-[10px] text-center line-clamp-3 leading-tight font-medium"
              style={{ color: "oklch(0.82 0.15 72)" }}
            >
              {story.content.text}
            </p>
          </div>
        )}
        {!hasMedia && !story.content.text && (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon
              className="h-6 w-6 opacity-30"
              style={{ color: "oklch(0.82 0.15 72)" }}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Overlay shimmer on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />

        {/* Video badge */}
        {isVideo && hasMedia && (
          <div
            className="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              background: "oklch(0.08 0.004 55 / 0.8)",
              color: "oklch(0.82 0.15 72)",
            }}
          >
            VIDEO
          </div>
        )}
      </button>

      {/* Delete button — own profile only, always visible */}
      {isOwner && onDelete && (
        <button
          type="button"
          data-ocid={`profile.highlights.delete.${index + 1}`}
          onClick={handleDelete}
          aria-label="Remove highlight"
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-transform active:scale-90 hover:scale-110"
          style={{
            background: "oklch(0.08 0.004 55 / 0.85)",
            border: "1px solid oklch(0.65 0.25 25 / 0.6)",
            boxShadow: "0 1px 4px oklch(0 0 0 / 0.5)",
          }}
        >
          <Trash2
            className="h-3.5 w-3.5"
            style={{ color: "oklch(0.65 0.25 25)" }}
          />
        </button>
      )}
    </div>
  );
}

// ─── Inline Highlight Viewer ────────────────────────────────────────────────

function HighlightViewer({
  highlights,
  startIndex,
  isOwner,
  onClose,
}: {
  highlights: Status[];
  startIndex: number;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const story = highlights[index];
  const { data: interactions } = useGetStatusInteractions(story?.id ?? null);
  const likeStatus = useLikeStatus();
  const unlikeStatus = useUnlikeStatus();
  const { actor } = useActor(createActor);

  // Bug 2 fix: record view when highlight is opened or navigated to; skip owner's own views
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when index/story changes
  useEffect(() => {
    if (!actor || !story || isOwner) return;
    actor.recordStoryView(story.id).catch(() => {
      // Silently ignore — view recording is best-effort
    });
  }, [actor, story?.id, index, isOwner]);

  if (!story) return null;

  const mediaKind = story.content.mediaType?.__kind__;
  const isVideo = mediaKind === "video";
  const likeCount = Number(interactions?.likeCount ?? 0);
  // Bug 4 fix: use live viewCount from interactions instead of story.viewCount (which doesn't exist on Status type)
  const viewCount = Number(interactions?.viewCount ?? 0);

  const goNext = () => {
    if (index < highlights.length - 1) setIndex(index + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const handleLike = () => {
    if (interactions?.likedByMe) {
      unlikeStatus.mutate(story.id);
    } else {
      likeStatus.mutate(story.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "oklch(0.04 0.005 55)" }}
      data-ocid="highlights.viewer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-4 w-4"
            style={{ color: "oklch(0.82 0.15 72)" }}
          />
          <span className="text-sm font-semibold text-white">
            Highlight {index + 1} / {highlights.length}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-9 w-9 rounded-full text-white hover:bg-white/10"
          data-ocid="highlights.close_button"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress bars */}
      {highlights.length > 1 && (
        <div className="flex gap-1 px-4 mb-2">
          {highlights.map((_, i) => (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: stable index
              key={i}
              className="flex-1 h-0.5 rounded-full cursor-pointer"
              style={{
                background:
                  i <= index ? "oklch(0.82 0.15 72)" : "oklch(0.35 0.005 55)",
              }}
              onClick={() => setIndex(i)}
              aria-label={`Go to highlight ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        {index > 0 && (
          <button
            type="button"
            className="absolute left-0 top-0 w-1/4 h-full z-10"
            onClick={goPrev}
            aria-label="Previous highlight"
          />
        )}
        <button
          type="button"
          className="absolute right-0 top-0 w-1/4 h-full z-10"
          onClick={goNext}
          aria-label="Next highlight"
        />

        {story.content.mediaUrl && !isVideo && (
          <img
            src={story.content.mediaUrl}
            alt="Highlight"
            className="max-w-full max-h-[72vh] object-contain rounded-xl relative z-20"
          />
        )}

        {story.content.mediaUrl && isVideo && (
          <video
            key={String(story.id)}
            src={story.content.mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="max-w-full max-h-[72vh] object-contain rounded-xl relative z-20"
          />
        )}

        {story.content.text && (
          <div
            className="px-8 py-6 rounded-2xl text-center text-white text-xl font-semibold max-w-sm relative z-20"
            style={{
              background: story.content.mediaUrl
                ? "oklch(0 0 0 / 0.5)"
                : "linear-gradient(135deg, oklch(0.25 0.04 72), oklch(0.18 0.03 65))",
            }}
          >
            {story.content.text}
          </div>
        )}

        {!isVideo && (
          <button
            type="button"
            className="absolute inset-0 z-0"
            onClick={goNext}
            aria-label="Next highlight"
          />
        )}
      </div>

      {/* Like bar */}
      <div
        className="shrink-0 z-30 px-4 pb-6 pt-3 flex items-center gap-3"
        style={{ background: "oklch(0.04 0.005 55 / 0.9)" }}
      >
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-1.5"
          data-ocid="highlights.like_button"
          aria-label={interactions?.likedByMe ? "Unlike" : "Like"}
        >
          <Heart
            className="h-6 w-6"
            style={{
              color: interactions?.likedByMe
                ? "oklch(0.65 0.25 25)"
                : "oklch(0.7 0.02 55)",
              fill: interactions?.likedByMe
                ? "oklch(0.65 0.25 25)"
                : "transparent",
              transition: "color 0.2s, fill 0.2s",
            }}
          />
          {likeCount > 0 && (
            <span className="text-xs text-white/70">{likeCount}</span>
          )}
        </button>

        {/* View count — always visible to all users */}
        <div className="flex items-center gap-1 text-white/50">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs">{viewCount}</span>
        </div>

        <span className="text-xs text-white/40 ml-auto">
          Saved highlight · permanent
        </span>
      </div>
    </motion.div>
  );
}

// ─── Highlights Section ─────────────────────────────────────────────────────

function HighlightsSection({
  userId,
  isOwnProfile,
}: {
  userId: string;
  isOwnProfile: boolean;
}) {
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();
  const [hlPage, setHlPage] = useState(1);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const { data: highlights = [], isLoading } = useQuery<Status[]>({
    queryKey: ["highlights", userId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as ReturnType<typeof createActor>).getHighlights(
        Principal.fromText(userId),
      );
    },
    enabled: !!actor && !isFetching && !!userId,
    staleTime: 30000,
  });

  const handleDelete = async (storyId: bigint) => {
    if (!window.confirm("Remove from highlights?")) return;
    if (!actor) return;
    setDeletingId(storyId);
    try {
      const result = await (
        actor as ReturnType<typeof createActor>
      ).removeFromHighlights(storyId);
      if (result.__kind__ === "err") {
        toast.error(result.err);
      } else {
        queryClient.invalidateQueries({ queryKey: ["highlights", userId] });
      }
    } catch {
      toast.error("Failed to remove from highlights");
    } finally {
      setDeletingId(null);
    }
  };

  // Hide section entirely for visitors if there are no highlights
  if (!isOwnProfile && highlights.length === 0 && !isLoading) return null;

  const visibleHighlights = highlights.slice(0, hlPage * HIGHLIGHTS_PAGE_SIZE);
  const hasMore = highlights.length > hlPage * HIGHLIGHTS_PAGE_SIZE;

  return (
    <>
      <div className="w-full" data-ocid="profile.highlights">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles
            className="h-3.5 w-3.5"
            style={{ color: "oklch(0.82 0.15 72 / 0.7)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "oklch(0.82 0.15 72 / 0.7)" }}
          >
            Highlights
          </span>
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-3 gap-1.5"
            aria-label="Loading highlights"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder
                key={i}
                className="aspect-square rounded-xl animate-pulse"
                style={{ background: "oklch(0.14 0.008 55)" }}
              />
            ))}
          </div>
        ) : highlights.length === 0 ? (
          // Only shown for own profile
          <div
            data-ocid="profile.highlights.empty_state"
            className="rounded-xl px-4 py-5 flex flex-col items-center gap-2 text-center"
            style={{ background: "oklch(0.12 0.005 55)" }}
          >
            <Sparkles
              className="h-6 w-6 opacity-30"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
            <p className="text-xs text-muted-foreground">No highlights yet</p>
            <p className="text-[11px] text-muted-foreground/60">
              Save your stories to keep them permanently
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {visibleHighlights.map((story, idx) => (
                <div
                  key={String(story.id)}
                  className="group relative"
                  style={{ opacity: deletingId === story.id ? 0.5 : 1 }}
                >
                  <HighlightThumb
                    story={story}
                    index={idx}
                    onClick={() => setViewerIndex(idx)}
                    isOwner={isOwnProfile}
                    onDelete={isOwnProfile ? handleDelete : undefined}
                  />
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                type="button"
                data-ocid="profile.highlights.view_more"
                onClick={() => setHlPage((p) => p + 1)}
                className="w-full py-2.5 mt-2 text-xs font-semibold text-center transition-colors hover:bg-muted/20 rounded-xl"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                View more ({highlights.length - hlPage * HIGHLIGHTS_PAGE_SIZE}{" "}
                remaining)
              </button>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {viewerIndex !== null && (
          <HighlightViewer
            highlights={visibleHighlights}
            startIndex={viewerIndex}
            isOwner={isOwnProfile}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Channel Follow Card ────────────────────────────────────────────────────

function ChannelFollowCard({
  channelId,
  name,
  avatarUrl,
  description,
  followerCount,
  isFollowing,
  isOwner,
  index,
  onSelectChannel,
}: {
  channelId: ChannelId;
  name: string;
  avatarUrl?: string;
  description?: string;
  followerCount: number;
  isFollowing: boolean;
  isOwner: boolean;
  index: number;
  onSelectChannel?: (id: ChannelId) => void;
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

  const handleCardClick = () => {
    onSelectChannel?.(channelId);
  };

  return (
    <div
      data-ocid={`profile.channels.item.${ocid}`}
      role={onSelectChannel ? "button" : undefined}
      tabIndex={onSelectChannel ? 0 : undefined}
      onClick={onSelectChannel ? handleCardClick : undefined}
      onKeyDown={
        onSelectChannel
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") handleCardClick();
            }
          : undefined
      }
      className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0 ${
        onSelectChannel
          ? "cursor-pointer hover:bg-muted/30 transition-colors"
          : ""
      }`}
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

// ─── Main Component ─────────────────────────────────────────────────────────

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat: (userId: string) => void;
  onSelectChannel?: (id: ChannelId) => void;
  currentUserId?: string;
}

export default function UserProfileModal({
  userId,
  open,
  onOpenChange,
  onStartChat,
  onSelectChannel,
  currentUserId,
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

  const isOwnProfile = !!(userId && currentUserId && userId === currentUserId);

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
            <div className="flex flex-col items-center px-6 py-8 gap-5">
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

              {/* Message / Block buttons */}
              {userId && !isOwnProfile && (
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

              {/* Profile link section — above channels */}
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
                        onSelectChannel={
                          onSelectChannel
                            ? (id) => {
                                onOpenChange(false);
                                onSelectChannel(id);
                              }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights section */}
              {userId && (
                <HighlightsSection
                  userId={userId}
                  isOwnProfile={isOwnProfile}
                />
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
