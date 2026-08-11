// Archyve V2 Page Content Script

// Injects a premium, unobtrusive floating button to trigger analysis
function injectFloatingButton() {
  // Avoid duplicate injection
  if (document.getElementById('archyve-trigger-pill')) return;

  const pill = document.createElement('div');
  pill.id = 'archyve-trigger-pill';
  
  // Clean, editorial styling
  pill.style.position = 'fixed';
  pill.style.bottom = '24px';
  pill.style.right = '24px';
  pill.style.zIndex = '999999';
  pill.style.display = 'flex';
  pill.style.alignItems = 'center';
  pill.style.gap = '8px';
  pill.style.padding = '10px 16px';
  pill.style.borderRadius = '99px';
  pill.style.backgroundColor = '#18181b';
  pill.style.color = '#ffffff';
  pill.style.border = '1px solid rgba(255,255,255,0.1)';
  pill.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  pill.style.cursor = 'pointer';
  pill.style.fontFamily = 'Inter, system-ui, sans-serif';
  pill.style.fontSize = '12px';
  pill.style.fontWeight = '600';
  pill.style.letterSpacing = '-0.01em';
  pill.style.transition = 'all 0.2s ease-in-out';
  pill.style.userSelect = 'none';
  pill.style.opacity = '0';
  pill.style.transform = 'translateY(10px)';

  // Small book icon svg
  pill.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="shrink:0;">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
      <path d="M6 6h10"/>
      <path d="M6 10h10"/>
    </svg>
    <span>Analyze with Archyve</span>
  `;

  // Hover animations
  pill.addEventListener('mouseenter', () => {
    pill.style.backgroundColor = '#27272a';
    pill.style.transform = 'translateY(-2px)';
    pill.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  });

  pill.addEventListener('mouseleave', () => {
    pill.style.backgroundColor = '#18181b';
    pill.style.transform = 'translateY(0)';
    pill.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });

  pill.addEventListener('click', () => {
    // Send click trigger back to background service worker
    chrome.runtime.sendMessage({
      action: 'trigger_analysis',
      url: window.location.href
    });
  });

  document.body.appendChild(pill);

  // Fade in animation
  setTimeout(() => {
    pill.style.opacity = '1';
    pill.style.transform = 'translateY(0)';
  }, 300);
}

// Check for feature flag (disabled by default)
chrome.storage.local.get(['enableFloatingButton'], (result) => {
  if (result.enableFloatingButton === true) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      injectFloatingButton();
    } else {
      window.addEventListener('DOMContentLoaded', injectFloatingButton);
    }
  }
});
