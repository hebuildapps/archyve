Yes. Now the model is much clearer.

The key change from the previous `next response.md` is that **login is not simply an account feature anymore**. It becomes the controlled gateway for **new AI-generated research**, while **existing research already in Archyve's corpus remains freely viewable without login**.

And the extension + web flow should be treated as two interfaces to the same research system.

Here is the rewritten `next response.md` I would give the agent:

````md
# Archyve V2 — Next Implementation Response

## Purpose

This document supersedes the previous Phase 1B implementation direction.

Phase 1 infrastructure has already been built and verified to compile.

The next implementation stage should focus on refining the actual product flow around:

- Existing research corpus
- Anonymous users
- New paper research generation
- Login/signup gating
- Extension-to-web continuity
- BYOK
- Settings
- Onboarding/changelog
- Research history
- Real-world validation

The goal is to keep the MVP economically viable while creating a clear user experience.

---

# 1. Current Product Principle

Archyve has two fundamentally different situations:

### Case A — Paper already researched

If the paper already exists in Archyve's persistent research corpus:

```text
User
 ↓
Paper
 ↓
Archyve
 ↓
Redis / Supabase lookup
 ↓
Existing Research Dossier
 ↓
Show immediately
````

No login should be required.

---

### Case B — Paper has never been researched

If the paper does not exist:

```text
User
 ↓
Paper
 ↓
Archyve
 ↓
Research begins
 ↓
Initial research progress
 ↓
Login / Signup gate
 ↓
Continue research
 ↓
AI-generated Research Dossier
```

This is the primary mechanism for controlling expensive AI inference.

---

# 2. Core Product Rule

> **Existing knowledge is free to consume. New research generation requires an authenticated session.**

This creates a simple distinction:

```text
READ existing research
        ↓
      FREE
   No login required

CREATE new research
        ↓
   Login / Signup
```

This should be reflected consistently across the extension and web application.

---

# 3. AI Economics

The current product does not have a budget for managed AI inference.

Therefore Archyve should not assume that it can freely pay for every new AI generation.

The MVP should use:

### BYOK — Bring Your Own Key

Users can provide their own AI API key through Archyve Settings.

Initial provider:

```text
Google Gemini
```

Future providers:

```text
OpenAI
Anthropic
Custom providers
```

Custom providers are Phase 2.

---

# 4. Why Login Exists

Login should not exist merely because "every SaaS product needs authentication."

Login exists because the system needs to associate **new research generation and research history with a user session**.

Authenticated users can:

* Continue a research job
* Access their previous research
* Maintain research history
* Save papers in future
* Synchronize preferences in future
* Use BYOK configuration
* Build a persistent research workspace

The MVP should keep authentication simple.

---

# 5. Extension User Flow

The extension remains the primary lightweight entry point.

Supported triggers:

```text
1. Extension icon
2. Context menu
3. Keyboard shortcut
4. URL prepend
```

All triggers must use the same underlying research pipeline.

---

# 6. Extension — Existing Paper Flow

When an anonymous user triggers Archyve:

```text
Research Paper
      ↓
Extension Entry Point
      ↓
Archyve Research Page
      ↓
Redis Lookup
      ↓
Supabase Lookup
```

If the paper exists:

```text
Cache / DB HIT
      ↓
Existing Research Dossier
      ↓
Display immediately
```

No login.

No API key.

No research-generation process.

---

# 7. Extension — New Paper Flow

If the paper does not exist in Archyve's research corpus:

```text
Paper
 ↓
Archyve
 ↓
Initial Research
 ↓
Progress UI
```

The initial research should perform inexpensive/deterministic operations first.

For example:

```text
0%
 ↓
Identify publisher
 ↓
Extract title
 ↓
Extract authors
 ↓
Extract DOI
 ↓
Identify publisher-specific ID
 ↓
20%
```

At this point the system should have enough information to establish:

> "We have identified the paper and started researching it."

---

# 8. Research Lock / Authentication Gate

After the initial research stage, the user sees a locked continuation state.

Example:

```text
We've identified this research paper.

Research in progress...

✓ Paper identified
✓ DOI extracted
✓ Metadata found

20% complete

────────────────────────────

Sign in to continue researching

Create an account to continue this
research and generate the full Archyve dossier.

[ Continue with Google ]
[ Sign up ]
[ Log in ]
```

The exact UI should follow `design.md` and the provided inspiration.

The purpose of this screen is not to block access to existing research.

It only blocks **new research generation**.

---

# 9. Research Job Continuity

Important:

The initial research performed before authentication must not be thrown away.

The system should maintain the research state.

Example:

```text
Anonymous Session
       ↓
Paper identified
       ↓
DOI extracted
       ↓
Metadata collected
       ↓
20%
       ↓
Login
       ↓
Authenticated session
       ↓
Resume existing research job
       ↓
Continue from stored state
```

The user should experience this as:

> "Continue research"

rather than:

> "Start over."

---

# 10. Web / URL Prepend Flow

The web flow should behave consistently with the extension.

Example:

```text
https://archyve.xyz/https://ieeexplore.ieee.org/...
```

The web application:

```text
Receives paper URL
      ↓
Normalizes request
      ↓
Redis lookup
      ↓
Supabase lookup
```

### If existing dossier exists

```text
Existing dossier
      ↓
Show immediately
```

No login.

---

### If dossier does not exist

```text
Start initial research
      ↓
Show research progress
      ↓
Reach initial research checkpoint
      ↓
Login / Signup
      ↓
Resume research
```

The web flow and extension flow should share the same backend pipeline.

---

# 11. Web Research Workspace

After login, the web application becomes more than a single paper page.

It becomes the user's lightweight research workspace.

The initial dashboard should remain simple.

Example:

```text
Archyve

Recent Research

────────────────────────────

Attention Is All You Need
Last researched: Today

Vision Transformer
Last researched: Yesterday

RAG: Retrieval-Augmented Generation
Last researched: Aug 10

────────────────────────────

[ Research a paper ]
```

This gives authenticated users an immediate reason to return.

---

# 12. Research History

Research history is part of the MVP authentication experience, but should remain simple.

Store:

* User
* Paper
* Research result
* Created timestamp
* Last accessed timestamp

Do not implement advanced paper collections yet.

Future:

```text
Saved papers
Collections
Tags
Folders
Research projects
```

---

# 13. Anonymous vs Authenticated Capabilities

| Capability                      |                          Anonymous | Authenticated |
| ------------------------------- | ---------------------------------: | ------------: |
| Open existing dossier           |                                  ✓ |             ✓ |
| Read summary                    |                                  ✓ |             ✓ |
| Read key contributions          |                                  ✓ |             ✓ |
| Read "Should I Read?"           |                                  ✓ |             ✓ |
| Open legal OA version           |                                  ✓ |             ✓ |
| View existing research context  |                                  ✓ |             ✓ |
| Start research on unknown paper |            Limited / initial stage |             ✓ |
| Continue new research           |                                  ✗ |             ✓ |
| Generate new AI dossier         | Requires auth + configured AI path |             ✓ |
| Research history                |                                  ✗ |             ✓ |
| Save papers                     |                             Future |        Future |
| Cross-device sync               |                                  ✗ |        Future |
| Personalization                 |                                  ✗ |        Future |
| Custom AI providers             |                                  ✗ |       Phase 2 |

---

# 14. BYOK Settings

The Settings page should be accessible from the extension and web experience.

Initial structure:

```text
Settings

AI
────────────────────
Provider

Google Gemini

API Key
[••••••••••••••]

[Save]

────────────────────

Account

Signed in as:
user@example.com

[Manage Account]

────────────────────

Extension

Keyboard Shortcut
Floating Button
Auto-open preferences

────────────────────

About

Version
Changelog
Documentation
Report Issue
```

If the user is not authenticated:

```text
Account

Not signed in

[Sign up]
[Log in]
```

---

# 15. BYOK Security

API keys must never be:

* Stored in Supabase
* Stored in Redis
* Included in URLs
* Included in analytics
* Written to logs
* Sent to third-party analytics
* Persisted server-side unnecessarily

For the browser extension, use:

```text
chrome.storage.local
```

for local BYOK configuration.

Do not use URL query parameters for API keys.

The API key should only be passed to the backend over HTTPS when required for a fresh generation.

The server should hold the key only temporarily in memory for the request.

---

# 16. AI Provider Abstraction

The AI pipeline should not be coupled directly to Gemini.

Create:

```ts
interface AIProvider {
  generateResearchResult(
    context: ResearchContext
  ): Promise<ResearchResult>
}
```

Initial implementation:

```text
GeminiProvider
```

Future:

```text
OpenAIProvider
AnthropicProvider
CustomProvider
```

Do not implement future providers now.

---

# 17. Research Pipeline

The research pipeline remains:

```text
Paper Request
      ↓
Request Normalization
      ↓
Redis Lookup
      ↓
Supabase Lookup
      ↓
Paper Identification
      ↓
Metadata Enrichment
      ↓
Research Discovery
      ↓
Evidence Validation
      ↓
AI Analysis
      ↓
Zod Response Validation
      ↓
Supabase Persistence
      ↓
Redis Cache
      ↓
Research Dossier
```

However, the pipeline should support a checkpoint.

```text
Initial Research
      ↓
Authentication Checkpoint
      ↓
Authenticated Research
      ↓
AI Generation
      ↓
Final Dossier
```

---

# 18. Research Progress UI

The research progress UI should be inspired by the Flash-style research progress experience.

Example:

```text
Researching Paper...

✓ Identifying paper
✓ Extracting DOI
✓ Confirming metadata
● Checking open-access versions
○ Finding related research
○ Analyzing paper
○ Building research dossier
```

For anonymous users on a new paper:

```text
Initial research complete

20%

Sign in to continue.
```

The exact progress percentage should only be shown if it corresponds to meaningful pipeline stages.

Do not fake precision.

---

# 19. Persistent Research Corpus

Supabase should be treated as the persistent research corpus.

Redis remains the fast cache.

```text
Redis
= L1 performance cache

Supabase
= persistent research corpus
```

A paper that has already been researched should ideally be reusable by future users.

Example:

```text
User A
 ↓
New paper
 ↓
Research generated
 ↓
Supabase

User B
 ↓
Same paper
 ↓
Supabase HIT
 ↓
Show existing dossier
```

This is important for reducing repeated AI inference.

---

# 20. Cache Hierarchy

Required behavior:

```text
Request
   ↓
Redis
   │
   ├── HIT
   │    ↓
   │  Return dossier
   │
   └── MISS
        ↓
     Supabase
        │
        ├── HIT
        │    ↓
        │  Populate Redis
        │    ↓
        │  Return dossier
        │
        └── MISS
             ↓
       Start research
             ↓
       Initial research
             ↓
       Authentication
             ↓
       Continue pipeline
             ↓
       AI generation
             ↓
       Supabase
             ↓
       Redis
             ↓
       Return dossier
```

This sequence must be covered by integration tests.

---

# 21. Extension Onboarding & Changelog

The extension should detect:

### First installation

```text
New installation
      ↓
Welcome page
      ↓
Explain Archyve V2
      ↓
Configure BYOK
      ↓
Continue
```

### Extension update

```text
New extension version
      ↓
Compare lastSeenVersion
      ↓
If different
      ↓
Open changelog / What's New
```

Do not open the changelog on every service-worker restart.

Store:

```text
lastSeenVersion
```

in extension storage.

The welcome/changelog page should follow the existing `design.md`.

---

# 22. Phase 1B — Immediate Execution & Validation

Do not begin broad Phase 2 development yet.

First implement and validate the above flow.

## Priority order

### Step 1 — Account boundary

Implement the minimal authentication flow:

```text
Login
Signup
Session
Logout
```

Do not build a large account system.

---

### Step 2 — Settings

Implement:

* AI provider
* BYOK key configuration
* Account status
* Extension preferences
* Version/changelog

---

### Step 3 — Research checkpoint

Implement:

```text
Unknown paper
 ↓
Initial research
 ↓
20% checkpoint
 ↓
Login/signup
 ↓
Resume research
```

---

### Step 4 — Research history

After authentication, record:

* User
* Paper
* Research session
* Timestamp
* Final dossier

---

### Step 5 — Existing corpus access

Verify that:

```text
Anonymous + existing paper
```

works without authentication.

---

### Step 6 — New paper access

Verify that:

```text
Anonymous + unknown paper
```

can reach the initial research checkpoint but cannot continue into expensive AI generation until authenticated.

---

### Step 7 — BYOK generation

Verify:

```text
Authenticated user
      ↓
BYOK configured
      ↓
Continue research
      ↓
AI generation
      ↓
Validated dossier
```

---

### Step 8 — Cache/corpus reuse

Verify:

```text
First research
 ↓
Supabase

Second request
 ↓
Redis/Supabase HIT
 ↓
No new AI generation
```

---

### Step 9 — Extension flow

Test all four entry points:

```text
✓ Extension icon
✓ Context menu
✓ Keyboard shortcut
✓ URL prepend
```

All must converge on the same backend flow.

---

### Step 10 — Real-world publisher testing

Test:

* IEEE
* Springer
* Elsevier
* JSTOR
* arXiv

Test both:

```text
Existing paper
New paper
```

---

# 23. Important Test Cases

The implementation should explicitly test:

### Existing corpus

```text
Paper exists
→ Anonymous
→ Immediate dossier
```

### New paper

```text
Paper missing
→ Anonymous
→ Initial research
→ Authentication gate
→ Login
→ Resume
→ Generate dossier
```

### Logged-in user

```text
Paper missing
→ Logged in
→ Initial research
→ Continue automatically
→ Generate dossier
```

### BYOK missing

```text
Authenticated
→ New paper
→ No AI key
→ Show Settings / Configure AI
```

### BYOK configured

```text
Authenticated
→ New paper
→ BYOK available
→ Generate
```

### Existing dossier

```text
Any user
→ Existing dossier
→ No AI key required
```

### Extension update

```text
Version changed
→ Changelog opens once
```

### Browser restart

```text
Service worker restarts
→ Changelog does NOT reopen
```

---

# 24. Explicitly Do Not Build Yet

Do not implement:

* Managed AI billing infrastructure
* Paid subscriptions
* Multiple AI providers
* Custom AI providers
* Advanced model settings
* Complex user profiles
* Social features
* Citation graph
* Personalized research feed
* AI research agents
* Reverse proxy
* Load balancer
* Distributed workers
* Complex queue infrastructure
* Advanced collections
* Advanced recommendation engine

These remain future work.

---

# 25. Product Flow Summary

The complete MVP should now behave like this:

```text
                    USER
                      │
             ┌────────┴─────────┐
             │                  │
         EXTENSION              WEB
             │                  │
             └────────┬─────────┘
                      ↓
               PAPER REQUEST
                      ↓
               Redis / Supabase
                ↙           ↘
          EXISTING          NEW
             │               │
             ↓               ↓
       SHOW DOSSIER      INITIAL RESEARCH
       No login             ↓
                         ~20%
                            ↓
                      ┌─────┴─────┐
                      │           │
                   LOGGED       ANON
                      │           │
                      ↓           ↓
                  CONTINUE      LOGIN
                      │           │
                      └─────┬─────┘
                            ↓
                     AI GENERATION
                            ↓
                       BYOK AI
                            ↓
                    VALIDATE RESULT
                            ↓
                        Supabase
                            ↓
                          Redis
                            ↓
                     FINAL DOSSIER
                            ↓
                  Research History
```

---

# 26. Definition of Done

This stage is complete when:

* [ ] Anonymous users can open existing research dossiers.
* [ ] New papers perform initial deterministic research.
* [ ] New research pauses at the authentication checkpoint.
* [ ] Login/signup works.
* [ ] Authenticated users can resume the research.
* [ ] BYOK can be configured from Settings.
* [ ] BYOK works without requiring an account where appropriate.
* [ ] API keys are never persisted server-side.
* [ ] AI provider logic is abstracted.
* [ ] Existing dossiers do not require an AI key.
* [ ] New AI generation uses the configured BYOK path.
* [ ] Research sessions persist for authenticated users.
* [ ] Research history is visible after login.
* [ ] Extension first-install onboarding works.
* [ ] Extension update changelog works once per version.
* [ ] Extension icon works.
* [ ] Context menu works.
* [ ] Keyboard shortcut works.
* [ ] URL prepend works.
* [ ] Redis → Supabase lookup hierarchy works.
* [ ] Existing research is reused instead of regenerated.
* [ ] IEEE/Springer/Elsevier/JSTOR/arXiv flows are tested.
* [ ] Failure states are handled gracefully.
* [ ] Production build succeeds.
* [ ] Real-world end-to-end testing is completed.

---

# 27. Final Product Principle

Archyve should make a very clear distinction:

> **Reading research that Archyve already knows is frictionless.**

> **Creating new research intelligence is a deliberate authenticated action.**

The extension remains the fastest way to enter Archyve.

The web application becomes the research workspace.

The persistent corpus makes research reusable.

BYOK keeps AI inference economically viable for the current stage.

Authentication creates continuity around new research and history.

The MVP should remain focused on one outcome:

> **Understand the paper → decide whether it matters → continue researching.**

```

**One important correction from our earlier discussion:** I deliberately made **BYOK and authentication separate** here. A user can have BYOK, but the *new-research continuation gate* is still an authenticated flow as you just described. That's the product decision we've now landed on.

So the resulting architecture is basically:

**Existing paper → free anonymous read.**  
**New paper → initial research → login → continue → BYOK AI → dossier.**  
**Logged-in web → research workspace + history.**  
**Extension → fast entry point into that same system.**

That feels much more coherent as an MVP.
```
