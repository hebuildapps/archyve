document.addEventListener('DOMContentLoaded', () => {
  const configureBtn = document.getElementById('configure-btn') as HTMLButtonElement;
  configureBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
