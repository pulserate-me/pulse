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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useMediaUpload } from "../hooks/useMediaUpload";
import {
  useUpdateCallerAvatar,
  useUpdateCallerBio,
  useUpdateCallerDisplayName,
} from "../hooks/useQueries";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: UserProfile | null;
}

export default function EditProfileModal({
  open,
  onOpenChange,
  currentProfile,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: updateDisplayName, isPending: updatingName } =
    useUpdateCallerDisplayName();
  const { mutateAsync: updateBio, isPending: updatingBio } =
    useUpdateCallerBio();
  const { mutateAsync: updateAvatar, isPending: updatingAvatar } =
    useUpdateCallerAvatar();
  const { uploadMedia, isUploading } = useMediaUpload();

  const isBusy = updatingName || updatingBio || updatingAvatar || isUploading;

  useEffect(() => {
    if (open && currentProfile) {
      setDisplayName(currentProfile.displayName);
      setBio(currentProfile.bio ?? "");
      setAvatarPreview(currentProfile.avatarUrl ?? "");
    }
  }, [open, currentProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    try {
      const result = await uploadMedia(file);
      await updateAvatar(result.url);
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
      setAvatarPreview(currentProfile?.avatarUrl ?? "");
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    try {
      const promises: Promise<void>[] = [];
      if (displayName.trim() !== currentProfile?.displayName) {
        promises.push(updateDisplayName(displayName.trim()));
      }
      if (bio.trim() !== (currentProfile?.bio ?? "")) {
        promises.push(updateBio(bio.trim()));
      }
      await Promise.all(promises);
      toast.success("Profile updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isBusy && onOpenChange(v)}>
      <DialogContent
        data-ocid="edit_profile.dialog"
        className="bg-card border-border max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt="Avatar" />
                )}
                <AvatarFallback
                  className="text-xl font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.76 0.13 72 / 0.4), oklch(0.65 0.11 65 / 0.3))",
                    color: "oklch(0.82 0.15 72)",
                  }}
                >
                  {getInitials(displayName || "?")}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isBusy}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-card flex items-center justify-center cursor-pointer"
                style={{ background: "oklch(0.82 0.15 72)" }}
                aria-label="Change avatar"
                data-ocid="edit_profile.upload_button"
              >
                {isUploading || updatingAvatar ? (
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    style={{ color: "oklch(0.08 0.004 55)" }}
                  />
                ) : (
                  <Camera
                    className="h-3 w-3"
                    style={{ color: "oklch(0.08 0.004 55)" }}
                  />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-displayName" className="text-foreground/80">
              Display Name
            </Label>
            <Input
              id="edit-displayName"
              data-ocid="edit_profile.input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="bg-input border-border h-10"
              placeholder="Your display name"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-bio" className="text-foreground/80">
              Bio{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="edit-bio"
              data-ocid="edit_profile.textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              className="bg-input border-border resize-none h-20"
              placeholder="Tell others a bit about yourself..."
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/160
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              data-ocid="edit_profile.cancel_button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              data-ocid="edit_profile.save_button"
              onClick={handleSave}
              disabled={isBusy || !displayName.trim()}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {updatingName || updatingBio ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
