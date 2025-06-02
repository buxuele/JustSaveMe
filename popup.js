/* global chrome */
// ok

// popup.js
document.addEventListener("DOMContentLoaded", () => {
  loadSnippets();
  document
    .getElementById("exportBtn")
    .addEventListener("click", exportSnippets);
  document
    .getElementById("clearBtn")
    .addEventListener("click", clearAllSnippets);
});

function loadSnippets() {
  const dbRequest = indexedDB.open("TextCollectorDB", 1);

  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction("snippets", "readonly");
    const store = transaction.objectStore("snippets");
    const request = store.getAll();

    request.onsuccess = () => {
      const snippets = request.result;
      displaySnippets(snippets);
    };

    request.onerror = (event) => {
      console.error("Failed to load snippets:", event.target.error);
      showError("Failed to load saved snippets");
    };
  };

  dbRequest.onerror = (event) => {
    console.error("Database error:", event.target.error);
    showError("Failed to open database");
  };
}

function displaySnippets(snippets) {
  const container = document.getElementById("snippets-container");
  container.innerHTML = "";

  if (snippets.length === 0) {
    container.innerHTML =
      '<div class="no-snippets">No saved snippets yet</div>';
    return;
  }

  snippets
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .forEach((snippet) => {
      const div = document.createElement("div");
      div.className = "snippet";
      div.innerHTML = `
        <div class="snippet-text">${escapeHtml(snippet.text)}</div>
        <div class="snippet-meta">
          <a href="${escapeHtml(snippet.url)}" target="_blank">Source</a>
          <span>${new Date(snippet.timestamp).toLocaleString()}</span>
        </div>
      `;
      container.appendChild(div);
    });
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(message) {
  const container = document.getElementById("snippets-container");
  container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function exportSnippets() {
  const dbRequest = indexedDB.open("TextCollectorDB", 1);

  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction("snippets", "readonly");
    const store = transaction.objectStore("snippets");
    const request = store.getAll();

    request.onsuccess = () => {
      const data = request.result;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      chrome.downloads.download(
        {
          url: url,
          filename: `saved_snippets_${new Date()
            .toISOString()
            .slice(0, 10)}.json`,
          saveAs: true,
        },
        () => {
          URL.revokeObjectURL(url);
        }
      );
    };

    request.onerror = (event) => {
      console.error("Failed to export snippets:", event.target.error);
      showError("Failed to export snippets");
    };
  };
}

function clearAllSnippets() {
  if (
    !confirm(
      "Are you sure you want to delete all saved snippets? This action cannot be undone."
    )
  ) {
    return;
  }

  const dbRequest = indexedDB.open("TextCollectorDB", 1);

  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction("snippets", "readwrite");
    const store = transaction.objectStore("snippets");

    const request = store.clear();

    request.onsuccess = () => {
      loadSnippets(); // Refresh the display
    };

    request.onerror = (event) => {
      console.error("Error clearing snippets:", event.target.error);
      showError("Failed to clear snippets");
    };
  };

  dbRequest.onerror = (event) => {
    console.error("Database error:", event.target.error);
    showError("Failed to open database");
  };
}
