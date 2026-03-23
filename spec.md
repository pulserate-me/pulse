# Pulse

## Current State
In the Edit Group dialog within ChatView.tsx, the Manage Members section (owner-only) contains:
- A list of current group members with remove buttons
- A text input ("Username to add...") + button to add members by typing a username

## Requested Changes (Diff)

### Add
- A horizontally scrollable row of avatar chips below the current member list in the Manage Members section
- Each chip shows the user's avatar (or initials fallback) and username
- Chips are derived from `conversations` (recent DM conversations), extracting the other participant's userId (not the current user)
- Tapping a chip calls `handleAddMember` with that user's username (fetched via useGetUserProfile)
- Added chips show a loading spinner while the add is in progress

### Modify
- Replace the text input + Add button with the avatar chips row
- Keep `handleAddMember` logic but call it with the username of the tapped chip user
- Hide chips for users who are already in the group (i.e., their principal is in `conversation?.members`)

### Remove
- Remove the text input `<input>` field and the `<Button>` for adding members
- Remove the `addMemberInput` and `addMemberError` state (no longer needed)
- Remove `handleAddMember` text-input logic; replace with chip-tap handler

## Implementation Plan
1. Remove `addMemberInput` state, `addMemberError` state, and the `handleAddMember` function that reads from the text input
2. Add a `handleAddMemberByUsername(username: string)` function that calls `addGroupMember.mutateAsync` directly
3. Derive recent conversation users: from `conversations`, filter for direct (non-group) conversations, extract the other participant's UserId (not currentUserId), exclude anyone already in the current group members list
4. For each such UserId, render an avatar chip using `useGetUserProfile` for display info
5. Replace the `{/* Add member */}` block with a horizontally scrollable `<div>` of avatar chips
6. Each chip: rounded avatar (image or initials), username label below, tap to add
7. MIME types: completely unchanged — do not touch any media upload, storage, or rendering logic
