# Bulk Meta Scraper

A robust Google Chrome extension designed for SEO professionals and data analysts to efficiently bulk-scrape Page Titles, Meta Descriptions, and H1 tags from a list of URLs. 

## Features

- **Background Execution:** Natively utilizes Chrome's background service workers to open and scrape tabs silently. This allows the extension to bypass login walls by using your existing browser authenticated sessions!
- **Customizable Request Delay:** Built-in pacing controls (1-120 seconds) to prevent triggering rate-limits or captchas on target websites.
- **Clean UI:** A modern, full-page interface for managing large lists of URLs seamlessly.
- **Progress Tracking:** Real-time visual progress bar and a detailed debugger log.
- **1-Click Export:** Easily copy the scraped data as Tab-Separated Values (TSV) for direct, perfectly formatted pasting into Google Sheets or Excel.

## Installation

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the directory containing this repository.
6. The extension is now installed! Click the icon in your browser toolbar to launch the interface.

## Usage

1. Open the extension to access the main interface.
2. Paste a list of valid URLs (one per line) into the input area.
3. Configure the **Delay Between Requests** (e.g., 2 seconds is recommended for most sites).
4. Click **Start Scraping**.
5. Once complete, click **Copy Results (for Sheets)** to export your data.

## Built With

- Manifest V3
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Powered by [Impact SEO Consulting Inc](https://impactseoinc.com/)
