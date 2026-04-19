import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  Edit,
  Image,
  Link,
  Loader2,
  Mic,
  MoreVertical,
  Pin,
  Send,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaUpload } from "../hooks/useMediaUpload";
import {
  useAddChannelPost,
  useDeleteChannel,
  useFollowChannel,
  useGetChannel,
  useGetChannelPosts,
  usePinChannelPost,
  useUnfollowChannel,
  useUnpinChannelPost,
  useUpdateChannel,
} from "../hooks/useQueries";
import type { ChannelId } from "../hooks/useQueries";
import { markChannelAsViewed } from "../lib/channelUtils";
import ChannelPostCard from "./ChannelPostCard";

const POSTS_PAGE_SIZE = 9;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function detectEmbedPlatform(url: string): "youtube" | "x" | "tiktok" | null {
  if (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts/")
  )
    return "youtube";
  if (url.includes("twitter.com/") || url.includes("x.com/")) return "x";
  if (url.includes("tiktok.com/") || url.includes("vt.tiktok.com"))
    return "tiktok";
  return null;
}

const CHANNEL_CATEGORIES = [
  "Music",
  "Finance",
  "Sports",
  "News",
  "Entertainment",
  "Technology",
  "Health",
  "Education",
  "Other",
] as const;

function EditChannelModal({
  open,
  onOpenChange,
  channelId,
  initialName,
  initialDescription,
  initialAvatarUrl,
  initialCategory,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channelId: ChannelId;
  initialName: string;
  initialDescription: string;
  initialAvatarUrl?: string;
  initialCategory?: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialAvatarUrl ?? null,
  );
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: updateChannel, isPending } = useUpdateChannel();
  const { uploadMedia, isUploading } = useMediaUpload();
  const isBusy = isPending || isUploading;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      let avatarUrl = initialAvatarUrl;
      if (pendingAvatar) {
        const result = await uploadMedia(pendingAvatar);
        avatarUrl = result.url;
      }
      await updateChannel({
        channelId,
        name: name.trim(),
        description: description.trim(),
        avatarUrl,
        category: category || undefined,
      });
      toast.success("Channel updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update channel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="channel.edit.dialog"
        className="bg-card border-border max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Edit Channel
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex justify-center">
            <button
              type="button"
              className="relative group"
              onClick={() => fileRef.current?.click()}
              disabled={isBusy}
            >
              <Avatar className="w-20 h-20">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt="avatar" />
                )}
                <AvatarFallback
                  className="text-2xl font-bold"
                  style={{
                    background: "oklch(0.76 0.13 72 / 0.3)",
                    color: "oklch(0.82 0.15 72)",
                  }}
                >
                  {getInitials(name || "CH")}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "oklch(0 0 0 / 0.5)" }}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPendingAvatar(f);
                  setAvatarPreview(URL.createObjectURL(f));
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">
              Channel Name
            </Label>
            <Input
              data-ocid="channel.edit.input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input border-border"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Description</Label>
            <Textarea
              data-ocid="channel.edit.textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border resize-none h-20"
              maxLength={300}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Category</Label>
            <div className="relative">
              <select
                data-ocid="channel.edit.category_select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isBusy}
                className="w-full h-9 rounded-md px-3 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1"
                style={{
                  background: "oklch(0.16 0.015 55)",
                  border: "1px solid oklch(0.3 0.01 55)",
                  color: category ? "oklch(0.9 0.01 55)" : "oklch(0.5 0.02 55)",
                }}
              >
                <option value="">No category</option>
                {CHANNEL_CATEGORIES.map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                    style={{
                      background: "oklch(0.16 0.015 55)",
                      color: "oklch(0.9 0.01 55)",
                    }}
                  >
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                style={{ color: "oklch(0.5 0.02 55)" }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            data-ocid="channel.edit.cancel_button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            data-ocid="channel.edit.save_button"
            onClick={handleSubmit}
            disabled={isBusy || !name.trim()}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
              color: "oklch(0.08 0.004 55)",
            }}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChannelViewProps {
  channelId: ChannelId;
  currentUserId: string;
  onBack: () => void;
}

export default function ChannelView({
  channelId,
  currentUserId,
  onBack,
}: ChannelViewProps) {
  const { data: channelMeta, isLoading: channelLoading } =
    useGetChannel(channelId);
  const { data: posts = [], isLoading: postsLoading } =
    useGetChannelPosts(channelId);
  const { mutate: follow, isPending: following } = useFollowChannel();
  const { mutate: unfollow, isPending: unfollowing } = useUnfollowChannel();
  const { mutateAsync: addPost, isPending: posting } =
    useAddChannelPost(channelId);
  const { uploadMedia, isUploading } = useMediaUpload();
  const { mutate: pinPost } = usePinChannelPost(channelId);
  const { mutate: unpinPost } = useUnpinChannelPost(channelId);

  const [postText, setPostText] = useState("");
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const { mutateAsync: deleteChannel, isPending: deleting } =
    useDeleteChannel();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Embed URL state
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");

  // Mark channel as viewed when opened so unread badge clears
  useEffect(() => {
    markChannelAsViewed(channelId.toString());
  }, [channelId]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        for (const t of mediaRecorderRef.current.stream.getTracks()) {
          t.stop();
        }
      }
    };
  }, []);

  const isBusy = posting || isUploading;

  const detectedPlatform = embedUrl.trim()
    ? detectEmbedPlatform(embedUrl.trim())
    : null;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      for (const t of mediaRecorderRef.current.stream.getTracks()) {
        t.stop();
      }
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    recordingChunksRef.current = [];
  }, [stopRecording]);

  const sendRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    // Stop and collect remaining data
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state === "recording") {
        recorder.stop();
        for (const t of recorder.stream.getTracks()) {
          t.stop();
        }
      } else {
        resolve();
      }
    });

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);

    const mimeType = recorder.mimeType || "audio/webm";
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    recordingChunksRef.current = [];
    const ext = mimeType.includes("ogg") ? "ogg" : "webm";
    const audioFile = new File([blob], `audio_recording.${ext}`, {
      type: mimeType,
    });

    try {
      const result = await uploadMedia(audioFile);
      await addPost({
        text: postText.trim(),
        mediaUrl: result.url,
        mediaType: result.mediaType,
      });
      setPostText("");
      setPendingMedia(null);
      setPostsPage(1);
      toast.success("Post published!");
    } catch {
      toast.error("Failed to publish post");
    }
  }, [addPost, uploadMedia, postText]);

  if (channelLoading) {
    return (
      <div
        data-ocid="channel.view.loading_state"
        className="flex flex-col h-full"
      >
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!channelMeta) {
    return (
      <div
        data-ocid="channel.view.error_state"
        className="flex-1 flex items-center justify-center text-muted-foreground"
      >
        Channel not found
      </div>
    );
  }

  const { channel, followerCount, isFollowing, ownerProfile } = channelMeta;
  const isOwner = channel.owner.toString() === currentUserId;

  // Pinned post ID — handle both Candid [] | [bigint] and plain bigint shapes at runtime
  const rawPinnedPost = channel?.pinnedPostId as
    | ([] | [bigint])
    | bigint
    | undefined;
  const pinnedPostId: bigint | null =
    rawPinnedPost == null
      ? null
      : Array.isArray(rawPinnedPost)
        ? rawPinnedPost.length > 0
          ? (rawPinnedPost[0] ?? null)
          : null
        : rawPinnedPost;
  const pinnedPost = pinnedPostId
    ? (posts.find((p) => p.id === pinnedPostId) ?? null)
    : null;

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollow(channelId);
    } else {
      follow(channelId);
    }
  };

  const handlePost = async () => {
    const hasEmbed = embedUrl.trim() && detectedPlatform;
    if (!postText.trim() && !pendingMedia && !hasEmbed) return;
    try {
      let mediaUrl: string | undefined;
      let mediaType: import("../backend").MediaType | undefined;

      if (hasEmbed) {
        mediaUrl = embedUrl.trim();
        const platformMap: Record<string, string> = {
          youtube: "embedYouTube",
          x: "embedX",
          tiktok: "embedTikTok",
        };
        mediaType = {
          __kind__: "other",
          other: platformMap[detectedPlatform!],
        };
      } else if (pendingMedia) {
        const result = await uploadMedia(pendingMedia);
        mediaUrl = result.url;
        mediaType = result.mediaType;
      }

      await addPost({
        text: postText.trim(),
        mediaUrl,
        mediaType,
      });
      setPostText("");
      setPendingMedia(null);
      setEmbedUrl("");
      setShowEmbedInput(false);
      setPostsPage(1);
      toast.success("Post published!");
    } catch {
      toast.error("Failed to publish post");
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sortedPosts = [...posts].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );

  const visiblePosts = sortedPosts.slice(0, postsPage * POSTS_PAGE_SIZE);
  const hasMorePosts = sortedPosts.length > postsPage * POSTS_PAGE_SIZE;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Channel header */}
      <div
        className="shrink-0 border-b border-border px-4 py-3"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.12 0.01 55), oklch(0.10 0.008 55))",
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="h-9 w-9 rounded-xl hover:bg-muted md:hidden"
            data-ocid="channel.view.button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Avatar className="w-12 h-12 shrink-0">
            {channel.avatarUrl && (
              <AvatarImage src={channel.avatarUrl} alt={channel.name} />
            )}
            <AvatarFallback
              className="text-lg font-bold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
                color: "oklch(0.82 0.15 72)",
              }}
            >
              {getInitials(channel.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-lg text-foreground truncate">
              {channel.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{Number(followerCount)} followers</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl hover:bg-muted"
                      data-ocid="channel.view.open_modal_button"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-card border-border"
                  >
                    <DropdownMenuItem
                      onClick={() => setEditOpen(true)}
                      className="cursor-pointer"
                      data-ocid="channel.view.edit_button"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Channel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                      data-ocid="channel.view.delete_button"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Channel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialog
                  open={deleteConfirmOpen}
                  onOpenChange={setDeleteConfirmOpen}
                >
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{channel.name}"? This
                        action cannot be undone and all posts will be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="channel.delete.cancel_button">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        data-ocid="channel.delete.confirm_button"
                        disabled={deleting}
                        onClick={async () => {
                          try {
                            await deleteChannel(channelId);
                            toast.success("Channel deleted");
                            onBack();
                          } catch {
                            toast.error("Failed to delete channel");
                          }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {!isOwner && (
              <Button
                onClick={handleFollowToggle}
                disabled={following || unfollowing}
                size="sm"
                data-ocid="channel.view.toggle"
                style={{
                  background: isFollowing
                    ? "oklch(0.2 0.01 55)"
                    : "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: isFollowing
                    ? "oklch(0.7 0.05 55)"
                    : "oklch(0.08 0.004 55)",
                  border: isFollowing ? "1px solid oklch(0.3 0.01 55)" : "none",
                }}
                className="rounded-xl text-xs px-4"
              >
                {following || unfollowing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </Button>
            )}
          </div>
        </div>

        {channel.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {channel.description}
          </p>
        )}
      </div>

      {/* Post composer — owner only */}
      {isOwner && (
        <div
          className="shrink-0 border-b border-border px-4 py-3 flex flex-col gap-2"
          style={{ background: "oklch(0.11 0.008 55)" }}
        >
          <Textarea
            data-ocid="channel.post.textarea"
            placeholder="Share something with your followers..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="bg-input border-border resize-none min-h-[4rem] text-sm"
            disabled={isBusy || isRecording}
          />

          {/* Pending media file label */}
          {pendingMedia && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate max-w-48">{pendingMedia.name}</span>
              <button
                type="button"
                onClick={() => setPendingMedia(null)}
                className="text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          {/* Embed URL input */}
          {showEmbedInput && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Input
                  data-ocid="channel.post.input"
                  placeholder="Paste YouTube, X, or TikTok URL..."
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  className="flex-1 h-8 text-xs bg-input border-border"
                  disabled={isBusy}
                />
                <button
                  type="button"
                  onClick={() => {
                    setEmbedUrl("");
                    setShowEmbedInput(false);
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {detectedPlatform && (
                <span
                  className="text-xs font-semibold px-1"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                >
                  {detectedPlatform === "youtube" && "▶ YouTube detected"}
                  {detectedPlatform === "x" && "𝕏 X / Twitter detected"}
                  {detectedPlatform === "tiktok" && "TT TikTok detected"}
                </span>
              )}
            </div>
          )}

          {/* Recording UI */}
          {isRecording ? (
            <div className="flex items-center gap-3 py-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: "oklch(0.55 0.22 25)" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2.5 w-2.5"
                    style={{ background: "oklch(0.6 0.25 25)" }}
                  />
                </span>
                <Mic
                  className="h-4 w-4"
                  style={{ color: "oklch(0.6 0.25 25)" }}
                />
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: "oklch(0.6 0.25 25)" }}
                >
                  {formatRecordingTime(recordingSeconds)}
                </span>
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <Button
                size="sm"
                onClick={sendRecording}
                disabled={isBusy}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)",
                }}
                className="rounded-xl text-xs px-4"
                data-ocid="channel.post.submit_button"
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1.5" />
                    Send
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Image upload */}
              <button
                type="button"
                data-ocid="channel.post.upload_button"
                onClick={() => imageRef.current?.click()}
                disabled={isBusy}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Attach image"
              >
                <Image className="h-4 w-4" />
              </button>

              {/* Video upload */}
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                disabled={isBusy}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Attach video"
              >
                <Video className="h-4 w-4" />
              </button>

              {/* Voice recording */}
              <button
                type="button"
                onClick={startRecording}
                disabled={isBusy}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Record audio"
              >
                <Mic className="h-4 w-4" />
              </button>

              {/* Embed URL toggle */}
              <button
                type="button"
                onClick={() => setShowEmbedInput((v) => !v)}
                disabled={isBusy}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors hover:text-foreground"
                style={{
                  color: showEmbedInput ? "oklch(0.82 0.15 72)" : undefined,
                }}
                title="Embed YouTube / X / TikTok"
              >
                <Link className="h-4 w-4" />
              </button>

              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPendingMedia(e.target.files?.[0] ?? null)}
              />
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setPendingMedia(e.target.files?.[0] ?? null)}
              />

              <div className="flex-1" />
              <Button
                data-ocid="channel.post.submit_button"
                size="sm"
                onClick={handlePost}
                disabled={
                  isBusy ||
                  (!postText.trim() &&
                    !pendingMedia &&
                    !(embedUrl.trim() && detectedPlatform))
                }
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)",
                }}
                className="rounded-xl text-xs px-4"
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1.5" />
                    Post
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pinned post banner — channel owner only shown to all */}
      {pinnedPost && (
        <div
          data-ocid="channel.pinned_post_banner"
          className="shrink-0 border-b border-border"
          style={{ background: "oklch(0.13 0.025 65)" }}
        >
          <div className="relative">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2 pr-10 text-left hover:bg-muted/20 transition-colors"
              onClick={() => {
                const el = document.querySelector(
                  `[data-ocid="channel.post.item.${sortedPosts.indexOf(pinnedPost) + 1}"]`,
                );
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              aria-label="Go to pinned post"
            >
              <Pin
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
              <div className="flex-1 min-w-0">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                >
                  Pinned post
                </span>
                <span className="text-xs text-muted-foreground truncate block">
                  {pinnedPost.content.mediaUrl
                    ? "📎 Media"
                    : (pinnedPost.content.text?.slice(0, 70) ?? "")}
                </span>
              </div>
            </button>
            {isOwner && (
              <button
                type="button"
                data-ocid="channel.pinned_post.unpin_button"
                onClick={(e) => {
                  e.stopPropagation();
                  unpinPost(undefined, {
                    onError: () => toast.error("Failed to unpin post"),
                  });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Unpin post"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Posts feed */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 flex flex-col gap-4">
          {postsLoading ? (
            <div data-ocid="channel.view.loading_state">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl mb-4" />
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <div
              data-ocid="channel.view.empty_state"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 opacity-30"
                style={{ background: "oklch(0.76 0.13 72 / 0.2)" }}
              >
                <Send
                  className="h-7 w-7"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No posts yet
              </p>
              {isOwner && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Share something with your followers
                </p>
              )}
            </div>
          ) : (
            <>
              {visiblePosts.map((post, idx) => (
                <ChannelPostCard
                  key={post.id.toString()}
                  post={post}
                  authorName={ownerProfile.displayName}
                  authorAvatar={ownerProfile.avatarUrl}
                  isOwner={isOwner}
                  isPostAuthor={post.author.toString() === currentUserId}
                  currentUserId={currentUserId}
                  channelId={channelId}
                  index={idx}
                  isPinned={pinnedPostId != null && post.id === pinnedPostId}
                  onPin={
                    isOwner
                      ? (postId) =>
                          pinPost(postId, {
                            onError: () => toast.error("Failed to pin post"),
                          })
                      : undefined
                  }
                  onUnpin={
                    isOwner
                      ? () =>
                          unpinPost(undefined, {
                            onError: () => toast.error("Failed to unpin post"),
                          })
                      : undefined
                  }
                />
              ))}
              {hasMorePosts && (
                <button
                  type="button"
                  onClick={() => setPostsPage((p) => p + 1)}
                  className="w-full py-3 text-xs font-semibold text-center rounded-xl transition-colors hover:bg-muted/30"
                  style={{ color: "oklch(0.82 0.15 72)" }}
                >
                  Load{" "}
                  {Math.min(
                    POSTS_PAGE_SIZE,
                    sortedPosts.length - postsPage * POSTS_PAGE_SIZE,
                  )}{" "}
                  more posts
                </button>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {isOwner && (
        <EditChannelModal
          open={editOpen}
          onOpenChange={setEditOpen}
          channelId={channelId}
          initialName={channel.name}
          initialDescription={channel.description}
          initialAvatarUrl={channel.avatarUrl}
          initialCategory={channel.category}
        />
      )}
    </div>
  );
}
