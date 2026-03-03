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
  let redirectsCount = 0;
  let finalUrl = url;
  let httpStatusCode = null;
  let isFirstResponse = true;

  try {
    // 1. Open the URL in a new inactive tab (in the background)
    const tab = await chrome.tabs.create({ url: url, active: false });

    // 2. Set up webRequest listeners for this specific tab
    const redirectListener = (details) => {
      // Only track main frame requests for the current tab
      if (details.tabId === tab.id && details.type === 'main_frame') {
        if (isFirstResponse) {
          httpStatusCode = details.statusCode;
          isFirstResponse = false;
        }
        redirectsCount++;
        finalUrl = details.redirectUrl;
      }
    };

    const completedListener = (details) => {
      if (details.tabId === tab.id && details.type === 'main_frame') {
        if (isFirstResponse) {
          httpStatusCode = details.statusCode;
          isFirstResponse = false;
        }
        finalUrl = details.url;
      }
    };

    const errorListener = (details) => {
      if (details.tabId === tab.id && details.type === 'main_frame') {
        if (isFirstResponse) {
          httpStatusCode = details.statusCode || 'Error';
          isFirstResponse = false;
        }
        finalUrl = details.url || finalUrl;
      }
    };

    // Attach listeners
    chrome.webRequest.onBeforeRedirect.addListener(
      redirectListener,
      { urls: ['<all_urls>'], tabId: tab.id }
    );
    chrome.webRequest.onCompleted.addListener(
      completedListener,
      { urls: ['<all_urls>'], tabId: tab.id }
    );
    chrome.webRequest.onErrorOccurred.addListener(
      errorListener,
      { urls: ['<all_urls>'], tabId: tab.id }
    );

    // 3. Wait for the tab to finish loading
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

    // Clean up webRequest listeners
    chrome.webRequest.onBeforeRedirect.removeListener(redirectListener);
    chrome.webRequest.onCompleted.removeListener(completedListener);
    chrome.webRequest.onErrorOccurred.removeListener(errorListener);

    // 4. Inject script to extract data
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractData,
    });

    // 5. Close the temporary tab
    await chrome.tabs.remove(tab.id);

    // 6. Return combined data
    return {
      success: true,
      url: url,
      data: {
        ...result,
        httpStatusCode,
        redirectsCount,
        finalUrl
      }
    };
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

  const canonicalElement = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalElement ? canonicalElement.href : '';

  const metaRobotsElement = document.querySelector('meta[name="robots"]');
  const metaRobots = metaRobotsElement ? metaRobotsElement.content : '';

  return { title, metaDescription, h1, canonicalUrl, metaRobots };
}
