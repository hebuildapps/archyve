# Archyve V2

Archyve V2 is a modern, AI-powered research platform and browser extension designed to help researchers seamlessly discover, summarize, and evaluate academic papers.

## Features
- **AI-Powered Analysis**: Integrated with Gemini to provide instant summaries, "Should I Read" ratings, and research context extraction.
- **Cross-Publisher Discovery**: Supports extracting metadata from major academic publishers (IEEE, Springer, Elsevier, JSTOR, arXiv).
- **Extension Integration**: A browser extension to catch paper URLs and seamlessly hand off to the web application.
- **BYOK Architecture**: Bring Your Own Key authentication support.
- **Deduplication & Caching**: Efficient lookup pipelines backed by Redis and Supabase.

## Workspace Structure
- `apps/web`: The Next.js application powering the research dossier UI and API routes.
- `apps/extension`: The browser extension entry points and service workers.
- `packages/shared`: Shared schemas, types, and utilities.

## Getting Started
Ensure you have the required environment variables configured for Supabase and Upstash Redis.
```bash
npm install
npm run build --workspaces
```
