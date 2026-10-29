// Archyve Extension Popup Logic

const SUPPORTED_DOMAINS = [
  'ieeexplore.ieee.org',
  'link.springer.com',
  'sciencedirect.com',
  'jstor.org',
  'arxiv.org',
  'pubmed.ncbi.nlm.nih.gov',
  'pmc.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'nature.com',
  'doi.org'
];

function isSupportedUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return SUPPORTED_DOMAINS.some(domain => parsed.hostname.includes(domain));
  } catch {
    return false;
  }
}

function getDomainFromUrl(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const supportedState = document.getElementById('supported-state') as HTMLDivElement;
  const unsupportedState = document.getElementById('unsupported-state') as HTMLDivElement;
  const paperTitleDisplay = document.getElementById('paper-title-display') as HTMLDivElement;
  const paperDomainDisplay = document.getElementById('paper-domain-display') as HTMLSpanElement;
  const btnTrigger = document.getElementById('btn-trigger') as HTMLButtonElement;
  const openSettingsLink = document.getElementById('open-settings-link') as HTMLAnchorElement;

  // Settings link
  if (openSettingsLink) {
    openSettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
    });
  }

  // Detect current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    const url = activeTab?.url;

    if (url && isSupportedUrl(url)) {
      if (supportedState) supportedState.style.display = 'block';
      if (unsupportedState) unsupportedState.style.display = 'none';

      const domain = getDomainFromUrl(url);
      if (paperDomainDisplay) paperDomainDisplay.textContent = domain;
      if (paperTitleDisplay && activeTab.title) {
        paperTitleDisplay.textContent = activeTab.title.slice(0, 48) + (activeTab.title.length > 48 ? '...' : '');
      }

      if (btnTrigger) {
        btnTrigger.addEventListener('click', () => {
          chrome.storage.local.get(['webUrl'], (result) => {
            const baseWebUrl = result.webUrl || 'https://archyve.xyz';
            const targetUrl = `${baseWebUrl}/${encodeURIComponent(url)}?trigger=extension`;
            chrome.tabs.create({ url: targetUrl });
            window.close();
          });
        });
      }
    } else {
      if (supportedState) supportedState.style.display = 'none';
      if (unsupportedState) unsupportedState.style.display = 'block';
    }
  });
});
