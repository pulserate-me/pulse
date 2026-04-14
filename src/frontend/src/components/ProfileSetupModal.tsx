import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { requestNotificationPermission } from "../hooks/usePushNotifications";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  onProfileCreated?: () => void;
}

export default function ProfileSetupModal({ onProfileCreated }: Props) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const { uploadMedia, isUploading } = useMediaUpload();

  const isBusy = isPending || isUploading;

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
      setAvatarUrl(result.url);
    } catch {
      toast.error("Failed to upload avatar");
      setAvatarPreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    try {
      await saveProfile({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        lastSeen: BigInt(Date.now()) * BigInt(1_000_000),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      toast.success("Profile created! Welcome to Pulse.");
      // Request notification permission non-blocking after profile is saved
      requestNotificationPermission();
      onProfileCreated?.();
    } catch {
      toast.error("Failed to create profile. Please try again.");
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.76 0.13 72 / 0.2) 0%, transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            {/* Avatar upload */}
            <div className="relative mb-4">
              <Avatar className="w-20 h-20">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt="Avatar preview" />
                )}
                <AvatarFallback
                  className="text-xl font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                    color: "oklch(0.08 0.004 55)",
                  }}
                >
                  {displayName ? getInitials(displayName) : "P"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isBusy}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-card flex items-center justify-center cursor-pointer"
                style={{ background: "oklch(0.82 0.15 72)" }}
                aria-label="Upload avatar"
                data-ocid="auth.upload_button"
              >
                {isUploading ? (
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
            <h2 className="font-display text-2xl font-bold text-foreground">
              Create your profile
            </h2>
            <p className="text-muted-foreground text-sm text-center mt-1">
              Choose a username and display name to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName" className="text-foreground/80">
                Display Name
              </Label>
              <Input
                id="displayName"
                data-ocid="auth.display_name_input"
                placeholder="How others will see you"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                className="bg-input border-border h-11"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="text-foreground/80">
                Username
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="username"
                  data-ocid="auth.username_input"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    )
                  }
                  maxLength={30}
                  className="bg-input border-border h-11 pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio" className="text-foreground/80">
                Bio{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="bio"
                data-ocid="auth.textarea"
                placeholder="Tell others a bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                className="bg-input border-border resize-none h-20"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/160
              </p>
            </div>

            <Button
              data-ocid="auth.submit_button"
              type="submit"
              disabled={isBusy || !username.trim() || !displayName.trim()}
              className="h-11 font-semibold rounded-xl mt-2"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                color: "oklch(0.08 0.004 55)",
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating profile...
                </>
              ) : (
                "Enter Pulse"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
