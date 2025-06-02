/* global chrome */
//  ok

// background.js
// Initialize the database
let db;
const initDB = () => {
  const dbRequest = indexedDB.open("TextCollectorDB", 1);
  dbRequest.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("snippets")) {
      db.createObjectStore("snippets", { autoIncrement: true });
    }
  };
  dbRequest.onsuccess = (event) => {
    db = event.target.result;
    console.log("Database initialized successfully");
  };
  dbRequest.onerror = (event) => {
    console.error("Database error:", event.target.error);
  };
};

// Initialize when service worker starts
initDB();

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-content",
    title: "保存/收藏此内容",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-content") {
    chrome.tabs.sendMessage(tab.id, { action: "saveAndHighlight" });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveData" && db) {
    const transaction = db.transaction("snippets", "readwrite");
    const store = transaction.objectStore("snippets");

    const request = store.add({
      text: message.text,
      url: message.url,
      timestamp: new Date().toISOString(),
    });

    request.onsuccess = () => {
      // Notify content script that save was successful
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "saveDone",
        success: true,
      });
    };

    request.onerror = (event) => {
      console.error("Error saving data:", event.target.error);
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "saveDone",
        success: false,
      });
    };
  }
});
