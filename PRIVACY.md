# Privacy & Data Safety Policy

**Reason-First: AI Teacher Bot for Elementary Students (Ages 8–10)**  
*MIT Solve 2027 Challenge Submission*

---

### 1. Minimal Student Identity (No Real Names Required)
- We **never** collect, require, or store government identifiers, Aadhaar numbers, email addresses, or full student surnames.
- Students are identified exclusively via first names (e.g., "Rahul") or alphanumeric classroom roll numbers (e.g., `student_01`).
- Teachers maintain full control over pseudonym mappings in their local classroom rosters.

### 2. Zero Raw Audio Storage (Privacy by Design)
- When a child uses the "बोलकर उत्तर दें (Tap to Speak)" microphone feature, **no raw audio files, MP3s, or voice recordings are ever sent to or stored on our servers**.
- Speech-to-text processing happens in real-time on the client device via the browser's native Web Speech API (`SpeechRecognition`).
- Only the resulting short text message is sent to the backend for educational analysis.

### 3. Automated 30-Day Data Deletion Policy
- Dialogue transcripts and intermediate chat messages are retained for a maximum of **30 days** to allow teachers to review student reasoning during the current lesson cycle.
- After 30 days, chat sessions and message records are purged from the database.
- Permanent teacher records retain only aggregated pedagogical milestones (e.g., "Rahul mastered fraction equivalence on Oct 30").

### 4. Non-Evaluative / No Automated Grading
- The Teacher Bot **never** assigns grades, numerical scores, or penalties to students based on chat responses.
- The dialogue is purely formative and diagnostic, designed to uncover *how* the child reasons and to guide the human teacher toward targeted hands-on interventions (such as fraction paper strips or bundling sticks).

---

For technical database instructions on configuring PostgreSQL TTL automated deletion, refer to [`backend/chat/schema.sql`](backend/chat/schema.sql).

