/* global chrome */
// content.js - Handles DOM manipulation and highlighting
function highlightSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.style.backgroundColor = "#947ff0"; // Medium purple
  span.classList.add("justsaveme-highlight");

  try {
    range.surroundContents(span);
    return {
      text: selection.toString(),
      element: span,
    };
  } catch (e) {
    console.error("Failed to highlight:", e);
    return null;
  }
}

function flashHighlight(element) {
  element.classList.add("flash");
  setTimeout(() => {
    element.classList.remove("flash");
  }, 300);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "saveAndHighlight") {
    const result = highlightSelection();
    if (result) {
      chrome.runtime.sendMessage({
        action: "saveData",
        text: result.text,
        url: window.location.href,
      });
      flashHighlight(result.element);
    }
  } else if (message.action === "saveDone") {
    console.log("Content saved:", message.success ? "successfully" : "failed");
  }
});
