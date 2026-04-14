// content.js — typing-only capture for cyberpunk terminal

(function () {
  'use strict';

  try {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
  } catch (e) {
    return;
  }

  function send(msg) {
    try {
      chrome.runtime.sendMessage(msg).catch(function () {});
    } catch (e) {}
  }

  // Only capture typing — printable chars, Backspace, and Enter
  document.addEventListener('keydown', function (e) {
    // Ignore pure modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;
    // Ignore modifier combos (CMD+A, CTRL+C, etc.)
    if (e.metaKey || e.ctrlKey) return;

    if (e.key === 'Enter') {
      send({ type: 'pageEvent', eventType: 'KEY', detail: 'Enter' });
    } else if (e.key === 'Backspace') {
      send({ type: 'keystroke', key: 'Backspace' });
    } else if (e.key.length === 1) {
      send({ type: 'keystroke', key: e.key });
    }
  }, true);

})();
