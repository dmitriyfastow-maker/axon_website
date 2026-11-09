// Clicking the Vax icon opens the side panel next to the current tab.
chrome.runtime.onInstalled.addListener(() => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }));
