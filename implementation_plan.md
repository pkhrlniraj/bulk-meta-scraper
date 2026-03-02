# Bulk URL Scraper Extension Plan

This extension will efficiently load a list of URLs, extract the `Title`, `Meta Description`, and `H1`, and close the tabs one by one. It will feature a full-page modern UI with a light theme, data tables, and a debugger log.

## User Review Required

Please review the proposed approach, particularly the use of `background.js` to handle opening and automatically closing tabs to ensure the extension can use your existing browser login sessions without requiring new authentication. 

## Proposed Changes

### Extension Core Structure

#### [NEW] manifest.json
- Manifest V3 configuration.
- Permissions: `tabs` (to open/close), `scripting` (to inject extraction logic), and host permissions (`<all_urls>`) to scrape any URL.
- `action` (Extension Icon click) logic to open the full-page UI instead of a popup drop-down.
- Background service worker registration.

#### [NEW] background.js
- Listens for the extension icon click to open `index.html` in a new tab.
- Listens for messages from the UI to scrape specific URLs.
- Logic to:
  1. Open a new tab in the background (using existing auth states).
  2. Wait for the page to finish loading.
  3. Inject a script to extract `document.title`, `meta[name="description"]`, and `h1`.
  4. Close the temporary tab.
  5. Return the scraped data back to the UI.

### User Interface

#### [NEW] index.html
- The full-page interface for the extension.
- Contains:
  - Textarea for a bulk list of URLs.
  - Number input for the custom delay (1-120 seconds).
  - Start/Stop controls.
  - A Progress bar showing `X / Y completed`.
  - A responsive Data Table with columns: `URL`, `Title`, `Meta Description`, `H1`.
  - "Copy Results" button (copies tab-separated values for easy pasting into Google Sheets).
  - A read-only Debugger Log textarea with a "Copy log" button.

#### [NEW] index.css
- Clean, modern, light-theme aesthetic (white/light gray backgrounds, soft shadows, rounded corners, clean typography).
- Responsive table layout with hover states.
- Progress bar styling.

#### [NEW] app.js
- Handles the UI interactions and state.
- Iterates over the list of URLs one by one.
- Communicates with `background.js` to execute the scraping per URL.
- Implements the custom delay mechanism (`setTimeout`) between requests.
- Dynamically updates the Progress bar, the Data Table, and the Debugger Log as results come in.
- Implements the "Copy to Clipboard" functionality for the table and logs.

## Verification Plan

### Manual Verification
- We will load the extension locally via Chrome's `chrome://extensions` using "Load unpacked".
- I will open the extension, paste a few test URLs (both public and requiring login/authentication if available), and set a delay.
- The extension should correctly open temporary tabs, extract data, close them, and display the populated table.
- Copying the results should yield correctly formatted text for Google Sheets.
