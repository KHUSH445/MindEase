MindEase — History + Navigation Refactor Prompt

Goal

Fix the current MindEase history leakage. A newly created/logged-in user must NEVER see another user's AI/chat history. MongoDB must be the source of truth for authenticated history, scoped by the existing authenticated MongoDB user ID.

Also:

Old users must see their own previous AI conversations again after login.

AI conversations must appear in the AI Support sidebar with persistent titles.

Main navigation (Dashboard, AI Support, Journal, Insights, and other primary pages currently in the global navigation) must move to a top navbar.

The AI sidebar should be dedicated to conversation history.

Preserve all existing functionality and UI styling unless required by this change.

Critical rules

Inspect the ACTUAL current code before modifying anything. The current codebase is the source of truth; do not blindly follow older architecture documentation.

Do not modify the already-working authentication system: JWT, HttpOnly cookie, token-version logout invalidation, Google OAuth, GitHub OAuth, OAuth state/CSRF protection, password hashing, or MongoDB connection.

Do not move authenticated history back to localStorage.

Do not create mock/fake history.

Do not trust a frontend-supplied user_id for authorization.

Do not expose secrets.

Do not break AI, Safe Place/SOS, Journal, Insights, Settings, or the 3-minute demo.

1. Audit first

Inspect:

Frontend

App.jsx

AI Support component

global/sidebar/navigation components

auth state/context

API service/helper files

all localStorage/sessionStorage usage

Dashboard, Journal, Insights, Safe Place and Settings history/data loading

Backend

main.py

authentication dependency/get_current_user

/chat

/chat-history

journal endpoints

mood/insight endpoints

MongoDB helpers

collection/index setup

Identify the exact source of the cross-user history leakage BEFORE changing it.

2. MongoDB user isolation

Use the existing authenticated identity:
user_id = str(current_user["_id"])

Every authenticated AI history record must contain user_id.

Example:
{
"user_id": "...",
"conversation_id": "...",
"title": "Exam stress",
"message": "...",
"response": "...",
"emotion": "...",
"mental_state": "...",
"top_emotions": [],
"safety": {},
"timestamp": "..."
}

Reuse the existing chat_history collection/schema where possible. Do not unnecessarily rewrite it.

Write

POST /chat must obtain the authenticated user from the existing auth dependency and save that user's user_id. Never save authenticated chat without ownership.

Read

GET /chat-history must query MongoDB using the authenticated user's ID:
{"user_id": user_id}

Never use an unrestricted find({}) for authenticated history and never fetch all users' history and filter it in React.

Update/delete

Any history/journal operation involving a record ID must also verify ownership:
{"_id": record_id, "user_id": user_id}

3. Conversation model

If the current implementation already has conversation/session IDs, reuse them.

If not, add a stable conversation_id.

Do NOT create a new conversation for every message.

Conceptually:
User
├── Conversation A
│     ├── message
│     └── message
└── Conversation B
└── message

Each conversation should have a persistent title stored in MongoDB.

Example titles:

"Exam stress"

"Feeling lonely"

"College workload"

If title generation already exists, reuse it. Otherwise use a lightweight deterministic title based on the first user message; do not add another LLM/API unless necessary.

4. AI Support sidebar

The AI Support page should have a conversation-history sidebar:

AI HISTORY

New Chat

Today

College pressure

Feeling anxious

Yesterday

Exam stress

Previous

Motivation

Clicking a conversation loads its messages.

+ New Chat creates/selects a new conversation without deleting old conversations.

The sidebar must load from MongoDB for the currently authenticated user.

It must not display another user's conversations.

5. Login/logout/refresh behavior

User A:

Logs in.

Sees only A's conversations.

Sends messages.

Refreshes.

Still sees A's history.

Logs out.

User B:

Logs in.

Starts with no A history.

Sends messages.

Sees only B's history.

User A logs in again:

A's previous conversations reappear.

B's conversations never appear.

On logout, clear user-specific React state, selected conversation, messages, sidebar history and cached user data so stale A state cannot remain when B logs in.

Do not let authenticated history from localStorage become the source of truth.

6. Journal isolation

Verify:
GET /journal
POST /journal
PUT /journal/{id}
DELETE /journal/{id}

All operations must be scoped to the authenticated user_id. User B must not be able to read, update or delete User A's journal by changing an ID.

7. Dashboard / Insights / mood isolation

Inspect all historical data used for:

mood records

mood charts

emotional trends

statistics

insights

activity history

Every query must be scoped to the authenticated user. User A's data must never affect User B's dashboard or insights.

8. Navigation refactor

Move the primary global navigation from the current sidebar to a top navbar.

Top navigation should include the existing primary destinations, including:

Dashboard

AI Support

Journal

Insights

other current primary pages where appropriate

Do not remove functionality.

The top navbar should remain available across authenticated application pages.

The AI Support sidebar should now primarily be used for AI conversation history rather than global page navigation.

Do not force the AI-history sidebar onto pages where it does not make sense.

9. MongoDB indexes

Inspect existing indexes first. If appropriate and not already present, use indexes such as:

chat_history: {user_id: 1, timestamp: -1}

chat_history: {user_id: 1, conversation_id: 1, timestamp: 1}

journal_entries: {user_id: 1, timestamp: -1}

mood_records: {user_id: 1, timestamp: -1}

Do not create duplicate indexes.

10. Legacy records

If old chat records have no user_id:

Do NOT assign them to a random user.

Do NOT expose them to all users.

Do NOT automatically delete them.

Report how legacy records are handled.
A safe default is to exclude ownerless records from authenticated history until a deliberate migration exists.

11. Testing — mandatory

Actually execute and report these tests:

User A

create/login A

create 2–3 AI messages/conversation

verify sidebar

refresh

verify persistence

logout

User B

login B

verify A history is absent

create B conversation

refresh

verify B history persists

User A again

login A

verify A history returns

verify B history is absent

API isolation

Using A credentials, GET /chat-history returns only A.
Using B credentials, GET /chat-history returns only B.

Journal

Verify A and B have independent journal records and IDs cannot be used for cross-user access.

Insights

Verify A and B have independent mood/insight data.

12. Acceptance criteria

Do not declare complete until:
[ ] New user starts with empty AI history
[ ] No cross-user AI history
[ ] AI history stored in MongoDB
[ ] Every authenticated chat record has user_id
[ ] History queries use authenticated user_id
[ ] Old user sees history after re-login
[ ] Conversation titles persist
[ ] Conversation grouping persists
[ ] New Chat works
[ ] Journal is user-isolated
[ ] Mood/Insights are user-isolated
[ ] No stale React/localStorage leakage
[ ] Main navigation is at top
[ ] AI history is in AI Support sidebar
[ ] Authentication remains intact
[ ] Google/GitHub OAuth remain intact
[ ] AI pipeline remains intact
[ ] Safe Place/SOS remains intact
[ ] 3-minute demo remains intact
[ ] Two-user isolation tests pass

13. Implementation order

Audit actual code and identify leakage.

Fix backend MongoDB ownership/isolation.

Fix history API.

Add/reuse conversation_id and persistent title.

Fix frontend history loading/state reset.

Refactor navigation to top navbar.

Make AI sidebar the conversation-history sidebar.

Run the two-user isolation tests.

Verify all existing features.

14. Final report

After implementation, report:

Root cause of leakage.

Files changed.

MongoDB collections/indexes changed.

Schema changes.

API changes.

Frontend changes.

How user isolation is enforced.

How titles/conversation IDs work.

How top navigation works.

How AI sidebar works.

Exact two-user test results.

Legacy-data handling.

Remaining limitations.

FINAL INVARIANT:

Authenticated User A -> ONLY User A data
Authenticated User B -> ONLY User B data

MongoDB is the source of truth for authenticated history.
The frontend must never display another user's authenticated history.