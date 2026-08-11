// Archyve Extension Options Script

document.addEventListener('DOMContentLoaded', () => {
  const webUrlInput = document.getElementById('web-url') as HTMLInputElement;
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load saved configurations
  chrome.storage.local.get(['webUrl', 'apiKey'], (result) => {
    if (result.webUrl) {
      webUrlInput.value = result.webUrl;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  // Save configurations
  saveBtn.addEventListener('click', () => {
    const webUrl = webUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    chrome.storage.local.set({ webUrl, apiKey }, () => {
      // Show saved message
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    });
  });
});
