// options.js — Analog Imperium settings

const urlInput  = document.getElementById('codex-url');
const saveBtn   = document.getElementById('btn-save');
const statusEl  = document.getElementById('status');
const modelRadios = document.querySelectorAll('input[name="signumModel"]');

// Load saved values on open
chrome.storage.sync.get(['codexUrl', 'signumModel'], function (data) {
  if (urlInput) urlInput.value = data.codexUrl || '';

  // Set the correct radio button for signum model
  const savedModel = data.signumModel || 'imperium';
  modelRadios.forEach(function (radio) {
    radio.checked = (radio.value === savedModel);
  });
});

// Save on button click
saveBtn.addEventListener('click', function () {
  const raw = urlInput.value.trim();

  // Read selected signum model
  let selectedModel = 'imperium';
  modelRadios.forEach(function (radio) {
    if (radio.checked) selectedModel = radio.value;
  });

  chrome.storage.sync.set({ codexUrl: raw, signumModel: selectedModel }, function () {
    statusEl.classList.add('visible');
    setTimeout(function () { statusEl.classList.remove('visible'); }, 2000);
    // Reload the side panel so the new model loads immediately
    chrome.runtime.sendMessage({ action: 'reloadPanel' }, function () {
      if (chrome.runtime.lastError) { /* panel not open — no-op */ }
    });
  });
});

// Also save on Enter key inside the input
urlInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') saveBtn.click();
});
