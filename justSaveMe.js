// content.js
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveAndHighlight") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.backgroundColor = "#E6E6FA"; // 浅紫色
      range.surroundContents(span);

      const selectedText = selection.toString();
      const pageUrl = window.location.href;
      browser.runtime.sendMessage({
        action: "saveData",
        text: selectedText,
        url: pageUrl
      });
    }
  }
});