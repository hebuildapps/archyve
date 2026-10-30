// Archyve Browser Extension Service Worker

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

function triggerArchyve(url?: string) {
  chrome.storage.local.get(['webUrl'], (result) => {
    const baseWebUrl = result.webUrl || 'https://archyve.xyz';
    if (url && isSupportedUrl(url)) {
      const targetUrl = `${baseWebUrl}/${encodeURIComponent(url)}?trigger=extension`;
      chrome.tabs.create({ url: targetUrl });
    } else {
      // Fallback: always give visual feedback by opening Archyve web app
      chrome.tabs.create({ url: baseWebUrl });
    }
  });
}

// 1. Context Menu & Onboarding Registration
chrome.runtime.onInstalled.addListener((details) => {
  const currentVersion = chrome.runtime.getManifest().version;

  if (details.reason === 'install') {
    chrome.storage.local.set({ lastSeenVersion: currentVersion }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    });
  } else if (details.reason === 'update') {
    chrome.storage.local.get(['lastSeenVersion'], (result) => {
      if (result.lastSeenVersion !== currentVersion) {
        chrome.storage.local.set({ lastSeenVersion: currentVersion }, () => {
          chrome.runtime.openOptionsPage();
        });
      }
    });
  }

  chrome.contextMenus.create({
    id: 'open-archyve',
    title: 'open with archyve',
    contexts: ['page'],
    documentUrlPatterns: [
      "*://ieeexplore.ieee.org/document/*",
      "*://link.springer.com/article/*",
      "*://link.springer.com/chapter/*",
      "*://link.springer.com/referenceworkentry/*",
      "*://*.sciencedirect.com/science/article/pii/*",
      "*://*.jstor.org/stable/*",
      "*://arxiv.org/abs/*",
      "*://pubmed.ncbi.nlm.nih.gov/*",
      "*://pmc.ncbi.nlm.nih.gov/*"
    ]
  });
});

// 2. Context Menu Click Listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-archyve' && tab?.url) {
    triggerArchyve(tab.url);
  }
});

// 3. Extension Action (Icon) Click Listener (when no popup or fallback)
chrome.action.onClicked.addListener((tab) => {
  if (tab?.url) {
    triggerArchyve(tab.url);
  }
});

// 4. Keyboard Shortcut Listener (Async with full fallback)
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[Archyve] Command received:', command);
  if (command === 'trigger_archyve') {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const activeTab = tabs[0] || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      triggerArchyve(activeTab?.url);
    } catch (err) {
      console.error('[Archyve] Shortcut query error:', err);
      triggerArchyve();
    }
  }
});

// 5. Message Listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'trigger_analysis' && message.url) {
    triggerArchyve(message.url);
  }
});
