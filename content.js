/* global chrome */
// content.js - Handles DOM manipulation and highlighting

let highlightTimeout = null;

function highlightSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) {
    console.log("No selection found");
    return null;
  }

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.style.backgroundColor = "#947ff0"; // Medium purple
  span.classList.add("justsaveme-highlight");

  try {
    // It's generally better to get the text from the span after it has wrapped the content,
    // or get it from the selection *before* surroundContents, as surroundContents can alter the selection.
    // Getting from the span ensures we save the text that is actually visibly highlighted.
    range.surroundContents(span);
    return {
      text: span.textContent, // Get text from the successfully created span
      element: span,
    };
  } catch (e) {
    console.error("Failed to highlight:", e);
    return null;
  }
}

function flashHighlight(element) {
  if (!element) return;
  
  // Clear any existing timeout
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
  }
  
  element.classList.add("flash");
  highlightTimeout = setTimeout(() => {
    element.classList.remove("flash");
    highlightTimeout = null;
  }, 300);
}

// 添加消息确认机制
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveAndHighlight") {
    const result = highlightSelection();
    if (result) {
      // 添加消息确认机制
      chrome.runtime.sendMessage({
        action: "saveData",
        text: result.text,
        url: window.location.href,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Message sending failed:", chrome.runtime.lastError);
          return;
        }
        if (response && response.success) {
          flashHighlight(result.element);
        } else {
          console.error("Failed to save content");
        }
      });
    } else {
      console.log("No content selected to save");
    }
    // 保持消息通道开放
    return true;
  } else if (message.action === "saveDone") {
    console.log("Content saved:", message.success ? "successfully" : "failed");
    if (!message.success) {
      // 可以在这里添加失败时的视觉反馈
      console.error("Failed to save content");
    }
  }
});

// 添加错误处理
window.addEventListener('error', (event) => {
  console.error('Content script error:', event.error);
});

// 添加页面卸载处理
window.addEventListener('unload', () => {
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
  }
});
