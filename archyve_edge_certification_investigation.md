# Archyve Edge Extension — Microsoft Certification Investigation & Remediation Report

**Date:** October 26, 2026  
**Product Name:** `archyve`  
**Publisher:** `Heramb.0x1`  
**Product ID:** `ca926f63-7737-43d2-baec-36aeb2b099fd`  
**Store ID:** `0RDCKDWQZVCD`  
**Certification Status:** `Attention needed` (Product unpublished)

---

## 1. Executive Summary

Microsoft Edge Add-ons certification returned **Attention needed** and unpublished Archyve citing:
1. **Technical requirement 1.1.2 — Distinct Function & Value; Accurate Representation:**  
   *Note:* *"The product, including its listing, does not accurately represent the product and may mislead users. Your product may not use a name or icon that is too similar to that of other products."*
2. **Content requirement 2.8 — Prohibited Content, Services and Activity:**  
   *Note:* *"The extension manipulates existing features of the Microsoft system in a manner that is not permitted."*

### Key Causes Discovered

- **Cause 1 (1.1.2 - Bio):** The store description in Partner Center claimed *"6,000+ users, 3,000+ weekly active users"* and *"Drop in a research URL. Get structured intelligence"*. In Partner Center, Microsoft tracks real Edge telemetry. Unverified or cross-platform user numbers in Edge Add-ons listings are flagged as misleading metadata. Moreover, the extension does not have an input field to drop in URLs (that describes the web app, not the extension).
- **Cause 2 (1.1.2 - Screenshots):** Screenshot 1 showed an on-page floating pill button that was removed in v3.0.0. Screenshot 3 showed the web app settings in a macOS window rather than the Edge extension.
- **Cause 3 (1.1.2 & 2.2 - Browser references):** `welcome.html` displayed a prominent *"install extension"* box with the Google Chrome logo and a link to the Chrome Web Store (`https://ggl.link/archyve`), alongside an unapproved Microsoft Edge logo. Policy 1.1.2 explicitly mandates: *"must not reference other browsers"*.
- **Cause 4 (1.1.2 - First run failure):** The extension lacked a `default_popup`. Clicking the toolbar icon on any page other than 5 specific academic URLs silently failed with `console.warn` and zero visual feedback.
- **Cause 5 (2.8 - Ecosystem manipulation):** Triggering an install tab (`welcome.html`) in Edge that promotes downloading the Chrome extension is considered manipulating Edge's onboarding and browser acquisition features.
- **Cause 6 (2.8 - Empty content script):** `manifest.json` injected `content.js` across major academic publisher domains, but `detector.ts` was an empty comment. Injecting dead scripts into sensitive origins triggers automated static analysis alerts.
- **Cause 7 (2.8 - Paywall risk):** Unclear metadata on commercial publisher matching (IEEE, ScienceDirect) can trigger paywall circumvention suspicion unless explicitly declared as public metadata parsing.

---

## 2. Actionable Remediation Checklist

### Code & Asset Remediation (Completed)
- [x] **Task 1: Clean `welcome.html`** — Removed the `.browsers-strip` and all competing browser references (Chrome logo, Chrome Web Store link, Edge logo). Replaced with a clean "Supported Academic Portals" guide.
- [x] **Task 2: Delete Offending Browser Logos** — Deleted `assets/icons/chrome.svg`, `assets/icons/Microsoft_Edge_logo_(2019).svg`, `assets/chrome.svg`, and `assets/edge-logo.svg`.
- [x] **Task 3: Clean `manifest.json`** — Removed the unused `content_scripts` declaration, updated description, and registered `default_popup: "popup.html"`.
- [x] **Task 4: Build Interactive Toolbar Popup (`popup.html` & `src/popup.ts`)** — Created a dedicated popup that detects current tab domain, offers a 1-click "Evaluate with Archyve" button on supported sites, lists supported portals with badges on unsupported pages, and provides a direct test link to an open-access arXiv paper.
- [x] **Task 5: Update `tsup.config.ts`** — Added `popup: 'src/popup.ts'` to entry points.
- [x] **Task 6: Update `package.mjs`** — Configured copying `popup.html` and `popup.js`, and added automated packaging for `archyve-v2-edge.zip`.
- [x] **Task 7: Build & Validate Packages** — Built and verified `archyve-v2-edge.zip` in `apps/extension/packages/` (172 KB, cleanly assembled with zero prohibited assets).

### Partner Center Submission Checklist (Manual User Actions)
- [ ] **Task 8: Update Store Listing Description** — Replace existing bio with the verified compliant description below (removing the 6k users claim).
- [ ] **Task 9: Update Screenshots** — Replace outdated screenshots showing the removed floating widget with captures of the new toolbar popup and options page running in Microsoft Edge.
- [ ] **Task 10: Paste Notes for Certification** — Insert the prepared certification notes clarifying public metadata extraction and zero paywall circumvention.
- [ ] **Task 11: Upload `archyve-v2-edge.zip` and Resubmit** — Upload the newly built zip package in Partner Center and click "Submit for certification".

---

## 3. Verified Store Listing Copy for Partner Center

```text
Archyve is an academic research companion that brings instant paper intelligence to your literature review workflow.

When viewing an academic paper on arXiv, IEEE Xplore, ScienceDirect, Springer Nature, or JSTOR, Archyve allows you to evaluate the paper in seconds without manual copy-pasting.

Key Features:
* 1-Click Paper Analysis — Trigger analysis directly from your browser via the toolbar icon, context menu, or keyboard shortcut (Ctrl+Shift+H).
* Verified Bibliographic Intelligence — Instantly cross-reference paper metadata, author provenance, and citations with global academic registries.
* Legal Open-Access Detection — Locate open-access preprints and legal author-archived PDFs via Unpaywall and OpenAlex.
* Private BYOK Architecture — Configure your own Google Gemini or Groq API keys locally for private, client-side evaluation without account limits.

Supported Academic Portals:
* arXiv (arxiv.org)
* IEEE Xplore (ieeexplore.ieee.org)
* ScienceDirect / Elsevier (sciencedirect.com)
* Springer Nature (link.springer.com)
* JSTOR (jstor.org)

How to Use:
1. Navigate to any research paper on a supported academic website.
2. Click the Archyve icon in your browser toolbar or press Ctrl+Shift+H (Cmd+Shift+H on macOS).
3. Archyve opens a structured evaluation dossier for the paper with executive summaries, core claims, methodology analysis, and limitations.

Note: Archyve parses only public bibliographic metadata and connects to authorized open-access repositories. It does not bypass paywalls or access restricted publisher content.
```

---

## 4. Notes for Certification Reviewer

```text
Notes for Certification Reviewer:

Product Purpose:
Archyve is an academic research companion that assists researchers in reading academic literature. When viewing academic papers on arXiv, IEEE Xplore, ScienceDirect, Springer Nature, and JSTOR, users can trigger structured literature evaluations via our web application.

Regarding Policy 1.1.2 (Distinct Function & Value; Accurate Representation):
- Store listing description has been updated: all unverified user metrics have been removed, and the copy accurately details how the extension operates.
- Outdated screenshots showing removed UI elements have been replaced with accurate captures of the extension in Microsoft Edge.
- All external browser references and competing browser logos have been removed from extension assets and onboarding pages.
- An interactive toolbar popup (popup.html) has been implemented to ensure an immediate, functional first-run experience on any active tab.
- A direct test link to an open-access arXiv paper (https://arxiv.org/abs/1706.03762) is provided directly in the popup and onboarding page for instant testability.

Regarding Policy 2.8 (Prohibited Content, Services and Activity):
- Archyve does not bypass paywalls, does not circumvent authentication, and does not provide unauthorized access to restricted or copyrighted publisher content. It only reads public bibliographic metadata and links to legal open-access preprints via Unpaywall and OpenAlex.
- Archyve does not alter, override, or manipulate Microsoft Edge browser settings, search providers, or system features.
- All unused content scripts have been removed; operations are purely user-initiated via the extension toolbar popup, keyboard shortcut (Ctrl+Shift+H), or context menu.
```
