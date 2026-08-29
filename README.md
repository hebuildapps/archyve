<p align="center">
  <picture>
    <source srcset="apps/web/public/archyve-trademark-dark.png" media="(prefers-color-scheme: dark)">
    <source srcset="apps/web/public/archyve-trademark.png" media="(prefers-color-scheme: light)">
    <img src="apps/web/public/archyve-trademark.png" alt="Archyve" width="400" />
  </picture>
</p>

<p align="center">
  <strong>AI-powered research intelligence layer for academic literature. Instantly evaluate papers, extract structured claims, and find open-access sources.</strong>
</p>

<p align="center">
  <a href="https://archyve.xyz">Live App</a> ·
  <a href="https://archyve.xyz/blog">Blog / Manifesto</a> ·
  <a href="https://archyve.xyz/privacy">Privacy & BYOK</a> ·
  <a href="https://archyve.xyz/settings">Settings</a> ·
  <a href="https://github.com/hebuildapps/archyve/issues">Issues</a>
</p>

<p align="center">
  <a href="https://archyve.xyz/blog"><img src="https://img.shields.io/badge/Announcements-archyve%2Fblog-blue?style=flat-square" alt="Announcements" /></a>
  <a href="https://archyve.xyz"><img src="https://img.shields.io/badge/Live%20Demo-archyve.xyz-black?style=flat-square" alt="Live Demo" /></a>
  <a href="https://github.com/hebuildapps/archyve/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <strong>Evaluate any academic paper in under 30 seconds with verified bibliographic provenance.</strong><br/>
  <strong>Publisher Web Scraping · Crossref & OpenAlex Sync · BYOK AI Dossier Engine</strong>
</p>

---

Archyve is an intelligent academic research assistant that transforms complex academic papers into actionable research dossiers in seconds.

Researchers spend 15 to 30 minutes per paper switching browser tabs, searching metadata registries, and cross-referencing citations just to answer one question: *“Is this paper worth a deep read?”*

Archyve answers that question instantly by scraping paper metadata from publishers, validating facts against global registries, locating legal open-access PDFs, and extracting structured intelligence with your preferred LLM.

| | |
|---|---|
| 📑 **Publisher Adapters** | Automatic metadata & abstract extraction from IEEE Xplore, ScienceDirect / Elsevier, Springer Nature, JSTOR, and arXiv. |
| 🛡️ **Provenance & Verification** | Cross-validates publisher scraped metadata with official registries (Crossref, OpenAlex) to prevent AI hallucinations on paper facts. |
| ⚡ **AI Research Dossiers** | Generates structured breakdowns: executive summary, "Should I Read" decision matrix, core claims, methodology, limitations, and key findings. |
| 🔓 **Legal Open-Access PDFs** | Integrates Unpaywall and OpenAlex to locate legal open-access full-text PDFs and author preprints automatically. |
| 🔑 **Private BYOK Architecture** | Zero server-side API key retention. Your Groq or Gemini API keys stay encrypted directly in your browser's local storage. |
| 🧩 **Browser Extension** | Instant 1-click analysis directly from publisher paper pages without copying and pasting URLs. |

---

## Use Archyve

<table>
<tr>
<td width="50%" valign="top">

### 🧑‍🔬 I read academic papers

Evaluate papers in seconds using our hosted web app. Paste any paper URL or DOI, and receive an instant structured dossier.

- Transparent "Should I Read" recommendations
- Verified bibliographic data and citations
- Legal open-access PDF detection

**[→ Launch Archyve Web](https://archyve.xyz)**

</td>
<td width="50%" valign="top">

### 🔧 I'm developing or self-hosting

Run the full monorepo locally with custom adapters, BYOK models, and the companion browser extension.

- Next.js 16 (App Router & Turbopack)
- Tailored publisher scrapers and enrichment pipeline
- Zero telemetry & client-side encrypted BYOK

**[→ Jump to Quickstart](#getting-started)**

</td>
</tr>
</table>

---

## How Archyve Works Under the Hood

```text
Publisher Paper URL / DOI
        ↓
   Archyve Engine
        │
        ├── 1. Publisher Adapters    Scrapes raw metadata from IEEE, ScienceDirect, Springer, JSTOR, arXiv
        ├── 2. Verification Layer    Cross-checks with Crossref & OpenAlex (title normalization, DOI matching)
        ├── 3. Open-Access Finder    Queries Unpaywall for legal open-access PDF preprints
        ├── 4. AI Dossier Pipeline   Executes ground-truth prompt with Groq / Gemini (BYOK)
        └── 5. Related Works & Code  Identifies connected literature and open-source GitHub repositories
```

**Anti-Hallucination Provenance Protection**: Archyve enforces ground-truth publisher metadata before passing context to AI models. Verified paper facts (authors, publication date, DOI, citations) cannot be overwritten by LLM hallucinations.

---

## Workspace Structure

This repository is organized as an npm monorepo:

- **`apps/web`**: Next.js web application powering the research dossier interface, streaming analysis pipeline, and API routes.
- **`apps/extension`**: Browser extension for instant analysis directly on publisher websites.
- **`packages/shared`**: Shared Zod schemas, TypeScript types, and validation utilities.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- (Optional) Upstash Redis & Supabase for caching and shared corpus storage

### 1. Clone & Install

```bash
git clone https://github.com/hebuildapps/archyve.git
cd archyve
npm install
```

### 2. Configure Environment

Copy the example environment file in `apps/web`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Configure your environment variables:

```env
# Optional server-side fallbacks (Users can BYOK in the UI)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Optional caching & database
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Locally

```bash
# Build shared packages
npm run build --prefix packages/shared

# Start web app development server
npm run dev --prefix apps/web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Privacy & Security

- **Client-Side BYOK**: Your AI API keys (Google Gemini / Groq) are stored locally in your browser (`localStorage`) and sent only in direct request headers.
- **Zero Key Logging**: Archyve does not persist, log, or track user API keys on any backend server.
- **Open Access**: Resolves papers through open scientific registries (Crossref, OpenAlex, Unpaywall).

---

## Links

- 🌐 [Live Application](https://archyve.xyz)
- 📝 [Manifesto & Architecture Blog](https://archyve.xyz/blog)
- 🔒 [Privacy Policy & Key Management](https://archyve.xyz/privacy)
- 🛡️ [Report an Issue](https://github.com/hebuildapps/archyve/issues)

---

<p align="center">
  <strong>Archyve — Research intelligence for the next generation of discovery.</strong>
</p>
