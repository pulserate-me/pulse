import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Status, UserProfile } from "../backend";
import { createActor } from "../backend";
import type { StatusId } from "../backend";
import { useIcpPrice } from "../hooks/useIcpPrice";
import {
  useCommentOnStatus,
  useGetAllStories,
  useGetMyGoldBalance,
  useGetMyStatuses,
  useGetOnlineUsersWithProfiles,
  useGetStatusInteractions,
  useGetStoryViewersWithAvatars,
  useGiftGoldToStory,
  useLikeStatus,
  useListUserConversations,
  useUnlikeStatus,
} from "../hooks/useQueries";
import AddStatusModal from "./AddStatusModal";
import UserProfileModal from "./UserProfileModal";

// ─── Story Viewers panel ─────────────────────────────────────────────────────

function StoryViewersPanel({
  statusId,
  onClose,
}: {
  statusId: StatusId;
  onClose: () => void;
}) {
  const { data: viewers = [], isLoading } =
    useGetStoryViewersWithAvatars(statusId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[60] rounded-t-2xl flex flex-col w-full max-w-md"
      style={{
        background: "oklch(0.10 0.006 55)",
        border: "1px solid oklch(0.22 0.008 55 / 0.8)",
        maxHeight: "40vh",
      }}
      data-ocid="status.viewers_panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" style={{ color: "oklch(0.82 0.15 72)" }} />
          <span className="text-sm font-semibold text-white">
            {isLoading
              ? "Views"
              : `${viewers.length} View${viewers.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close viewers"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 py-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
          </div>
        ) : viewers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Users
              className="h-6 w-6 opacity-30"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
            <p className="text-xs text-white/40">No views yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {viewers.map((viewer) => (
              <div
                key={viewer.username}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0"
              >
                {viewer.avatarUrl ? (
                  <img
                    src={viewer.avatarUrl}
                    alt={viewer.username}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: "oklch(0.76 0.13 72 / 0.2)",
                      color: "oklch(0.82 0.15 72)",
                    }}
                  >
                    {viewer.username.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-white/80">
                  @{viewer.username}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const PAGE_SIZE = 19;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatStatusTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

// ─── Highlights hooks ────────────────────────────────────────────────────────

function useSaveToHighlights() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: StatusId) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (
        actor as ReturnType<typeof createActor>
      ).saveToHighlights(statusId);
      // Handle discriminated union { __kind__: "ok" } | { __kind__: "err"; err: string }
      if (result.__kind__ === "err") {
        throw new Error(result.err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
  });
}

function useRemoveFromHighlights() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: StatusId) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (
        actor as ReturnType<typeof createActor>
      ).removeFromHighlights(statusId);
      // Handle discriminated union { __kind__: "ok" } | { __kind__: "err"; err: string }
      if (result.__kind__ === "err") {
        throw new Error(result.err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
  });
}

// ─── Save/Remove Highlights button ──────────────────────────────────────────

function HighlightToggleButton({ statusId }: { statusId: StatusId }) {
  const { actor, isFetching } = useActor(createActor);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);

  // Check if this story is in highlights on mount via isHighlighted
  useEffect(() => {
    if (!actor || isFetching) return;
    let cancelled = false;
    (async () => {
      try {
        // isHighlighted(storyId: Nat): async Bool — added to backend
        const typedActor = actor as ReturnType<typeof createActor>;
        const result = await (
          typedActor as unknown as {
            isHighlighted: (id: StatusId) => Promise<boolean>;
          }
        ).isHighlighted(statusId);
        if (!cancelled) {
          setIsSaved(typeof result === "boolean" ? result : false);
        }
      } catch {
        if (!cancelled) setIsSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, statusId]);

  const saveToHighlights = useSaveToHighlights();
  const removeFromHighlights = useRemoveFromHighlights();
  const isPending =
    saveToHighlights.isPending || removeFromHighlights.isPending;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved); // optimistic
    if (isSaved) {
      removeFromHighlights.mutate(statusId, {
        onSuccess: () => toast.success("Removed from Highlights"),
        onError: (err) => {
          setIsSaved(true);
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to remove from Highlights",
          );
        },
      });
    } else {
      saveToHighlights.mutate(statusId, {
        onSuccess: () => toast.success("Saved to Highlights"),
        onError: (err) => {
          setIsSaved(false);
          toast.error(
            err instanceof Error ? err.message : "Failed to save to Highlights",
          );
        },
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending || isSaved === null}
      data-ocid="status.highlight_toggle"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
      style={{
        background: isSaved
          ? "oklch(0.82 0.15 72 / 0.2)"
          : "oklch(0.82 0.15 72 / 0.1)",
        color: "oklch(0.82 0.15 72)",
        border: "1px solid oklch(0.82 0.15 72 / 0.3)",
      }}
      aria-label={isSaved ? "Remove from Highlights" : "Save to Highlights"}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {isSaved ? "Remove from Highlights" : "Save to Highlights"}
    </button>
  );
}

// ─── Status Viewer ───────────────────────────────────────────────────────────

interface StatusViewerProps {
  profile: UserProfile;
  authorUserId: string;
  statuses: Status[];
  currentUserId: string;
  onClose: () => void;
  onAvatarClick: (userId: string) => void;
}

function StatusViewer({
  profile,
  authorUserId,
  statuses,
  currentUserId,
  onClose,
  onAvatarClick,
}: StatusViewerProps) {
  const [index, setIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState("");
  const [giftError, setGiftError] = useState("");
  const [giftCurrency, setGiftCurrency] = useState<"gold" | "usd">("gold");
  const videoRef = useRef<HTMLVideoElement>(null);

  const status = statuses[index];
  const isOwnStatus = authorUserId === currentUserId;

  const { data: interactions } = useGetStatusInteractions(status?.id ?? null);
  const likeStatus = useLikeStatus();
  const unlikeStatus = useUnlikeStatus();
  const commentOnStatus = useCommentOnStatus();
  const giftGold = useGiftGoldToStory();
  const { data: rawBalance } = useGetMyGoldBalance();
  const { actor } = useActor(createActor);
  const { price: icpPrice, loading: icpPriceLoading } = useIcpPrice();
  const goldBalance =
    rawBalance !== undefined ? Number(rawBalance) / 10000 : null;

  // Record a view whenever a new story slide is shown — skip the story owner's own views
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when index/status changes
  useEffect(() => {
    if (!actor || !status || isOwnStatus) return;
    actor.recordStoryView(status.id).catch(() => {
      // Silently ignore — view recording is best-effort
    });
  }, [actor, status?.id, index, isOwnStatus]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when index changes to reload video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [index]);

  if (!status) return null;

  const mediaKind = status.content.mediaType?.__kind__;
  const isVideo = mediaKind === "video";

  const goNext = () => {
    if (index < statuses.length - 1) setIndex(index + 1);
    else onClose();
  };

  const handleLike = () => {
    if (interactions?.likedByMe) {
      unlikeStatus.mutate(status.id);
    } else {
      likeStatus.mutate(status.id);
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentOnStatus.mutate(
      { statusId: status.id, text: commentText.trim() },
      { onSuccess: () => setCommentText("") },
    );
  };

  const handleGiftGold = async () => {
    const rawAmt = Number.parseFloat(giftAmount);
    if (Number.isNaN(rawAmt) || !rawAmt) {
      setGiftError("Please enter a valid amount");
      return;
    }

    const goldAmt =
      giftCurrency === "usd"
        ? icpPrice != null
          ? rawAmt / icpPrice
          : null
        : rawAmt;

    if (goldAmt === null) {
      setGiftError("Price unavailable, please try again");
      return;
    }

    if (goldAmt < 0.01) {
      if (giftCurrency === "usd" && icpPrice != null) {
        setGiftError(
          `Minimum gift is 0.01 Pulse (≈ $${(0.01 * icpPrice).toFixed(4)})`,
        );
      } else {
        setGiftError("Minimum gift is 0.01 Pulse");
      }
      return;
    }

    if (goldBalance !== null && goldBalance < goldAmt) {
      setGiftError("Insufficient Pulse balance");
      return;
    }
    setGiftError("");
    try {
      await giftGold.mutateAsync({
        statusId: status.id,
        amount: BigInt(Math.round(goldAmt * 10000)),
      });
      toast.success(`Gifted ${goldAmt.toFixed(4)} Pulse successfully!`);
      setGiftOpen(false);
      setGiftAmount("");
      setGiftCurrency("gold");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to gift Pulse");
    }
  };

  const likeCount = Number(interactions?.likeCount ?? 0);
  // viewCount: use live value from interactions (backend stores view count in storyViews stable map)
  const viewCount = Number(interactions?.viewCount ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "oklch(0.05 0.005 55)" }}
      data-ocid="status.modal"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 relative z-30">
        <button
          type="button"
          aria-label="View profile"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
          onClick={() => onAvatarClick(authorUserId)}
          data-ocid="status.avatar_button"
        >
          <Avatar className="w-10 h-10">
            {profile.avatarUrl && (
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            )}
            <AvatarFallback
              style={{
                background: "oklch(0.76 0.13 72 / 0.3)",
                color: "oklch(0.82 0.15 72)",
              }}
            >
              {getInitials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white">
            {profile.displayName}
          </p>
          <p className="text-xs" style={{ color: "oklch(0.65 0.05 72)" }}>
            {formatStatusTime(status.timestamp)}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-9 w-9 rounded-full text-white hover:bg-white/10"
          data-ocid="status.close_button"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress bars */}
      {statuses.length > 1 && (
        <div className="flex gap-1 px-4 mb-2 relative z-30">
          {statuses.map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: index is stable here
              key={i}
              className="flex-1 h-0.5 rounded-full"
              style={{
                background:
                  i <= index ? "oklch(0.82 0.15 72)" : "oklch(0.4 0.005 55)",
              }}
            />
          ))}
        </div>
      )}

      {/* Content area — flex-1 so it fills available space between header and action bar;
           items-start + pt-2 ensures the very top of media is never clipped.
           overflow-y-auto allows scrolling if content is tall. */}
      <div className="flex-1 relative flex flex-col items-center justify-start overflow-y-auto min-h-0 pt-2 pb-2">
        {/* Tap zones for prev/next — behind media (z-10) */}
        {index > 0 && (
          <button
            type="button"
            className="absolute left-0 top-0 w-1/4 h-full z-10"
            onClick={() => setIndex(index - 1)}
            aria-label="Previous story"
          />
        )}
        <button
          type="button"
          className="absolute right-0 top-0 w-1/4 h-full z-10"
          onClick={goNext}
          aria-label="Next story"
        />

        {/* Image */}
        {status.content.mediaUrl && mediaKind === "image" && (
          <img
            src={status.content.mediaUrl}
            alt="Story"
            className="max-w-full object-contain rounded-xl relative z-20"
            style={{ maxHeight: "55vh" }}
          />
        )}

        {/* Video — onCanPlay triggers play once video is ready, avoiding race conditions */}
        {status.content.mediaUrl && isVideo && (
          <video
            ref={videoRef}
            key={String(status.id)}
            src={status.content.mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            data-webkit-playsinline="true"
            onCanPlay={() => {
              videoRef.current?.play().catch(() => {});
            }}
            className="max-w-full object-contain rounded-xl relative z-20"
            style={{ maxHeight: "55vh", WebkitTransform: "translateZ(0)" }}
          />
        )}

        {/* Caption — shown below media, always fully visible */}
        {status.content.text && (
          <div
            className="mt-3 mx-4 px-5 py-3 rounded-2xl text-center text-white text-base font-semibold max-w-sm relative z-20 shrink-0"
            style={{
              background: status.content.mediaUrl
                ? "oklch(0.0 0 0 / 0.6)"
                : "linear-gradient(135deg, oklch(0.25 0.04 72), oklch(0.18 0.03 65))",
            }}
          >
            {status.content.text}
          </div>
        )}

        {/* Center tap zone (only when not video) */}
        {!isVideo && (
          <button
            type="button"
            className="absolute inset-0 z-0"
            onClick={goNext}
            aria-label="Next story"
          />
        )}
      </div>

      {/* Like / Comment / Highlight bar */}
      <div
        className="shrink-0 z-30 px-4 pb-4 pt-2 flex flex-col gap-2 relative"
        style={{ background: "oklch(0.05 0.005 55 / 0.9)" }}
      >
        {/* Story viewers panel (own stories only) — fixed overlay, works on all screen sizes */}
        <AnimatePresence>
          {showViewers && isOwnStatus && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[59]"
                style={{ background: "oklch(0.0 0 0 / 0.4)" }}
                onClick={() => setShowViewers(false)}
              />
              <StoryViewersPanel
                statusId={status.id}
                onClose={() => setShowViewers(false)}
              />
            </>
          )}
        </AnimatePresence>

        {/* Comments — newest shown first; scroll down to see earlier ones */}
        {interactions?.comments && interactions.comments.length > 0 && (
          <div className="flex flex-col-reverse gap-1 max-h-20 overflow-y-auto shrink-0">
            {[...interactions.comments].reverse().map((c) => (
              <div key={String(c.id)} className="flex items-start gap-2">
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                >
                  {c.author.displayName}
                </span>
                <span className="text-xs text-white/80">{c.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Like button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isOwnStatus}
            className="flex items-center gap-1.5 shrink-0 disabled:opacity-40"
            data-ocid="status.toggle"
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

          {/* View count — visible to ALL users; clickable for own story to see who viewed */}
          {isOwnStatus ? (
            <button
              type="button"
              onClick={() => setShowViewers((v) => !v)}
              className="flex items-center gap-1 transition-opacity hover:opacity-80"
              data-ocid="status.view_count"
              aria-label="See who viewed this story"
              title="See who viewed"
            >
              <Eye
                className="h-4 w-4"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                {viewCount}
              </span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1"
              data-ocid="status.view_count"
            >
              <Eye
                className="h-4 w-4"
                style={{ color: "oklch(0.65 0.05 72)" }}
              />
              <span
                className="text-xs"
                style={{ color: "oklch(0.65 0.05 72)" }}
              >
                {viewCount}
              </span>
            </div>
          )}

          {/* Gift Gold button (non-owner only) */}
          {!isOwnStatus && (
            <button
              type="button"
              onClick={() => {
                setGiftOpen(true);
                setGiftAmount("");
                setGiftError("");
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors shrink-0"
              style={{
                background: "oklch(0.82 0.15 72 / 0.15)",
                border: "1px solid oklch(0.82 0.15 72 / 0.35)",
              }}
              data-ocid="status.gift_button"
              aria-label="Gift Pulse"
            >
              <Coins
                className="h-4 w-4"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                Gift
              </span>
            </button>
          )}

          {/* Comment input (non-owner only) */}
          {!isOwnStatus && (
            <>
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a comment…"
                className="flex-1 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm rounded-full px-4"
                data-ocid="status.input"
              />
              <Button
                size="icon"
                disabled={!commentText.trim() || commentOnStatus.isPending}
                onClick={handleComment}
                className="h-9 w-9 rounded-full shrink-0"
                style={{
                  background: commentText.trim()
                    ? "oklch(0.82 0.15 72)"
                    : "oklch(0.3 0.01 55)",
                  color: "oklch(0.08 0.004 55)",
                }}
                data-ocid="status.submit_button"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Save to Highlights — own stories only */}
        {isOwnStatus && (
          <div className="flex justify-center pt-1">
            <HighlightToggleButton statusId={status.id} />
          </div>
        )}
      </div>

      {/* Gift Gold Dialog */}
      <Dialog
        open={giftOpen}
        onOpenChange={(open) => {
          setGiftOpen(open);
          if (!open) {
            setGiftAmount("");
            setGiftError("");
            setGiftCurrency("gold");
          }
        }}
      >
        <DialogContent
          data-ocid="status.gift.dialog"
          className="bg-card border-border max-w-sm"
          style={{ zIndex: 100 }}
        >
          <DialogHeader>
            <DialogTitle
              className="font-display flex items-center gap-2"
              style={{ color: "oklch(0.82 0.15 72)" }}
            >
              <Coins
                className="h-5 w-5"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
              Gift Pulse
            </DialogTitle>
          </DialogHeader>
          {goldBalance !== null && (
            <p className="text-xs text-muted-foreground -mt-1">
              Your balance:{" "}
              <span
                className="font-semibold"
                style={{ color: "oklch(0.82 0.15 72)" }}
              >
                {goldBalance.toFixed(4)} Pulse
              </span>
            </p>
          )}
          {/* Currency toggle */}
          <div
            className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: "oklch(0.82 0.15 72 / 0.25)" }}
          >
            <button
              type="button"
              onClick={() => {
                setGiftCurrency("gold");
                setGiftAmount("");
                setGiftError("");
              }}
              className="flex-1 py-1.5 text-xs font-semibold transition-colors"
              style={
                giftCurrency === "gold"
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }
                  : {
                      background: "oklch(0.10 0.01 55)",
                      color: "oklch(0.55 0.04 55)",
                    }
              }
              data-ocid="status.gift.tab_gold"
            >
              ✦ Pulse
            </button>
            <button
              type="button"
              onClick={() => {
                setGiftCurrency("usd");
                setGiftAmount("");
                setGiftError("");
              }}
              className="flex-1 py-1.5 text-xs font-semibold transition-colors"
              style={
                giftCurrency === "usd"
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }
                  : {
                      background: "oklch(0.10 0.01 55)",
                      color: "oklch(0.55 0.04 55)",
                    }
              }
              data-ocid="status.gift.tab_usd"
            >
              $ USD
            </button>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="relative">
              {giftCurrency === "usd" && (
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                >
                  $
                </span>
              )}
              <Input
                data-ocid="status.gift.input"
                type="number"
                min="0.01"
                step="0.0001"
                placeholder="0.0100"
                value={giftAmount}
                onChange={(e) => {
                  setGiftAmount(e.target.value);
                  setGiftError("");
                }}
                className={`bg-input border-border${giftCurrency === "usd" ? " pl-7" : ""}`}
                style={{
                  borderColor: giftError ? "oklch(0.65 0.25 25)" : undefined,
                }}
              />
            </div>
            {/* Live equivalent */}
            {giftAmount && !Number.isNaN(Number.parseFloat(giftAmount)) && (
              <p className="text-xs" style={{ color: "oklch(0.65 0.05 72)" }}>
                {icpPriceLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading price…
                  </span>
                ) : icpPrice != null ? (
                  giftCurrency === "gold" ? (
                    <>
                      ≈ ${(Number.parseFloat(giftAmount) * icpPrice).toFixed(2)}{" "}
                      USD
                    </>
                  ) : (
                    <>
                      ≈ {(Number.parseFloat(giftAmount) / icpPrice).toFixed(4)}{" "}
                      Pulse
                    </>
                  )
                ) : (
                  "Price unavailable"
                )}
              </p>
            )}
            {giftError && (
              <p
                className="text-xs"
                style={{ color: "oklch(0.65 0.25 25)" }}
                data-ocid="status.gift.error_state"
              >
                {giftError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <Button
              variant="ghost"
              onClick={() => setGiftOpen(false)}
              disabled={giftGold.isPending}
              data-ocid="status.gift.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGiftGold}
              disabled={
                giftGold.isPending ||
                !giftAmount ||
                (icpPriceLoading && giftCurrency === "usd") ||
                (() => {
                  const raw = Number.parseFloat(giftAmount);
                  if (!raw || Number.isNaN(raw)) return true;
                  const gold =
                    giftCurrency === "usd"
                      ? icpPrice != null
                        ? raw / icpPrice
                        : null
                      : raw;
                  return gold === null || gold < 0.01;
                })()
              }
              data-ocid="status.gift.submit_button"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {giftGold.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Pulse"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Online Users Section ──────────────────────────────────────────────────

const ONLINE_PAGE_SIZE = 9;

function OnlineUsersSection({
  enabled,
  currentUserId,
  onStartChat,
}: {
  enabled: boolean;
  currentUserId: string;
  onStartChat?: (userId: string) => void;
}) {
  const [onlinePage, setOnlinePage] = useState(1);
  const [filter, setFilter] = useState<"all" | "myConversations">("all");
  const { data: onlineUsers = [], isLoading: onlineLoading } =
    useGetOnlineUsersWithProfiles(enabled);
  const { data: conversations = [] } = useListUserConversations();

  // Build a set of DM partner userIds for fast lookup
  const dmPartnerIds = new Set<string>(
    conversations
      .filter((c) => c.type.__kind__ === "direct")
      .flatMap((c) =>
        c.members
          .map((m) =>
            typeof m === "string" ? m : (m as { toText(): string }).toText(),
          )
          .filter((id) => id !== currentUserId),
      ),
  );

  // Filter out self first, then apply the tab filter
  const withoutSelf = onlineUsers.filter((u) => u.userId !== currentUserId);
  const filteredOnline =
    filter === "myConversations"
      ? withoutSelf.filter((u) => dmPartnerIds.has(u.userId))
      : withoutSelf;

  const visibleOnline = filteredOnline.slice(0, onlinePage * ONLINE_PAGE_SIZE);
  const hasMoreOnline = filteredOnline.length > onlinePage * ONLINE_PAGE_SIZE;

  // Reset page when filter changes
  const handleFilterChange = (next: "all" | "myConversations") => {
    setFilter(next);
    setOnlinePage(1);
  };

  return (
    <div
      className="mt-auto px-4 pt-4 pb-5 border-t border-border"
      data-ocid="online_users.section"
    >
      {/* Section heading + filter pill */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="w-2 h-2 rounded-full shrink-0 animate-pulse"
          style={{ background: "oklch(0.72 0.19 145)" }}
          aria-hidden="true"
        />
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ letterSpacing: "0.1em", color: "oklch(0.72 0.19 145)" }}
        >
          Online Now
        </p>
        {!onlineLoading && withoutSelf.length > 0 && (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: "oklch(0.72 0.19 145 / 0.15)",
              color: "oklch(0.72 0.19 145)",
            }}
          >
            {withoutSelf.length}
          </span>
        )}
        {/* Compact pill filter — only shown when there are users online */}
        {!onlineLoading && withoutSelf.length > 0 && (
          <div
            className="ml-auto flex rounded-full overflow-hidden"
            style={{
              border: "1px solid oklch(0.82 0.15 72 / 0.25)",
              background: "oklch(0.10 0.008 55)",
            }}
            role="toolbar"
            aria-label="Filter online users"
          >
            <button
              type="button"
              data-ocid="online_users.filter.all"
              onClick={() => handleFilterChange("all")}
              className="px-2.5 py-1 text-[10px] font-semibold transition-colors"
              style={
                filter === "all"
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }
                  : { color: "oklch(0.55 0.04 55)" }
              }
              aria-pressed={filter === "all"}
            >
              All
            </button>
            <button
              type="button"
              data-ocid="online_users.filter.conversations"
              onClick={() => handleFilterChange("myConversations")}
              className="px-2.5 py-1 text-[10px] font-semibold transition-colors"
              style={
                filter === "myConversations"
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                      color: "oklch(0.08 0.004 55)",
                    }
                  : { color: "oklch(0.55 0.04 55)" }
              }
              aria-pressed={filter === "myConversations"}
            >
              My Chats
            </button>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {onlineLoading && (
        <div className="grid grid-cols-3 gap-2">
          {(["a", "b", "c", "d", "e", "f"] as const).map((k) => (
            <div
              key={k}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl"
              style={{ background: "oklch(0.14 0.006 55 / 0.6)" }}
            >
              <div
                className="w-11 h-11 rounded-full animate-pulse"
                style={{ background: "oklch(0.22 0.008 55)" }}
              />
              <div
                className="h-2.5 w-12 rounded-full animate-pulse"
                style={{ background: "oklch(0.22 0.008 55)" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!onlineLoading && filteredOnline.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-5 gap-2"
          data-ocid="online_users.empty_state"
        >
          <Wifi
            className="h-6 w-6 opacity-25"
            style={{ color: "oklch(0.72 0.19 145)" }}
          />
          <p className="text-xs text-muted-foreground/60 text-center">
            {filter === "myConversations"
              ? "None of your contacts are online"
              : "No one online right now"}
          </p>
        </div>
      )}

      {/* User grid */}
      {!onlineLoading && visibleOnline.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {visibleOnline.map((user, idx) => (
            <button
              type="button"
              key={user.userId}
              data-ocid={`online_users.item.${idx + 1}`}
              onClick={() => onStartChat?.(user.userId)}
              className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2"
              style={{
                background: "oklch(0.14 0.006 55 / 0.6)",
                border: "1px solid oklch(0.20 0.007 55 / 0.8)",
              }}
              aria-label={`Start chat with ${user.displayName || user.username}`}
              title={`Chat with @${user.username}`}
            >
              {/* Avatar with online dot */}
              <div className="relative">
                <Avatar className="w-11 h-11">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  )}
                  <AvatarFallback
                    className="text-sm font-bold"
                    style={{
                      background: "oklch(0.76 0.13 72 / 0.2)",
                      color: "oklch(0.82 0.15 72)",
                    }}
                  >
                    {(user.displayName || user.username)
                      .slice(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator dot */}
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar"
                  style={{ background: "oklch(0.72 0.19 145)" }}
                  aria-hidden="true"
                />
              </div>
              {/* Username */}
              <span
                className="text-xs font-medium truncate w-full text-center leading-tight"
                style={{ color: "oklch(0.85 0.01 55)" }}
              >
                {user.displayName || user.username}
              </span>
              {/* Chat icon on hover */}
              <MessageCircle
                className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ color: "oklch(0.72 0.19 145)" }}
              />
            </button>
          ))}
        </div>
      )}

      {/* View more */}
      {hasMoreOnline && (
        <button
          type="button"
          data-ocid="online_users.pagination_next"
          onClick={() => setOnlinePage((p) => p + 1)}
          className="w-full mt-3 py-2.5 text-xs font-semibold text-center rounded-xl transition-colors hover:bg-muted/30"
          style={{ color: "oklch(0.72 0.19 145)" }}
        >
          View more (
          {Math.min(
            ONLINE_PAGE_SIZE,
            filteredOnline.length - onlinePage * ONLINE_PAGE_SIZE,
          )}{" "}
          more)
        </button>
      )}
    </div>
  );
}

// ─── Main StatusView ─────────────────────────────────────────────────────────

interface StatusViewProps {
  currentUserId: string;
  currentProfile: UserProfile | null;
  enabled?: boolean;
  onStartChat?: (userId: string) => void;
  onSelectChannel?: (id: import("../hooks/useQueries").ChannelId) => void;
}

export default function StatusView({
  currentUserId,
  currentProfile,
  enabled = true,
  onStartChat,
  onSelectChannel,
}: StatusViewProps) {
  const [addStatusOpen, setAddStatusOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<{
    profile: UserProfile;
    authorUserId: string;
    statuses: Status[];
  } | null>(null);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(
    null,
  );
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: myStatuses = [] } = useGetMyStatuses(enabled);
  const { data: allStories = [] } = useGetAllStories(enabled);

  // Filter out current user's own stories from the all-stories list
  const otherStories = allStories.filter(
    ([, statuses]) =>
      statuses.length > 0 && statuses[0].author.toText() !== currentUserId,
  );

  const visibleStories = otherStories.slice(0, page * PAGE_SIZE);
  const hasMore = otherStories.length > page * PAGE_SIZE;

  const myLatest = myStatuses[myStatuses.length - 1];
  const myName = currentProfile?.displayName ?? "Me";

  const handleAvatarClick = (userId: string) => {
    setProfileViewUserId(userId);
    setProfileViewOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* My Story */}
      <div className="px-4 py-3 border-b border-border">
        <p
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
          style={{ letterSpacing: "0.1em" }}
        >
          My Story
        </p>
        <button
          type="button"
          data-ocid="status.primary_button"
          className="flex items-center gap-3 w-full text-left hover:bg-muted/30 rounded-xl px-2 py-2 transition-colors"
          onClick={() => {
            if (myStatuses.length > 0 && currentProfile) {
              setViewingUser({
                profile: currentProfile,
                authorUserId: currentUserId,
                statuses: myStatuses,
              });
            } else {
              setAddStatusOpen(true);
            }
          }}
        >
          <div className="relative">
            <Avatar className="w-12 h-12">
              {currentProfile?.avatarUrl && (
                <AvatarImage src={currentProfile.avatarUrl} alt={myName} />
              )}
              <AvatarFallback
                className="text-sm font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
                  color: "oklch(0.82 0.15 72)",
                  border:
                    myStatuses.length > 0
                      ? "2px solid oklch(0.82 0.15 72)"
                      : "2px solid oklch(0.3 0.01 55)",
                }}
              >
                {getInitials(myName)}
              </AvatarFallback>
            </Avatar>
            {myStatuses.length === 0 && (
              <div
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-sidebar"
                style={{ background: "oklch(0.82 0.15 72)" }}
              >
                <Plus
                  className="h-3 w-3"
                  style={{ color: "oklch(0.08 0.004 55)" }}
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">My Story</p>
            <p className="text-xs text-muted-foreground">
              {myStatuses.length > 0
                ? `${myStatuses.length} update${myStatuses.length !== 1 ? "s" : ""} · ${formatStatusTime(myLatest.timestamp)}`
                : "Tap to add a story"}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full hover:bg-muted shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setAddStatusOpen(true);
            }}
            data-ocid="status.open_modal_button"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </button>
      </div>

      {/* Recent Stories */}
      {otherStories.length > 0 && (
        <div className="px-4 py-3">
          <p
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2"
            style={{ letterSpacing: "0.1em" }}
          >
            Recent Stories
          </p>
          <div className="flex flex-col gap-1">
            {visibleStories.map(([profile, statuses], idx) => {
              if (!statuses.length) return null;
              const latest = statuses[statuses.length - 1];
              const ocid = idx + 1;
              const authorUserId = statuses[0].author.toText();
              return (
                <button
                  type="button"
                  key={profile.username}
                  data-ocid={`status.item.${ocid}`}
                  className="flex items-center gap-3 w-full text-left hover:bg-muted/30 rounded-xl px-2 py-2 transition-colors"
                  onClick={() =>
                    setViewingUser({ profile, authorUserId, statuses })
                  }
                >
                  <Avatar className="w-12 h-12">
                    {profile.avatarUrl && (
                      <AvatarImage
                        src={profile.avatarUrl}
                        alt={profile.displayName}
                      />
                    )}
                    <AvatarFallback
                      className="text-sm font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
                        color: "oklch(0.82 0.15 72)",
                        border: "2px solid oklch(0.82 0.15 72)",
                      }}
                    >
                      {getInitials(profile.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {profile.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatStatusTime(latest.timestamp)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {hasMore && (
            <button
              type="button"
              data-ocid="status.pagination_next"
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 mt-1 text-xs font-semibold text-center transition-colors hover:bg-muted/30 rounded-xl"
              style={{ color: "oklch(0.82 0.15 72)" }}
            >
              Show {Math.min(PAGE_SIZE, otherStories.length - page * PAGE_SIZE)}{" "}
              more
            </button>
          )}
        </div>
      )}

      {otherStories.length === 0 && myStatuses.length === 0 && (
        <div
          data-ocid="status.empty_state"
          className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3 opacity-30"
            style={{ background: "oklch(0.76 0.13 72 / 0.2)" }}
          >
            <Plus
              className="h-7 w-7"
              style={{ color: "oklch(0.82 0.15 72)" }}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No stories yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Be the first to share a story
          </p>
        </div>
      )}

      {/* ─── Online Users Section ─────────────────────────────────────── */}
      <OnlineUsersSection
        enabled={enabled}
        currentUserId={currentUserId}
        onStartChat={onStartChat}
      />

      <AddStatusModal open={addStatusOpen} onOpenChange={setAddStatusOpen} />

      {/* Profile modal triggered by avatar click inside story viewer */}
      <UserProfileModal
        userId={profileViewUserId}
        open={profileViewOpen}
        onOpenChange={setProfileViewOpen}
        onStartChat={(userId) => {
          setProfileViewOpen(false);
          onStartChat?.(userId);
        }}
        onSelectChannel={
          onSelectChannel
            ? (id) => {
                setProfileViewOpen(false);
                onSelectChannel(id);
              }
            : undefined
        }
        currentUserId={currentUserId}
      />

      <AnimatePresence>
        {viewingUser && (
          <StatusViewer
            profile={viewingUser.profile}
            authorUserId={viewingUser.authorUserId}
            statuses={viewingUser.statuses}
            currentUserId={currentUserId}
            onClose={() => setViewingUser(null)}
            onAvatarClick={handleAvatarClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
