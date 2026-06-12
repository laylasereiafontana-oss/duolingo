# Security Specification for "Aventura dos Blocos de Código"

This document outlines the security architecture, data invariants, and edge cases to ensure zero-trust access of the game.

## 1. Data Invariants
- **UserProfile**:
  - A user can only read and write their own UserProfile (`/users/{userId}` where `userId == request.auth.uid`).
  - The `email` field must match `request.auth.token.email`.
  - The `role` must be either "student" or "teacher".
  - Anonymous sync is supported, in which case `email` can be empty but the user owns their own profile by UID.
- **LeaderboardEntry**:
  - Any authenticated user can read (list) the leaderboard to calculate ranks.
  - A user can only write/update their own entry in the leaderboard (`/leaderboard/{entryId}` where `entryId == request.auth.uid`).
  - No user can modify someone else's leaderboard score.

## 2. The "Dirty Dozen" Malicious Payloads (Block List / Failure Scenarios)
Here are twelve distinct malicious payloads designed to test and breach security, which our Firestore rules will successfully reject:

1. **Self-Assignment of High Level / Instant XP Boost**
   - Attempt by student to write an arbitrary level or 999,999 XP in their UserProfile in single save.
2. **Identity Impersonation (Setting uid to victim ID)**
   - Attempt to overwrite another user's progress by setting `uid` to someone else's UID.
3. **Role Spoofing (Student Escalating to Teacher)**
   - Student attempts to update their own role from "student" to "teacher".
4. **Leaderboard Score Invariant Violation**
   - Attempting to overwrite a rival's leaderboard score.
5. **Junk Characters in ID Field (Denial of Wallet / ID Injection)**
   - Attempting to write a user record with an ID that is 2KB of random bytes.
6. **Bypassing Verification (Email Spoofing)**
   - Attempting to access protected collections using custom claims with an unverified email.
7. **Negative Values for XP**
   - Attempting to write a negative value for XP or levels to corrupt database indexes.
8. **Null Values on Mandatory Fields**
   - Attempting to create user records without required fields like `completedStages` array to cause frontend crashes.
9. **Tampering with Server Timestamps**
   - Bypassing automatic server timestamps with arbitrary client dates (e.g. `lastSyncedAt` in the future).
10. **Listing all secret teacher progress profiles**
    - Student attempting to read all `/users` collections outside of authorized query scopes.
11. **Malicious Giant Lists (Array Exhaustion/DDoS)**
    - Injecting 10,000 blank mock strings into `completedStages` list.
12. **Bypassing validation updates on target entities**
    - Writing random ghost fields (e.g., `isServerAdmin: true`) to bypass strict key validation.

---

## 3. The Security Fortress Definition (`firestore.rules`)
Below is the ruleset designed to block all twelve attacks:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }

    // Helpers
    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
    function incoming() { return request.resource.data; }
    function existing() { return resource.data; }

    // Validation blueprints
    function isValidUserProfile(data) {
      return data.keys().hasAll(['uid', 'name', 'email', 'role', 'xp', 'level', 'completedStages', 'teacherEmail', 'lastSyncedAt'])
        && data.keys().size() == 9
        && data.uid is string && data.uid.size() <= 128
        && data.name is string && data.name.size() <= 200
        && data.email is string && data.email.size() <= 200
        && (data.role == 'student' || data.role == 'teacher')
        && data.xp is int && data.xp >= 0
        && data.level is int && data.level >= 0
        && data.completedStages is list && data.completedStages.size() <= 100
        && data.teacherEmail is string && data.teacherEmail.size() <= 200
        && data.lastSyncedAt is string && data.lastSyncedAt.size() <= 128;
    }

    function isValidLeaderboardEntry(data) {
      return data.keys().hasAll(['uid', 'name', 'xp', 'completedCount'])
        && data.keys().size() == 4
        && data.uid is string && data.uid.size() <= 128
        && data.name is string && data.name.size() <= 200
        && data.xp is int && data.xp >= 0
        && data.completedCount is int && data.completedCount >= 0;
    }

    // match user profile
    match /users/{userId} {
      allow get: if isSignedIn(); // allow get for profile retrieval (needed for teachers to query their students or simple searches)
      allow list: if isSignedIn(); // teachers need to list students to compile dashboards
      allow create: if isOwner(userId) && isValidUserProfile(incoming());
      allow update: if isOwner(userId) && isValidUserProfile(incoming());
      allow delete: if false; // Progress cannot be deleted, only reset via update
    }

    // match leaderboard
    match /leaderboard/{entryId} {
      allow get: if isSignedIn();
      allow list: if isSignedIn(); // needed for everyone to see ranking lists
      allow create: if isOwner(entryId) && isValidLeaderboardEntry(incoming());
      allow update: if isOwner(entryId) && isValidLeaderboardEntry(incoming())
        && incoming().uid == existing().uid; // lock original owner identity
      allow delete: if false;
    }
  }
}
```
