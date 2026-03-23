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
  Edit,
  Image,
  Loader2,
  Mic,
  MoreVertical,
  Send,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaUpload } from "../hooks/useMediaUpload";
import {
  useAddChannelPost,
  useDeleteChannel,
  useFollowChannel,
  useGetChannel,
  useGetChannelPosts,
  useUnfollowChannel,
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

function EditChannelModal({
  open,
  onOpenChange,
  channelId,
  initialName,
  initialDescription,
  initialAvatarUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channelId: ChannelId;
  initialName: string;
  initialDescription: string;
  initialAvatarUrl?: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
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

  const [postText, setPostText] = useState("");
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const { mutateAsync: deleteChannel, isPending: deleting } =
    useDeleteChannel();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  // Mark channel as viewed when opened so unread badge clears
  useEffect(() => {
    markChannelAsViewed(channelId.toString());
  }, [channelId]);

  const isBusy = posting || isUploading;

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

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollow(channelId);
    } else {
      follow(channelId);
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && !pendingMedia) return;
    try {
      let mediaUrl: string | undefined;
      let mediaType: any;
      if (pendingMedia) {
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
      setPostsPage(1);
      toast.success("Post published!");
    } catch {
      toast.error("Failed to publish post");
    }
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
            className="bg-input border-border resize-none h-16 text-sm"
            disabled={isBusy}
          />
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
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              disabled={isBusy}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Attach video"
            >
              <Video className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => audioRef.current?.click()}
              disabled={isBusy}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Attach audio"
            >
              <Mic className="h-4 w-4" />
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
            <input
              ref={audioRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setPendingMedia(e.target.files?.[0] ?? null)}
            />

            <div className="flex-1" />
            <Button
              data-ocid="channel.post.submit_button"
              size="sm"
              onClick={handlePost}
              disabled={isBusy || (!postText.trim() && !pendingMedia)}
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
        />
      )}
    </div>
  );
}
