// Archyve V2 Browser Extension Service Worker

const SUPPORTED_DOMAINS = [
  'ieeexplore.ieee.org',
  'link.springer.com',
  'sciencedirect.com',
  'jstor.org',
  'arxiv.org'
];

function isSupportedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SUPPORTED_DOMAINS.some(domain => parsed.hostname.includes(domain));
  } catch {
    return false;
  }
}

function triggerArchyve(url: string) {
  if (!isSupportedUrl(url)) {
    console.warn('Archyve: Unsupported URL:', url);
    return;
  }

  // Retrieve configurable web application host URL from extension storage (defaults to https://archyve.xyz)
  chrome.storage.local.get(['webUrl'], (result) => {
    const baseWebUrl = result.webUrl || 'https://archyve.xyz';
    const targetUrl = `${baseWebUrl}/${encodeURIComponent(url)}`;
    chrome.tabs.create({ url: targetUrl });
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
          // Open options page where settings and changelog are displayed
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
      "*://arxiv.org/abs/*"
    ]
  });
});

// 2. Context Menu Click Listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-archyve' && tab?.url) {
    triggerArchyve(tab.url);
  }
});

// 3. Extension Action (Icon) Click Listener
chrome.action.onClicked.addListener((tab) => {
  if (tab?.url) {
    triggerArchyve(tab.url);
  }
});

// 4. Keyboard Shortcut Listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger_archyve') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        triggerArchyve(activeTab.url);
      }
    });
  }
});

// 5. Content Script Message Listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'trigger_analysis' && message.url) {
    triggerArchyve(message.url);
  }
});
