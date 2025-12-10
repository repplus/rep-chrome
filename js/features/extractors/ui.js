// Extractor UI Module
import { escapeHtml, copyToClipboard } from '../../core/utils/dom.js';

export function initExtractorUI() {
    const extractorBtn = document.getElementById('extractor-btn');
    const extractorModal = document.getElementById('extractor-modal');
    const extractorSearch = document.getElementById('extractor-search');
    const extractorSearchContainer = document.getElementById('extractor-search-container');
    const domainFilter = document.getElementById('domain-filter');
    const domainFilterContainer = document.getElementById('domain-filter-container');
    const extractorProgress = document.getElementById('extractor-progress');
    const extractorProgressBar = document.getElementById('extractor-progress-bar');
    const extractorProgressText = document.getElementById('extractor-progress-text');
    const startScanBtn = document.getElementById('start-scan-btn');

    // Results containers
    const secretsResults = document.getElementById('secrets-results');
    const endpointsResults = document.getElementById('endpoints-results');

    // State
    let currentSecretResults = [];
    let currentEndpointResults = [];
    let currentResponseSearchResults = [];
    let activeTab = 'secrets';
    let scannedDomains = new Set();
    let selectedDomain = 'all';

    // Pagination State
    const ITEMS_PER_PAGE = 10;
    let currentSecretsPage = 1;
    let currentEndpointsPage = 1;
    let currentResponseSearchPage = 1;

    // Helper: Extract domain from URL
    function getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return 'unknown';
        }
    }

    // Open Modal
    if (extractorBtn) {
        extractorBtn.addEventListener('click', () => {
            extractorModal.style.display = 'block';
        });
    }

    // Close Modal
    const closeBtn = extractorModal.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            extractorModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === extractorModal) {
            extractorModal.style.display = 'none';
        }
    });

    // Tab switching
    document.querySelectorAll('.extractor-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Update UI
            document.querySelectorAll('.extractor-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');

            // Update state
            activeTab = tabId;

            // Update search placeholder
            if (extractorSearch) {
                extractorSearch.placeholder = activeTab === 'secrets' ? 'Search secrets...' : 'Search endpoints...';
                extractorSearch.value = '';

                // Show/hide search based on results existence
                const hasResults = activeTab === 'secrets' ? currentSecretResults.length > 0 : currentEndpointResults.length > 0;
                extractorSearchContainer.style.display = hasResults ? 'block' : 'none';
            }

            // Populate domain filter for current tab
            if (activeTab === 'response-search') {
                populateDomainFilter();
            }
        });
    });

    // Start Scan
    if (startScanBtn) {
        startScanBtn.addEventListener('click', async () => {
            extractorProgress.style.display = 'block';
            extractorProgressBar.style.width = '0%';
            extractorProgressText.textContent = 'Scanning JS files...';
            startScanBtn.disabled = true;
            secretsResults.innerHTML = '';
            endpointsResults.innerHTML = '';
            currentSecretResults = [];
            currentEndpointResults = [];
            extractorSearchContainer.style.display = 'none';
            domainFilterContainer.style.display = 'none';
            scannedDomains.clear();
            selectedDomain = 'all';

            // Reset pagination
            currentSecretsPage = 1;
            currentEndpointsPage = 1;

            try {
                // Lazy load scanners
                const [secretScanner, endpointExtractor] = await Promise.all([
                    import('./secrets.js'),
                    import('./endpoints.js')
                ]);

                // Get all resources
                const resources = await new Promise((resolve) => {
                    if (chrome.devtools && chrome.devtools.inspectedWindow) {
                        chrome.devtools.inspectedWindow.getResources((res) => resolve(res));
                    } else {
                        resolve([]);
                    }
                });

                const jsFiles = resources.filter(r => r.type === 'script' || r.url.endsWith('.js') || r.url.endsWith('.map'));
                let processed = 0;

                for (const file of jsFiles) {
                    try {
                        const content = await new Promise((resolve) => file.getContent(resolve));
                        if (content) {
                            // Scan for Secrets
                            const secrets = secretScanner.scanContent(content, file.url);
                            currentSecretResults.push(...secrets);

                            // Extract Endpoints
                            const endpoints = endpointExtractor.extractEndpoints(content, file.url);
                            currentEndpointResults.push(...endpoints);
                        }
                    } catch (e) {
                        console.error('Error reading file:', file.url, e);
                    }
                    processed++;
                    const percent = Math.round((processed / jsFiles.length) * 100);
                    extractorProgressBar.style.width = `${percent}%`;
                    extractorProgressText.textContent = `Scanning ${processed}/${jsFiles.length} files...`;
                }

                // Render Results
                renderSecretResults(currentSecretResults);
                renderEndpointResults(currentEndpointResults);

                // Populate domain filter
                populateDomainFilter();

                extractorSearchContainer.style.display = (currentSecretResults.length > 0 || currentEndpointResults.length > 0) ? 'block' : 'none';

            } catch (e) {
                console.error('Scan failed:', e);
                extractorProgressText.textContent = 'Scan failed. Check console.';
            } finally {
                startScanBtn.disabled = false;
                setTimeout(() => {
                    extractorProgress.style.display = 'none';
                }, 2000);
            }
        });
    }

    // Combined Filter Function
    function filterByDomainAndSearch(results) {
        const searchTerm = extractorSearch ? extractorSearch.value.toLowerCase() : '';

        return results.filter(r => {
            // Domain filter
            if (selectedDomain !== 'all') {
                const domain = getDomainFromUrl(r.file);
                if (domain !== selectedDomain) return false;
            }

            // Search filter
            if (searchTerm) {
                if (activeTab === 'secrets') {
                    return r.type.toLowerCase().includes(searchTerm) ||
                        r.match.toLowerCase().includes(searchTerm) ||
                        r.file.toLowerCase().includes(searchTerm);
                } else {
                    return r.endpoint.toLowerCase().includes(searchTerm) ||
                        r.method.toLowerCase().includes(searchTerm) ||
                        r.file.toLowerCase().includes(searchTerm);
                }
            }

            return true;
        });
    }

    // Populate Domain Filter
    async function populateDomainFilter() {
        if (!domainFilter || !domainFilterContainer) return;

        // Clear existing options except "All Domains"
        domainFilter.innerHTML = '<option value="all">All Domains</option>';

        // Collect domain counts
        const domainCounts = {};
        
        if (activeTab === 'response-search') {
            // For response search, use results if available, otherwise use all requests
            if (currentResponseSearchResults.length > 0) {
                // Populate from search results
                currentResponseSearchResults.forEach(result => {
                    const domain = getDomainFromUrl(result.url);
                    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                });
            } else {
                // Populate from all available requests (before search)
                const { state } = await import('./state.js');
                const seenDomains = new Set();
                state.requests.forEach(req => {
                    const domain = getDomainFromUrl(req.pageUrl || req.request.url);
                    if (domain && !seenDomains.has(domain)) {
                        seenDomains.add(domain);
                        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                    }
                });
            }
        } else {
            // For secrets and endpoints, use results
            [...currentSecretResults, ...currentEndpointResults].forEach(result => {
                const domain = getDomainFromUrl(result.file);
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            });
        }

        // Add domain options sorted alphabetically
        Object.entries(domainCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([domain, count]) => {
                const option = document.createElement('option');
                option.value = domain;
                option.textContent = `${domain} (${count})`;
                domainFilter.appendChild(option);
            });

        // Show filter only if we have multiple domains
        scannedDomains = new Set(Object.keys(domainCounts));
        domainFilterContainer.style.display = scannedDomains.size > 1 ? 'block' : 'none';

        // Don't reset selected domain if it's still valid
        if (selectedDomain !== 'all' && !domainCounts[selectedDomain]) {
            selectedDomain = 'all';
            domainFilter.value = 'all';
        } else if (domainFilter.value !== selectedDomain) {
            domainFilter.value = selectedDomain;
        }
    }

    // Domain Filter Change Handler
    if (domainFilter) {
        domainFilter.addEventListener('change', (e) => {
            selectedDomain = e.target.value;

            // Re-render with domain filter applied
            if (activeTab === 'secrets') {
                currentSecretsPage = 1; // Reset to first page
                const filtered = filterByDomainAndSearch(currentSecretResults);
                renderSecretResults(filtered);
            } else if (activeTab === 'endpoints') {
                currentEndpointsPage = 1; // Reset to first page
                const filtered = filterByDomainAndSearch(currentEndpointResults);
                renderEndpointResults(filtered);
            } else if (activeTab === 'response-search') {
                // For response search, filter existing results
                currentResponseSearchPage = 1; // Reset to first page
                renderResponseSearchResults(currentResponseSearchResults);
            }
        });
    }

    // Search Logic
    if (extractorSearch) {
        extractorSearch.addEventListener('input', () => {
            if (activeTab === 'secrets') {
                currentSecretsPage = 1; // Reset to first page
                const filtered = filterByDomainAndSearch(currentSecretResults);
                renderSecretResults(filtered);
            } else {
                currentEndpointsPage = 1; // Reset to first page
                const filtered = filterByDomainAndSearch(currentEndpointResults);
                renderEndpointResults(filtered);
            }
        });
    }

    function renderSecretResults(results) {
        const container = document.getElementById('secrets-pagination');
        if (results.length === 0) {
            secretsResults.innerHTML = '<div class="empty-state">No secrets found matching your criteria.</div>';
            if (container) container.style.display = 'none';
            return;
        }

        // Pagination Logic
        const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
        if (currentSecretsPage > totalPages) currentSecretsPage = 1;

        const start = (currentSecretsPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageResults = results.slice(start, end);

        let html = '<table class="secrets-table"><thead><tr><th>Type</th><th>Match</th><th>Confidence</th><th>File</th></tr></thead><tbody>';
        pageResults.forEach(r => {
            const confidenceClass = r.confidence >= 80 ? 'high' : (r.confidence >= 50 ? 'medium' : 'low');
            html += `<tr>
                <td>${escapeHtml(r.type)}</td>
                <td class="secret-match" title="${escapeHtml(r.match)}">${escapeHtml(r.match.substring(0, 50))}${r.match.length > 50 ? '...' : ''}</td>
                <td><span class="confidence-badge ${confidenceClass}">${r.confidence}%</span></td>
                <td class="secret-file"><a href="${escapeHtml(r.file)}" target="_blank" title="${escapeHtml(r.file)}">${escapeHtml(r.file.split('/').pop())}</a></td>
            </tr>`;
        });
        html += '</tbody></table>';
        secretsResults.innerHTML = html;

        // Render Pagination Controls
        renderPagination(results.length, currentSecretsPage, container, (newPage) => {
            currentSecretsPage = newPage;
            renderSecretResults(results);
        });
    }

    function renderEndpointResults(results) {
        const container = document.getElementById('endpoints-pagination');
        if (results.length === 0) {
            endpointsResults.innerHTML = '<div class="empty-state">No endpoints found matching your criteria.</div>';
            if (container) container.style.display = 'none';
            return;
        }

        // Pagination Logic
        const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
        if (currentEndpointsPage > totalPages) currentEndpointsPage = 1;

        const start = (currentEndpointsPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageResults = results.slice(start, end);

        let html = '<table class="secrets-table"><thead><tr><th>Method</th><th>Endpoint</th><th>Confidence</th><th>Source File</th><th>Actions</th></tr></thead><tbody>';
        pageResults.forEach((r, index) => {
            const confidenceClass = r.confidence >= 80 ? 'high' : (r.confidence >= 50 ? 'medium' : 'low');
            const methodClass = r.method === 'POST' || r.method === 'PUT' || r.method === 'DELETE' ? 'method-write' : 'method-read';

            // Construct full URL if endpoint is relative
            let fullUrl = r.endpoint;
            if (r.endpoint.startsWith('/') && r.baseUrl) {
                fullUrl = r.baseUrl + r.endpoint;
            }

            html += `<tr>
                <td><span class="http-method ${methodClass}">${escapeHtml(r.method)}</span></td>
                <td class="endpoint-path" title="${escapeHtml(r.endpoint)}">${escapeHtml(r.endpoint)}</td>
                <td><span class="confidence-badge ${confidenceClass}">${r.confidence}%</span></td>
                <td class="secret-file"><a href="${escapeHtml(r.file)}" target="_blank" title="${escapeHtml(r.file)}">${escapeHtml(r.file.split('/').pop())}</a></td>
                <td><button class="copy-url-btn" data-url="${escapeHtml(fullUrl)}" title="Copy full URL">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
                    </svg>
                </button></td>
            </tr>`;
        });
        html += '</tbody></table>';
        endpointsResults.innerHTML = html;

        // Render Pagination Controls
        renderPagination(results.length, currentEndpointsPage, container, (newPage) => {
            currentEndpointsPage = newPage;
            renderEndpointResults(results);
        });

        // Add click handlers for copy buttons
        endpointsResults.querySelectorAll('.copy-url-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = btn.getAttribute('data-url');
                copyToClipboard(url);

                // Visual feedback
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>';
                btn.style.color = '#81c995';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '';
                }, 1000);
            });
        });
    }

    function renderResponseSearchResults(results) {
        const container = document.getElementById('response-search-pagination');
        if (results.length === 0) {
            responseSearchResults.innerHTML = '<div class="empty-state">No matches found.</div>';
            if (container) container.style.display = 'none';
            return;
        }

        // Apply domain filter if set
        let filteredResults = results;
        if (selectedDomain !== 'all') {
            filteredResults = results.filter(r => {
                const domain = getDomainFromUrl(r.url);
                return domain === selectedDomain;
            });
        }

        if (filteredResults.length === 0) {
            responseSearchResults.innerHTML = '<div class="empty-state">No matches found for selected domain.</div>';
            if (container) container.style.display = 'none';
            return;
        }

        // Pagination Logic
        const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
        if (currentResponseSearchPage > totalPages) currentResponseSearchPage = 1;

        const start = (currentResponseSearchPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageResults = filteredResults.slice(start, end);

        let html = '<table class="secrets-table"><thead><tr><th>Method</th><th>File</th><th>Status</th><th>Match Preview</th></tr></thead><tbody>';
        pageResults.forEach(r => {
            const methodClass = r.method === 'POST' || r.method === 'PUT' || r.method === 'DELETE' ? 'method-write' : 'method-read';
            const statusClass = r.status >= 200 && r.status < 300 ? 'status-2xx' : (r.status >= 300 && r.status < 400 ? 'status-3xx' : (r.status >= 400 && r.status < 500 ? 'status-4xx' : 'status-5xx'));
            const fileName = r.url.split('/').pop() || r.url;

            html += `<tr>
                <td><span class="http-method ${methodClass}">${escapeHtml(r.method)}</span></td>
                <td class="secret-file"><a href="${escapeHtml(r.url)}" target="_blank" title="${escapeHtml(r.url)}">${escapeHtml(fileName)}</a></td>
                <td><span class="status-badge ${statusClass}">${r.status}</span></td>
                <td class="secret-match" title="${escapeHtml(r.matchSnippet)}">${escapeHtml(r.matchSnippet)}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        responseSearchResults.innerHTML = html;

        // Render Pagination Controls
        renderPagination(filteredResults.length, currentResponseSearchPage, container, (newPage) => {
            currentResponseSearchPage = newPage;
            renderResponseSearchResults(results);
        });
    }

    // Response Search Logic
    const responseSearchBtn = document.getElementById('response-search-btn');
    const responseSearchInput = document.getElementById('response-search-input');
    const responseSearchRegexBtn = document.getElementById('response-search-regex-btn');
    const responseSearchAiBtn = document.getElementById('response-search-ai-btn');
    const responseSearchFetch = document.getElementById('response-search-fetch');
    const responseSearchResults = document.getElementById('response-search-results');

    let isRegexMode = false;

    // Initial State: Hide AI button
    if (responseSearchAiBtn) {
        responseSearchAiBtn.style.display = 'none';
    }

    // Toggle Regex Mode
    if (responseSearchRegexBtn) {
        responseSearchRegexBtn.addEventListener('click', () => {
            isRegexMode = !isRegexMode;
            responseSearchRegexBtn.classList.toggle('active', isRegexMode);
            responseSearchInput.placeholder = isRegexMode ? 'Search with Regex...' : 'Search in responses...';

            // Toggle AI Button
            if (responseSearchAiBtn) {
                responseSearchAiBtn.style.display = isRegexMode ? 'flex' : 'none';
            }
        });
    }

    // AI Regex Generation
    if (responseSearchAiBtn) {
        responseSearchAiBtn.addEventListener('click', async () => {
            const description = responseSearchInput.value.trim();
            if (!description) {
                alert('Please enter a description of what you want to find (e.g., "email addresses").');
                return;
            }

            // UI Loading State
            const originalIcon = responseSearchAiBtn.innerHTML;
            responseSearchAiBtn.innerHTML = '<span class="loading-spinner-small">⏳</span>';
            responseSearchAiBtn.disabled = true;
            responseSearchInput.disabled = true;

            try {
                const { streamExplanationWithSystem, getAISettings } = await import('../ai/index.js');
                const { apiKey } = getAISettings();

                if (!apiKey) {
                    alert('Please configure your AI API Key in Settings first.');
                    return;
                }

                const systemPrompt = "You are a regex expert. Convert the user's description into a JavaScript-compatible Regular Expression. Return ONLY the regex pattern (without slashes or flags). Do not include any explanation.";
                let generatedRegex = '';

                await streamExplanationWithSystem(apiKey, getAISettings().model, systemPrompt, description, (text) => {
                    generatedRegex = text.trim();
                }, getAISettings().provider);

                // Clean up result (remove backticks or extra text if any)
                generatedRegex = generatedRegex.replace(/^`+|`+$/g, '').trim();

                if (generatedRegex) {
                    responseSearchInput.value = generatedRegex;

                    // Enable Regex Mode automatically
                    if (!isRegexMode) {
                        isRegexMode = true;
                        if (responseSearchRegexBtn) responseSearchRegexBtn.classList.add('active');
                        responseSearchInput.placeholder = 'Search with Regex...';
                    }
                }

            } catch (e) {
                console.error('AI Regex generation failed:', e);
                alert('Failed to generate regex: ' + e.message);
            } finally {
                responseSearchAiBtn.innerHTML = originalIcon;
                responseSearchAiBtn.disabled = false;
                responseSearchInput.disabled = false;
                responseSearchInput.focus();
            }
        });
    }

    if (responseSearchBtn) {
        responseSearchBtn.addEventListener('click', async () => {
            const searchTerm = responseSearchInput.value;
            if (!searchTerm) return;

            const fetchFresh = responseSearchFetch.checked;
            const selectedDomain = domainFilter ? domainFilter.value : 'all';

            // UI Loading State
            responseSearchBtn.disabled = true;
            responseSearchBtn.textContent = 'Searching...';

            // Reset pagination
            currentResponseSearchPage = 1;
            currentResponseSearchResults = [];

            // Show progress bar if fetching
            if (fetchFresh) {
                extractorProgress.style.display = 'block';
                extractorProgressBar.style.width = '0%';
                extractorProgressText.textContent = 'Preparing requests...';
            }

            try {
                // Import state to access requests
                const { state } = await import('../../core/state.js');

                // Filter requests
                const requestsToSearch = [];
                const seenSignatures = new Set();

                state.requests.forEach(req => {
                    // Domain Filter
                    if (selectedDomain !== 'all' && getDomainFromUrl(req.pageUrl || req.request.url) !== selectedDomain) {
                        return;
                    }

                    // Deduplication
                    const signature = `${req.request.method}|${req.request.url}|${req.request.postData ? req.request.postData.text : ''}`;
                    if (!seenSignatures.has(signature)) {
                        seenSignatures.add(signature);
                        requestsToSearch.push(req);
                    }
                });

                if (requestsToSearch.length === 0) {
                    responseSearchResults.innerHTML = '<div class="empty-state">No requests found to search.</div>';
                    currentResponseSearchResults = [];
                    renderResponseSearchResults(currentResponseSearchResults);
                    return;
                }

                let processed = 0;

                // Helper to check match and collect results
                const checkMatch = (content, url, method, status) => {
                    let matchFound = false;
                    let matchSnippet = '';

                    if (isRegexMode) {
                        try {
                            const regex = new RegExp(searchTerm, 'g');
                            const match = regex.exec(content);
                            if (match) {
                                matchFound = true;
                                const start = Math.max(0, match.index - 20);
                                const end = Math.min(content.length, match.index + match[0].length + 20);
                                matchSnippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                            }
                        } catch (e) {
                            console.error('Invalid regex:', e);
                            return false;
                        }
                    } else {
                        const index = content.indexOf(searchTerm);
                        if (index !== -1) {
                            matchFound = true;
                            const start = Math.max(0, index - 20);
                            const end = Math.min(content.length, index + searchTerm.length + 20);
                            matchSnippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                        }
                    }

                    if (matchFound) {
                        currentResponseSearchResults.push({
                            method: method,
                            url: url,
                            status: status,
                            matchSnippet: matchSnippet
                        });
                    }
                    return matchFound;
                };

                for (const req of requestsToSearch) {
                    let content = '';
                    let status = req.response.status;

                    if (fetchFresh) {
                        try {
                            const response = await fetch(req.request.url, {
                                method: req.request.method,
                                headers: req.request.headers.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}),
                                body: req.request.postData ? req.request.postData.text : undefined
                            });
                            content = await response.text();
                            status = response.status;
                        } catch (e) {
                            console.error('Fetch failed for', req.request.url, e);
                            content = ''; // Skip if fetch fails
                        }
                    } else {
                        // Use stored content if available (HAR)
                        // Note: HAR content.text might be unavailable if not captured fully
                        content = req.response.content.text || '';

                        // If empty, try to get from network (if supported by devtools API in this context)
                        if (!content && req.getContent) {
                            content = await new Promise(resolve => req.getContent(resolve));
                        }
                    }

                    if (content) {
                        checkMatch(content, req.request.url, req.request.method, status);
                    }

                    processed++;
                    if (fetchFresh) {
                        const percent = Math.round((processed / requestsToSearch.length) * 100);
                        extractorProgressBar.style.width = `${percent}%`;
                        extractorProgressText.textContent = `Searching ${processed}/${requestsToSearch.length}...`;
                    }
                }

                // Render results with pagination
                renderResponseSearchResults(currentResponseSearchResults);

                // Update domain filter with domains from results
                if (activeTab === 'response-search') {
                    populateDomainFilter();
                }

            } catch (e) {
                console.error('Search failed:', e);
                responseSearchResults.innerHTML = `<div class="empty-state error">Search failed: ${e.message}</div>`;
                currentResponseSearchResults = [];
            } finally {
                responseSearchBtn.disabled = false;
                responseSearchBtn.textContent = 'Search';
                if (fetchFresh) {
                    setTimeout(() => {
                        extractorProgress.style.display = 'none';
                    }, 1000);
                }
            }
        });
    }

    // Helper: Render Pagination Controls
    function renderPagination(totalItems, currentPage, container, onPageChange) {
        if (!container) return;

        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = '';

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'icon-btn';
        prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) onPageChange(currentPage - 1);
        };

        // Page Info
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.style.margin = '0 10px';
        pageInfo.style.fontSize = '12px';
        pageInfo.style.alignSelf = 'center';

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'icon-btn';
        nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) onPageChange(currentPage + 1);
        };

        container.appendChild(prevBtn);
        container.appendChild(pageInfo);
        container.appendChild(nextBtn);
    }
}
