// Listen for extension icon click and open the full page UI
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

// Listen for messages from the UI (app.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeUrl') {
    handleScrape(request.url).then(sendResponse);
    return true; // Indicate asynchronous response
  }
});

async function handleScrape(url) {
  try {
    // 1. Open the URL in a new inactive tab (in the background)
    const tab = await chrome.tabs.create({ url: url, active: false });

    // 2. Wait for the tab to finish loading
    await new Promise((resolve) => {
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      
      // Failsafe timeout in case the page never fully "completes"
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(); // resolve anyway to try extracting what's there
      }, 30000); 
    });

    // 3. Inject script to extract data
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractData,
    });

    // 4. Close the temporary tab
    await chrome.tabs.remove(tab.id);

    return { success: true, url: url, data: result };
  } catch (error) {
    console.error('Error scraping', url, error);
    return { success: false, url: url, errorMessage: error.message };
  }
}

// Function executed IN THE CONTEXT OF THE TARGET PAGE
function extractData() {
  const title = document.title || '';
  
  const metaDescElement = document.querySelector('meta[name="description"]');
  const metaDescription = metaDescElement ? metaDescElement.content : '';

  const h1Element = document.querySelector('h1');
  const h1 = h1Element ? h1Element.innerText.trim() : '';

  return { title, metaDescription, h1 };
}
