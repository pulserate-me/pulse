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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { ConversationId, UserId, UserProfile } from "../backend";
import { useMediaUpload } from "../hooks/useMediaUpload";
import {
  useCreateDirectConversation,
  useCreateGroupConversation,
  useSearchUserByUsername,
} from "../hooks/useQueries";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ResolvedUser {
  userId: UserId;
  profile: UserProfile;
}

interface UserResultCardProps {
  user: ResolvedUser;
}

function UserResultCard({ user }: UserResultCardProps) {
  return (
    <div className="flex items-center gap-2 mt-2 bg-muted/50 rounded-lg px-3 py-2">
      <Avatar className="w-8 h-8">
        <AvatarFallback
          className="text-xs font-semibold"
          style={{
            background: "oklch(0.76 0.13 72 / 0.2)",
            color: "oklch(0.82 0.15 72)",
          }}
        >
          {getInitials(user.profile.displayName)}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium text-foreground">
          {user.profile.displayName}
        </p>
        <p className="text-xs text-muted-foreground">
          @{user.profile.username}
        </p>
      </div>
    </div>
  );
}

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onConversationCreated: (id: ConversationId) => void;
}

export default function NewChatModal({
  open,
  onOpenChange,
  currentUserId,
  onConversationCreated,
}: NewChatModalProps) {
  // DM state
  const [dmUsername, setDmUsername] = useState("");
  const [dmResult, setDmResult] = useState<ResolvedUser | null>(null);
  const [dmSearched, setDmSearched] = useState(false);

  // Group state
  const [groupName, setGroupName] = useState("");
  const [groupMemberInput, setGroupMemberInput] = useState("");
  const [groupMembers, setGroupMembers] = useState<ResolvedUser[]>([]);
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(
    null,
  );
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const { uploadMedia, isUploading: uploadingAvatar } = useMediaUpload();
  const { mutateAsync: searchUser, isPending: searching } =
    useSearchUserByUsername();
  const { mutateAsync: createDM, isPending: dmPending } =
    useCreateDirectConversation();
  const { mutateAsync: createGroup, isPending: groupPending } =
    useCreateGroupConversation();

  const resetDm = () => {
    setDmUsername("");
    setDmResult(null);
    setDmSearched(false);
  };

  const resetGroup = () => {
    setGroupName("");
    setGroupMemberInput("");
    setGroupMembers([]);
    setGroupAvatarUrl(null);
    setGroupAvatarPreview(null);
  };

  const handleSearchDm = async () => {
    const username = dmUsername.trim();
    if (!username) return;
    setDmSearched(true);
    setDmResult(null);
    try {
      const result = await searchUser(username);
      if (!result) {
        toast.error(`User "${username}" not found`);
        return;
      }
      if (result.userId.toString() === currentUserId) {
        toast.error("You cannot message yourself");
        return;
      }
      setDmResult(result);
    } catch {
      toast.error("Search failed. Please try again.");
    }
  };

  const handleCreateDM = async () => {
    if (!dmResult) return;
    try {
      const id = await createDM(dmResult.userId);
      onConversationCreated(id);
      resetDm();
      toast.success("Conversation started!");
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  const handleAddGroupMember = async () => {
    const username = groupMemberInput.trim();
    if (!username) return;

    if (groupMembers.some((m) => m.profile.username === username)) {
      toast.error("Member already added");
      return;
    }

    try {
      const result = await searchUser(username);
      if (!result) {
        toast.error(`User "${username}" not found`);
        return;
      }
      if (result.userId.toString() === currentUserId) {
        toast.error("You are already in the group");
        return;
      }
      if (
        groupMembers.some(
          (m) => m.userId.toString() === result.userId.toString(),
        )
      ) {
        toast.error("Member already added");
        return;
      }
      setGroupMembers((prev) => [...prev, result]);
      setGroupMemberInput("");
    } catch {
      toast.error("Search failed. Please try again.");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (groupMembers.length === 0) {
      toast.error("Please add at least one member");
      return;
    }
    try {
      const id = await createGroup({
        name: groupName.trim(),
        members: groupMembers.map((m) => m.userId),
        avatarUrl: groupAvatarUrl ?? undefined,
      });
      onConversationCreated(id);
      resetGroup();
      toast.success("Group created!");
    } catch {
      toast.error("Failed to create group");
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      resetDm();
      resetGroup();
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-ocid="new_chat.dialog"
        className="bg-card border-border sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New Chat</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dm">
          <TabsList className="w-full bg-muted/50 mb-4">
            <TabsTrigger
              data-ocid="new_chat.dm_tab"
              value="dm"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Direct Message
            </TabsTrigger>
            <TabsTrigger
              data-ocid="new_chat.group_tab"
              value="group"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="mr-2 h-4 w-4" />
              New Group
            </TabsTrigger>
          </TabsList>

          {/* Direct Message Tab */}
          <TabsContent value="dm" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground/80 text-sm">Username</Label>
              <div className="flex gap-2">
                <Input
                  data-ocid="new_chat.user_search_input"
                  placeholder="Search by username..."
                  value={dmUsername}
                  onChange={(e) => {
                    setDmUsername(e.target.value);
                    setDmSearched(false);
                    setDmResult(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchDm()}
                  className="bg-input border-border text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSearchDm}
                  disabled={searching || !dmUsername.trim()}
                  className="border-border shrink-0"
                  data-ocid="new_chat.search_button"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {dmSearched && !dmResult && !searching && (
                <p className="text-xs text-muted-foreground mt-1">
                  No user found with that username.
                </p>
              )}
              {dmResult && <UserResultCard user={dmResult} />}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                data-ocid="new_chat.close_button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                data-ocid="new_chat.create_button"
                onClick={handleCreateDM}
                disabled={dmPending || !dmResult}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)",
                }}
              >
                {dmPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Start Chat
              </Button>
            </div>
          </TabsContent>

          {/* Group Tab */}
          <TabsContent value="group" className="flex flex-col gap-4">
            {/* Group avatar picker */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                data-ocid="new_chat.group_upload_button"
                onClick={() => groupAvatarInputRef.current?.click()}
                className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-primary/50 hover:border-primary transition-colors flex items-center justify-center bg-muted/30"
              >
                {groupAvatarPreview ? (
                  <img
                    src={groupAvatarPreview}
                    alt="Group avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                )}
              </button>
              <span className="text-xs text-muted-foreground">
                Group Avatar (optional)
              </span>
              <input
                ref={groupAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const preview = URL.createObjectURL(file);
                  setGroupAvatarPreview(preview);
                  try {
                    const { url } = await uploadMedia(file);
                    setGroupAvatarUrl(url);
                  } catch {
                    toast.error("Failed to upload avatar");
                    setGroupAvatarPreview(null);
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-foreground/80 text-sm">Group Name</Label>
              <Input
                data-ocid="new_chat.group_name_input"
                placeholder="e.g. Team Pulse"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-input border-border text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground/80 text-sm">Add Members</Label>
              <div className="flex gap-2">
                <Input
                  data-ocid="new_chat.group_member_input"
                  placeholder="Search by username..."
                  value={groupMemberInput}
                  onChange={(e) => setGroupMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddGroupMember()}
                  className="bg-input border-border text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroupMember}
                  disabled={searching || !groupMemberInput.trim()}
                  className="border-border shrink-0"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
              {groupMembers.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {groupMembers.map((member, i) => (
                    <div
                      key={member.userId.toString()}
                      data-ocid={`new_chat.member_item.${i + 1}`}
                      className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback
                            className="text-xs font-semibold"
                            style={{
                              background: "oklch(0.76 0.13 72 / 0.2)",
                              color: "oklch(0.82 0.15 72)",
                            }}
                          >
                            {getInitials(member.profile.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {member.profile.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{member.profile.username}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setGroupMembers((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        aria-label="Remove member"
                        data-ocid={`new_chat.member_delete_button.${i + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                data-ocid="new_chat.close_button"
              >
                Cancel
              </Button>
              <Button
                data-ocid="new_chat.create_button"
                onClick={handleCreateGroup}
                disabled={
                  groupPending || !groupName.trim() || groupMembers.length === 0
                }
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
                  color: "oklch(0.08 0.004 55)",
                }}
              >
                {groupPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Group
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
