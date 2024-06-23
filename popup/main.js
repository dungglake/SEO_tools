import { setupTabs } from './tabs.js';
import { fetchContentData } from './content.js';
import { setupEventListeners } from './events.js';

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTabUrl = tabs[0].url;

    if (currentTabUrl.includes('vietnix.vn')) {
      document.getElementById('message').style.display = 'none';
      document.getElementById('tab-container').style.display = 'block';

      fetchContentData(currentTabUrl, (message, callback) => {
        chrome.tabs.sendMessage(tabs[0].id, message, callback);
      });
    } else {
      document.getElementById('message').style.display = 'block';
      document.getElementById('tab-container').style.display = 'none';
    }
  });
});
