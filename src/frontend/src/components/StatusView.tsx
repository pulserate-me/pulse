import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Plus, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Status, UserProfile } from "../backend";
import {
  useCommentOnStatus,
  useGetAllStories,
  useGetMyStatuses,
  useGetStatusInteractions,
  useLikeStatus,
  useUnlikeStatus,
} from "../hooks/useQueries";
import AddStatusModal from "./AddStatusModal";
import UserProfileModal from "./UserProfileModal";

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
  const videoRef = useRef<HTMLVideoElement>(null);

  const status = statuses[index];

  const { data: interactions } = useGetStatusInteractions(status?.id ?? null);
  const likeStatus = useLikeStatus();
  const unlikeStatus = useUnlikeStatus();
  const commentOnStatus = useCommentOnStatus();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run when index changes to reload video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [index]);

  if (!status) return null;

  const mediaKind = status.content.mediaType?.__kind__;
  const isVideo = mediaKind === "video";
  const isOwnStatus = authorUserId === currentUserId;

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

  const recentComments = interactions?.comments?.slice(-3) ?? [];
  const likeCount = Number(interactions?.likeCount ?? 0);

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

      {/* Content area */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
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
            className="max-w-full max-h-[70vh] object-contain rounded-xl relative z-20"
          />
        )}

        {/* Video — onCanPlay triggers play once video is ready, avoiding race conditions */}
        {status.content.mediaUrl && isVideo && (
          // biome-ignore lint/a11y/useMediaCaption: user-uploaded story video, captions unavailable
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
            className="max-w-full max-h-[70vh] object-contain rounded-xl relative z-20"
            style={{ WebkitTransform: "translateZ(0)" }}
          />
        )}

        {status.content.text && (
          <div
            className="px-8 py-6 rounded-2xl text-center text-white text-xl font-semibold max-w-sm relative z-20"
            style={{
              background: status.content.mediaUrl
                ? "oklch(0.0 0 0 / 0.5)"
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

      {/* Like / Comment bar */}
      <div
        className="shrink-0 z-30 px-4 pb-4 pt-2 flex flex-col gap-2"
        style={{ background: "oklch(0.05 0.005 55 / 0.9)" }}
      >
        {/* Recent comments */}
        {recentComments.length > 0 && (
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
            {recentComments.map((c) => (
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

          {/* Comment input */}
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
      </div>
    </motion.div>
  );
}

interface StatusViewProps {
  currentUserId: string;
  currentProfile: UserProfile | null;
  onStartChat?: (userId: string) => void;
}

export default function StatusView({
  currentUserId,
  currentProfile,
  onStartChat,
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

  const { data: myStatuses = [] } = useGetMyStatuses();
  const { data: allStories = [] } = useGetAllStories();

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
