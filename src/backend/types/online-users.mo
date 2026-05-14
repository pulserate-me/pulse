import Principal "mo:core/Principal";

module {
  public type UserId = Principal;
  public type Timestamp = Int;

  /// Shared-safe projection of a user returned by getOnlineUsers.
  public type OnlineUser = {
    userId : UserId;
    username : Text;
    displayName : Text;
    avatarUrl : ?Text;
    lastSeen : Timestamp;
  };
};
