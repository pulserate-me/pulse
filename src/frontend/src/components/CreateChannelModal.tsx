import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { useCreateChannel } from "../hooks/useQueries";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (channelId: bigint) => void;
}

export default function CreateChannelModal({
  open,
  onOpenChange,
  onCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: createChannel, isPending } = useCreateChannel();
  const { uploadMedia, isUploading } = useMediaUpload();

  const isBusy = isPending || isUploading;

  const reset = () => {
    setName("");
    setDescription("");
    setAvatarPreview(null);
    setPendingAvatar(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    try {
      let avatarUrl: string | undefined;
      if (pendingAvatar) {
        const result = await uploadMedia(pendingAvatar);
        avatarUrl = result.url;
      }
      const channelId = await createChannel({
        name: name.trim(),
        description: description.trim(),
        avatarUrl,
      });
      toast.success("Channel created!");
      reset();
      onOpenChange(false);
      onCreated?.(channelId as bigint);
    } catch {
      toast.error("Failed to create channel");
    }
  };

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CH";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isBusy) {
          reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent
        data-ocid="channel.create.dialog"
        className="bg-card border-border max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground text-xl">
            Create Channel
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Avatar */}
          <div className="flex justify-center">
            <button
              type="button"
              data-ocid="channel.create.upload_button"
              className="relative group"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
            >
              <Avatar className="w-20 h-20">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt="Channel avatar" />
                )}
                <AvatarFallback
                  className="text-2xl font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.3), oklch(0.65 0.11 65 / 0.2))",
                    color: "oklch(0.82 0.15 72)",
                    border: "2px solid oklch(0.76 0.13 72 / 0.4)",
                  }}
                >
                  {initials}
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
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">
              Channel Name
            </Label>
            <Input
              data-ocid="channel.create.input"
              placeholder="e.g. Tech Updates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input border-border"
              maxLength={60}
              disabled={isBusy}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm text-muted-foreground">Description</Label>
            <Textarea
              data-ocid="channel.create.textarea"
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border resize-none h-20"
              maxLength={300}
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            data-ocid="channel.create.cancel_button"
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            data-ocid="channel.create.submit_button"
            onClick={handleSubmit}
            disabled={isBusy || !name.trim()}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
              color: "oklch(0.08 0.004 55)",
            }}
          >
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Channel"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
