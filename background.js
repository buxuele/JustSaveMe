/* global chrome */
//  ok

// background.js
// 数据库连接管理
let db = null;
let dbInitPromise = null;

const initDB = () => {
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open("TextCollectorDB", 1);
    
    dbRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("snippets")) {
        const store = db.createObjectStore("snippets", { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("url", "url", { unique: false });
      }
    };
    
    dbRequest.onsuccess = (event) => {
      db = event.target.result;
      console.log("Database initialized successfully");
      
      // 添加数据库连接错误处理
      db.onerror = (event) => {
        console.error("Database error:", event.target.error);
        // 尝试重新连接
        setTimeout(() => {
          db = null;
          dbInitPromise = null;
          initDB();
        }, 1000);
      };
      
      resolve(db);
    };
    
    dbRequest.onerror = (event) => {
      console.error("Database initialization error:", event.target.error);
      dbInitPromise = null; // Allow future attempts to re-initialize
      reject(event.target.error);
    };
  });
  
  return dbInitPromise;
};

// 创建上下文菜单
async function createContextMenu() {
  try {
    await chrome.contextMenus.removeAll();
    await chrome.contextMenus.create({
      id: "save-content",
      title: "保存/收藏此内容",
      contexts: ["selection"],
    });
    console.log("Context menu created successfully");
  } catch (error) {
    console.error("Error creating context menu:", error);
  }
}

// 初始化函数
async function initialize() {
  try {
    // 初始化数据库
    await initDB();
    // 创建上下文菜单
    await createContextMenu();
    console.log("Background service worker initialized successfully");
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// 在 service worker 启动时初始化
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  initialize();
});

// 在安装时初始化
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  event.waitUntil(initialize());
});

// 处理上下文菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-content") {
    chrome.tabs.sendMessage(tab.id, { action: "saveAndHighlight" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to send message to content script:", chrome.runtime.lastError);
      }
    });
  }
});

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveData") {
    if (!db) {
      initDB().then(() => {
        saveDataToDB(message, sender, sendResponse);
      }).catch(error => {
        console.error("Database not available:", error);
        sendResponse({ success: false, error: "Database not available" });
      });
    } else {
      saveDataToDB(message, sender, sendResponse);
    }
    return true; // 保持消息通道开放
  }
});

// 保存数据到数据库
function saveDataToDB(message, sender, sendResponse) {
  const transaction = db.transaction("snippets", "readwrite");
  const store = transaction.objectStore("snippets");
  
  const data = {
    text: message.text,
    url: message.url,
    timestamp: new Date().toISOString(),
  };
  
  const request = store.add(data);
  
  request.onsuccess = () => {
    // 通知内容脚本保存成功
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "saveDone",
        success: true,
        id: request.result
      }).catch(error => {
        console.error("Failed to send success message:", error);
      });
    }
    sendResponse({ success: true, id: request.result });
  };
  
  request.onerror = (event) => {
    console.error("Error saving data:", event.target.error);
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "saveDone",
        success: false,
        error: event.target.error.message
      }).catch(error => {
        console.error("Failed to send error message:", error);
      });
    }
    sendResponse({ success: false, error: event.target.error.message });
  };
}

// 添加错误处理
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error);
});

// 添加未处理的 Promise 错误处理
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
