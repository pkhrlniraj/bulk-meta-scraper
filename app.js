document.addEventListener('DOMContentLoaded', () => {
    const urlListInput = document.getElementById('urlList');
    const delaySecondsInput = document.getElementById('delaySeconds');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const debugLog = document.getElementById('debugLog');
    const copyLogBtn = document.getElementById('copyLogBtn');

    const resultsBody = document.getElementById('resultsBody');
    const copyResultsBtn = document.getElementById('copyResultsBtn');

    let isScraping = false;
    let urlsToScrape = [];
    let currentIndex = 0;
    let scrapedData = [];

    // Helper to log messages to the debug panel
    function logDebug(message) {
        const timestamp = new Date().toISOString().substring(11, 19);
        const logMessage = `[${timestamp}] ${message}\n`;
        debugLog.value += logMessage;
        debugLog.scrollTop = debugLog.scrollHeight;
    }

    // Initialize UI state
    function initUI() {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        progressText.textContent = `Ready (0 / 0)`;
        progressBar.style.width = '0%';
        logDebug('Application initialized and ready.');
    }

    // Extract raw text, replace newlines/tabs so it pastes nicely into Sheets
    function sanitizeForTSV(text) {
        if (!text) return '';
        // Replace tabs and newlines with spaces to avoid breaking the TSV format
        return String(text).replace(/[\t\n\r]+/g, ' ').trim();
    }

    // Start scraping process
    startBtn.addEventListener('click', () => {
        const rawUrls = urlListInput.value.split('\n');
        urlsToScrape = rawUrls
            .map(u => u.trim())
            .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

        if (urlsToScrape.length === 0) {
            alert('Please enter at least one valid HTTP/HTTPS URL.');
            return;
        }

        isScraping = true;
        currentIndex = 0;
        scrapedData = [];
        resultsBody.innerHTML = ''; // Clear previous results
        debugLog.value = ''; // Clear logs

        startBtn.disabled = true;
        stopBtn.disabled = false;
        urlListInput.disabled = true;

        logDebug(`Started scraping ${urlsToScrape.length} URLs.`);
        updateProgress();
        scrapeNext();
    });

    // Stop scraping process
    stopBtn.addEventListener('click', () => {
        isScraping = false;
        logDebug('Scraping stopped by user.');
        stopBtn.disabled = true;
        startBtn.disabled = false;
        urlListInput.disabled = false;
    });

    function updateProgress() {
        const percentage = urlsToScrape.length === 0 ? 0 : Math.round((currentIndex / urlsToScrape.length) * 100);
        progressText.textContent = `Processing (${currentIndex} / ${urlsToScrape.length})`;
        progressBar.style.width = `${percentage}%`;
    }

    function addResultRow(url, httpStatus, redirects, finalUrl, title, metaDesc, h1, canonical, metaRobots, status, errorMsg = '') {
        const row = document.createElement('tr');

        let statusHtml = '';
        if (status === 'success') {
            statusHtml = '<span class="status-badge status-success">Success</span>';
        } else {
            statusHtml = `<span class="status-badge status-error" title="${errorMsg}">Failed</span>`;
        }

        row.innerHTML = `
            <td><a href="${url}" target="_blank" rel="noopener noreferrer" style="word-break: break-all;">${url}</a></td>
            <td>${httpStatus || '-'}</td>
            <td>${redirects || '0'}</td>
            <td><a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="word-break: break-all;">${finalUrl || '-'}</a></td>
            <td>${title || '-'}</td>
            <td>${metaDesc || '-'}</td>
            <td>${h1 || '-'}</td>
            <td>${canonical || '-'}</td>
            <td>${metaRobots || '-'}</td>
            <td>${statusHtml}</td>
        `;
        resultsBody.appendChild(row);

        // Store data for copying
        scrapedData.push({
            url: url,
            httpStatus: httpStatus || '',
            redirects: redirects || 0,
            finalUrl: finalUrl || url,
            title: title || '',
            metaDesc: metaDesc || '',
            h1: h1 || '',
            canonical: canonical || '',
            metaRobots: metaRobots || ''
        });
    }

    async function scrapeNext() {
        if (!isScraping || currentIndex >= urlsToScrape.length) {
            finishScraping();
            return;
        }

        const url = urlsToScrape[currentIndex];
        const delayMs = parseFloat(delaySecondsInput.value) * 1000 || 2000;

        logDebug(`[${currentIndex + 1}/${urlsToScrape.length}] Loading: ${url}`);

        try {
            // Send message to background script to perform the scrape
            const response = await chrome.runtime.sendMessage({
                action: 'scrapeUrl',
                url: url
            });

            if (response && response.success) {
                logDebug(`[${currentIndex + 1}/${urlsToScrape.length}] Success`);
                addResultRow(
                    url,
                    response.data.httpStatusCode,
                    response.data.redirectsCount,
                    response.data.finalUrl,
                    response.data.title,
                    response.data.metaDescription,
                    response.data.h1,
                    response.data.canonicalUrl,
                    response.data.metaRobots,
                    'success'
                );
            } else {
                const errMsg = response ? response.errorMessage : 'No response from background script';
                logDebug(`[${currentIndex + 1}/${urlsToScrape.length}] Failed: ${errMsg}`);
                addResultRow(url, '', '', '', '', '', '', '', '', 'error', errMsg);
            }
        } catch (error) {
            logDebug(`[${currentIndex + 1}/${urlsToScrape.length}] Error: ${error.message}`);
            addResultRow(url, '', '', '', '', '', '', '', '', 'error', error.message);
        }

        currentIndex++;
        updateProgress();

        if (currentIndex < urlsToScrape.length && isScraping) {
            logDebug(`Waiting ${delayMs / 1000}s before next request...`);
            setTimeout(scrapeNext, delayMs);
        } else {
            finishScraping();
        }
    }

    function finishScraping() {
        isScraping = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        urlListInput.disabled = false;

        if (currentIndex >= urlsToScrape.length) {
            progressText.textContent = `Completed (${currentIndex} / ${urlsToScrape.length})`;
            progressBar.style.width = '100%';
            logDebug('Scraping completed.');
        } else {
            progressText.textContent = `Stopped (${currentIndex} / ${urlsToScrape.length})`;
        }
    }

    // Copy Results Button
    copyResultsBtn.addEventListener('click', () => {
        if (scrapedData.length === 0) {
            alert('No data to copy.');
            return;
        }

        // Create TSV format: URL \t Status \t Redirects \t Final URL \t Title \t Meta \t H1 \t Canonical \t Meta Robots \n
        const header = "URL\tStatus Code\tRedirects\tFinal URL\tTitle\tMeta Description\tH1\tCanonical URL\tMeta Robots\n";
        const rows = scrapedData.map(d => {
            return `${sanitizeForTSV(d.url)}\t${sanitizeForTSV(d.httpStatus)}\t${sanitizeForTSV(d.redirects)}\t${sanitizeForTSV(d.finalUrl)}\t${sanitizeForTSV(d.title)}\t${sanitizeForTSV(d.metaDesc)}\t${sanitizeForTSV(d.h1)}\t${sanitizeForTSV(d.canonical)}\t${sanitizeForTSV(d.metaRobots)}`;
        }).join('\n');

        const tsvData = header + rows;

        navigator.clipboard.writeText(tsvData).then(() => {
            logDebug('Results copied to clipboard (TSV format).');
            const originalText = copyResultsBtn.textContent;
            copyResultsBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyResultsBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            logDebug(`Failed to copy results: ${err}`);
            alert('Failed to copy results.');
        });
    });

    // Copy Log Button
    copyLogBtn.addEventListener('click', () => {
        if (!debugLog.value) return;

        navigator.clipboard.writeText(debugLog.value).then(() => {
            const originalText = copyLogBtn.textContent;
            copyLogBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyLogBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            alert('Failed to copy log.');
        });
    });

    initUI();
});
