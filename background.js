// background.js — service worker for cyberpunk terminal extension

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

let sidePanelPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (sidePanelPort) {
    try { sidePanelPort.postMessage(message); } catch (e) {}
  }
});
