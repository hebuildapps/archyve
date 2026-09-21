// Archyve Extension Options Script

document.addEventListener('DOMContentLoaded', () => {
  const groqApiKeyInput = document.getElementById('groq-api-key') as HTMLInputElement;
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load saved configurations
  chrome.storage.local.get(['groqApiKey', 'apiKey'], (result) => {
    if (result.groqApiKey) {
      groqApiKeyInput.value = result.groqApiKey;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  // Save configurations
  saveBtn.addEventListener('click', () => {
    const groqApiKey = groqApiKeyInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    chrome.storage.local.set({ groqApiKey, apiKey }, () => {
      // Show saved message
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    });
  });
});
