// options.js — Analog Imperium settings

const urlInput  = document.getElementById('codex-url');
const saveBtn   = document.getElementById('btn-save');
const statusEl  = document.getElementById('status');

// Load saved values on open
chrome.storage.sync.get('codexUrl', function (data) {
  if (urlInput) urlInput.value = data.codexUrl || '';
});

// Save on button click
saveBtn.addEventListener('click', function () {
  const raw = urlInput.value.trim();
  chrome.storage.sync.set({ codexUrl: raw }, function () {
    statusEl.classList.add('visible');
    setTimeout(function () { statusEl.classList.remove('visible'); }, 2000);
  });
});

// Also save on Enter key inside the input
urlInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') saveBtn.click();
});
