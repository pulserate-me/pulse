// Cross-cutting type aliases shared across all domains.
// These mirror the inline type definitions in main.mo so domain modules
// can import them without depending on the actor directly.
module {
  public type UserId = Principal;
  public type ConversationId = Nat;
  public type MessageId = Nat;
  public type ChannelId = Nat;
  public type ChannelPostId = Nat;
  public type Timestamp = Int;
};
