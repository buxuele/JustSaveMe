/* global chrome */
// ok

// popup.js
let snippetsCache = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5000; // 5秒缓存

document.addEventListener("DOMContentLoaded", () => {
  loadSnippets();
  document
    .getElementById("exportBtn")
    .addEventListener("click", exportSnippets);
  document
    .getElementById("clearBtn")
    .addEventListener("click", clearAllSnippets);
});

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) {
    const newStatusEl = document.createElement('div');
    newStatusEl.id = 'status-message';
    newStatusEl.className = `status-message ${type}`;
    document.body.insertBefore(newStatusEl, document.body.firstChild);
    newStatusEl.textContent = message;
  } else {
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
  }
  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }
  }, 3000);
}

function loadSnippets() {
  const container = document.getElementById("snippets-container");
  container.innerHTML = '<div class="loading">Loading...</div>';
  
  const now = Date.now();
  if (snippetsCache && (now - lastLoadTime) < CACHE_DURATION) {
    displaySnippets(snippetsCache);
    return;
  }

  let retryCount = 0;
  const maxRetries = 3;
  
  function tryLoadSnippets() {
    const dbRequest = indexedDB.open("TextCollectorDB", 1);
    
    dbRequest.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("snippets", "readonly");
      const store = transaction.objectStore("snippets");
      
      const pageSize = 20;
      const request = store.openCursor();
      let snippets = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && snippets.length < pageSize) {
          snippets.push(cursor.value);
          cursor.continue();
        } else {
          snippetsCache = snippets;
          lastLoadTime = Date.now();
          displaySnippets(snippets);
        }
      };

      request.onerror = (event) => {
        console.error("Failed to load snippets:", event.target.error);
        showStatus("Failed to load snippets", "error");
      };
    };
    
    dbRequest.onerror = (event) => {
      console.error("Database error:", event.target.error);
      if (retryCount < maxRetries) {
        retryCount++;
        showStatus(`Retrying... (${retryCount}/${maxRetries})`, "warning");
        setTimeout(tryLoadSnippets, 1000);
      } else {
        showStatus("Failed to open database after multiple attempts", "error");
        showError("Failed to open database");
      }
    };
  }
  
  tryLoadSnippets();
}

function displaySnippets(snippets) {
  const container = document.getElementById("snippets-container");
  const fragment = document.createDocumentFragment();
  
  if (snippets.length === 0) {
    container.innerHTML = '<div class="no-snippets">No saved snippets yet</div>';
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
          <button class="delete-snippet" data-id="${snippet.id}">Delete</button>
        </div>
      `;
      
      // Add delete functionality
      const deleteBtn = div.querySelector('.delete-snippet');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteSnippet(snippet.id));
      }
      
      fragment.appendChild(div);
    });
    
  container.innerHTML = '';
  container.appendChild(fragment);
}

function deleteSnippet(id) {
  if (!confirm("Are you sure you want to delete this snippet?")) {
    return;
  }

  const dbRequest = indexedDB.open("TextCollectorDB", 1);
  
  dbRequest.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction("snippets", "readwrite");
    const store = transaction.objectStore("snippets");
    
    const request = store.delete(id);
    
    request.onsuccess = () => {
      showStatus("Snippet deleted successfully", "success");
      snippetsCache = null; // Clear cache
      loadSnippets();
    };
    
    request.onerror = (event) => {
      console.error("Error deleting snippet:", event.target.error);
      showStatus("Failed to delete snippet", "error");
    };
  };
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
      snippetsCache = null; // Clear cache
      showStatus("All snippets cleared successfully", "success");
      loadSnippets();
    };

    request.onerror = (event) => {
      console.error("Error clearing snippets:", event.target.error);
      showStatus("Failed to clear snippets", "error");
    };
  };

  dbRequest.onerror = (event) => {
    console.error("Database error:", event.target.error);
    showStatus("Failed to open database", "error");
  };
}
