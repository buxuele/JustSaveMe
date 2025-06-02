// browser-polyfill.js
(function (window) {
  if (window.chrome && !window.browser) {
    window.browser = {
      runtime: {
        sendMessage: function () {
          return chrome.runtime.sendMessage.apply(chrome.runtime, arguments);
        },
        onMessage: {
          addListener: function () {
            return chrome.runtime.onMessage.addListener.apply(
              chrome.runtime.onMessage,
              arguments
            );
          },
        },
      },
      downloads: {
        download: function () {
          return chrome.downloads.download.apply(chrome.downloads, arguments);
        },
      },
      contextMenus: chrome.contextMenus,
      tabs: chrome.tabs,
    };
  }
})(window);
