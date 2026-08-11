# ui-design

## Visual Direction

- Archyve is a focused AI research dossier, not a SaaS dashboard.
- Use a centered reading column with generous whitespace and restrained neutral surfaces.
- Prioritize editorial readability, information hierarchy, and progressive disclosure.
- Take interaction inspiration from the provided Flash AI references without copying their branding, assets, or exact layouts.
- Avoid excessive gradients, glassmorphism, neon effects, oversized cards, and generic AI-dashboard aesthetics.

## Research Page

- Primary flow:
  Paper Identity → Summary → Should I Read? → Open Access → Evidence → Related Research → Sources.
- Use a stable page structure; AI populates components but never determines the layout.
- Major sections use consistent spacing and subtle separators.
- Use cards only for high-value information clusters; don't wrap every section in a card.

## Research Header

- Show title, authors, year, venue/publisher, DOI and relevant identifiers.
- Title is the strongest typographic element.
- Metadata is compact and muted.
- Keep navigation minimal; no persistent dashboard sidebar.

## Loading

- Render the page shell immediately.
- Show a branded Archyve skeleton/loading state.
- Progressively populate sections as pipeline stages complete.
- Never invent progress percentages.

## AI Recommendation

- "Should I Read This?" is the primary analytical component.
- Show an AI recommendation score with a short explanation.
- Supporting dimensions may include relevance, novelty, usefulness, difficulty and foundational importance.
- Scores must be presented as AI assessments, not objective scientific measurements.

## Evidence

- Show compact source-analysis information.
- Prefer authoritative/primary research sources over community sources.
- Clearly distinguish AI interpretation, paper facts, and external/community context.
- Provide a complete Sources section.

## Open Access

- Surface legitimate freely accessible versions prominently.
- Never expose or facilitate paywall bypasses or unauthorized copies.
- Missing open-access versions should use a neutral empty state.

## Progressive Disclosure

- Prefer expandable rows, "View more", drawers and compact source groups.
- Show the most decision-relevant information first.
- Don't overwhelm the first viewport with every retrieved fact.

## Research Sections

Use reusable components for:

- Summary
- Key Contributions
- AI Recommendation
- Difficulty / Reading Time
- Open Access
- Strengths
- Limitations
- Research Context
- Related Papers
- Implementations / Datasets
- Sources

Long lists should collapse by default.

## Components

- Use existing project components/icons where possible.
- Don't replace the icon system wholesale.
- Primary actions use solid buttons.
- Secondary actions use ghost/text buttons.
- Destructive actions use semantic destructive styling.
- External resources should visibly behave like external links.
- Keep buttons compact and consistent.

## Visual System

- Neutral/off-white base.
- Restrained accent color.
- Semantic colors only for meaningful states.
- Thin low-contrast borders.
- Soft shadows only for elevated/floating surfaces.
- Consistent corner radius.
- Strong typography hierarchy.
- Comfortable body line-height.

## Responsive

- Mobile-first.
- Centered max-width reading column on desktop.
- Full-width content with consistent horizontal padding on mobile.
- No unnecessary horizontal scrolling.
- Touch-friendly expandable sections and actions.

## Accessibility

- Maintain contrast.
- Never rely on color alone.
- Keyboard-accessible interactions.
- Clear accessible labels for external links and controls.

## Motion

- Subtle transitions only.
- Skeleton → content transitions may be animated.
- Expand/collapse may animate gently.
- No distracting AI animations.

## Taste

- Calm.
- Premium.
- Editorial.
- Technical.
- Dense but readable.
- Minimal chrome.
- Progressive disclosure.
- Evidence over decoration.

Avoid:

- Generic AI gradients
- Neon/glow-heavy UI
- Excessive pills
- Giant cards
- Decorative illustrations
- Dashboard-style information overload