// Domain logic module for pinned messages and pinned channel posts.
// NOTE: The actual implementations live in main.mo because the state
// (conversations, channels, groupCreators) is owned by the actor.
// This module is kept as a documentation/type reference only.
import Runtime "mo:core/Runtime";

module {
  // This module intentionally has no runtime logic — all four pin/unpin
  // operations are implemented as public shared functions directly in main.mo
  // where they have direct access to the conversations, channels, and
  // groupCreators maps.
  //
  // Functions implemented in main.mo:
  //   pinMessage(conversationId, messageId)       -> { #ok; #err: Text }
  //   unpinMessage(conversationId)                -> { #ok; #err: Text }
  //   pinChannelPost(channelId, postId)            -> { #ok; #err: Text }
  //   unpinChannelPost(channelId)                  -> { #ok; #err: Text }
  public let _placeholder : () = ();
};
