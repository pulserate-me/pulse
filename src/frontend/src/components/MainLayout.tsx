import { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Radio } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import type { ConversationId } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateDirectConversation,
  useGetCallerUserProfile,
  useSearchUserByUsername,
  useUpdateLastSeen,
} from "../hooks/useQueries";
import type { ChannelId } from "../hooks/useQueries";
const ChannelView = lazy(() => import("./ChannelView"));
import ChatView from "./ChatView";
import Sidebar from "./Sidebar";
import UserProfileModal from "./UserProfileModal";

interface MainLayoutProps {
  pendingProfileUsername?: string | null;
  onPendingProfileHandled?: () => void;
}

export default function MainLayout({
  pendingProfileUsername,
  onPendingProfileHandled,
}: MainLayoutProps) {
  const { identity, clear } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const { mutate: updateLastSeen } = useUpdateLastSeen();
  const { mutateAsync: createDirectConversation } =
    useCreateDirectConversation();
  const { mutateAsync: searchUser } = useSearchUserByUsername();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] =
    useState<ConversationId | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<ChannelId | null>(
    null,
  );
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(
    null,
  );
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const currentUserId = identity?.getPrincipal().toString() ?? "";

  useEffect(() => {
    updateLastSeen();
    const interval = setInterval(() => updateLastSeen(), 30000);
    return () => clearInterval(interval);
  }, [updateLastSeen]);

  // Handle pending profile username from URL (e.g. /profile/:username)
  useEffect(() => {
    if (!pendingProfileUsername) return;
    let cancelled = false;
    searchUser(pendingProfileUsername)
      .then((result) => {
        if (cancelled || !result) return;
        setProfileModalUserId(result.userId.toString());
        setProfileModalOpen(true);
        onPendingProfileHandled?.();
      })
      .catch(() => {
        if (!cancelled) onPendingProfileHandled?.();
      });
    return () => {
      cancelled = true;
    };
  }, [pendingProfileUsername, searchUser, onPendingProfileHandled]);

  const handleSelectConversation = (id: ConversationId) => {
    setActiveConversationId(id);
    setActiveChannelId(null);
    setShowMobileChat(true);
  };

  const handleSelectChannel = (id: ChannelId) => {
    setActiveChannelId(id);
    setActiveConversationId(null);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleOpenUserProfile = (userId: string) => {
    setProfileModalUserId(userId);
    setProfileModalOpen(true);
  };

  const handleViewProfileByUsername = async (username: string) => {
    try {
      const result = await searchUser(username);
      if (!result) return;
      handleOpenUserProfile(result.userId.toString());
    } catch {
      // silently fail
    }
  };

  const handleStartChatFromProfile = async (userId: string) => {
    try {
      const convId = await createDirectConversation(Principal.fromText(userId));
      handleSelectConversation(convId);
    } catch {
      // conversation may already exist; refetch will surface it
    }
  };

  const mainContent = () => {
    if (activeChannelId !== null) {
      return (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: "oklch(0.82 0.15 72)" }}
              />
            </div>
          }
        >
          <ChannelView
            channelId={activeChannelId}
            currentUserId={currentUserId}
            onBack={handleBackToList}
          />
        </Suspense>
      );
    }
    if (activeConversationId !== null) {
      return (
        <ChatView
          conversationId={activeConversationId}
          currentUserId={currentUserId}
          onBack={handleBackToList}
          onOpenUserProfile={handleOpenUserProfile}
        />
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center opacity-30"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.13 72), oklch(0.65 0.11 65))",
            }}
          >
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground/40">
              Select a conversation
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Choose from your chats, stories, or channels
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/40">
            <Radio className="h-4 w-4" />
            <span>Channels tab — browse &amp; follow broadcaster channels</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showMobileChat ? "hidden" : "flex"
        } md:flex flex-col w-full md:w-80 lg:w-96 shrink-0 border-r border-border bg-sidebar`}
      >
        <Sidebar
          currentUserId={currentUserId}
          currentProfile={profile ?? null}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onSelectChannel={handleSelectChannel}
          onStartChat={handleStartChatFromProfile}
          onViewProfile={handleViewProfileByUsername}
          onLogout={handleLogout}
        />
      </div>

      {/* Main area */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden"
        } md:flex flex-col flex-1 min-w-0 min-h-0`}
      >
        {mainContent()}
      </div>

      {/* Global user profile modal */}
      <UserProfileModal
        userId={profileModalUserId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        onStartChat={handleStartChatFromProfile}
      />
    </div>
  );
}
