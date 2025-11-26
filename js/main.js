// Main Entry Point
import { state, addRequest, addToHistory } from './modules/state.js';
import {
    initUI, elements, renderRequestItem, filterRequests, updateHistoryButtons,
    clearAllRequestsUI, setupResizeHandle, setupSidebarResize, setupContextMenu,
    setupUndoRedo, captureScreenshot, exportRequests, importRequests, selectRequest
} from './modules/ui.js';
import { setupNetworkListener, parseRequest, executeRequest } from './modules/network.js';
import { getAISettings, saveAISettings, streamExplanation } from './modules/ai.js';
import { setupBulkReplay } from './modules/bulk-replay.js';
import { scanForSecrets } from './modules/secret-scanner.js';
import { extractEndpoints } from './modules/endpoint-extractor.js';
import { formatBytes, highlightHTTP, renderDiff, copyToClipboard, escapeHtml } from './modules/utils.js';

// Theme Detection
function updateTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('repeater-theme');
    const themeToggle = document.getElementById('theme-toggle-btn');

    if (savedTheme) {
        document.body.classList.toggle('light-theme', savedTheme === 'light');
    } else {
        document.body.classList.toggle('light-theme', !prefersDark);
    }

    if (themeToggle) {
        const isLight = document.body.classList.contains('light-theme');
        themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('repeater-theme', isLight ? 'light' : 'dark');
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    const isLight = document.body.classList.contains('light-theme');
    if (isLight) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M10 2c-1.82 0-3.53.5-5 1.35C7.994 4.034 10 6.806 10 10c0 3.194-2.006 5.966-5 6.65C6.47 17.5 8.18 18 10 18c4.418 0 8-3.582 8-8s-3.582-8-8-8Z" fill="currentColor"/></svg>`;
    } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 3.1A8.9 8.9 0 1 0 20.9 12 8.91 8.91 0 0 0 12 3.1zm0 14.8A5.9 5.9 0 1 1 17.9 12 5.907 5.907 0 0 1 12 17.9zM12 1a1 1 0 0 1 1 1v1.05a1 1 0 0 1-2 0V2a1 1 0 0 1 1-1zm0 19.9a1 1 0 0 1 1 1V23a1 1 0 0 1-2 0v-1.1a1 1 0 0 1 1-1zm11-8.9a1 1 0 0 1-1 1h-1.05a1 1 0 0 1 0-2H22a1 1 0 0 1 1 1zM3.05 12a1 1 0 0 1-1 1H1a1 1 0 0 1 0-2h1.05a1 1 0 0 1 1 1zm15.556-7.071a1 1 0 0 1 0 1.414L17.4 7.55a1 1 0 0 1-1.414-1.414l1.207-1.207a1 1 0 0 1 1.414 0zM8.014 16.936a1 1 0 0 1 0 1.414L6.807 19.557a1 1 0 0 1-1.414-1.414l1.207-1.207a1 1 0 0 1 1.414 0zm11.543 1.207a1 1 0 0 1-1.414 0L16.936 16.8a1 1 0 1 1 1.414-1.414l1.207 1.207a1 1 0 0 1 0 1.414zM7.064 7.064A1 1 0 0 1 5.65 7.064L4.443 5.857A1 1 0 0 1 5.857 4.443L7.064 5.65A1 1 0 0 1 7.064 7.064z" fill="currentColor"/></svg>`;
    }
}

// Initialize Theme
document.addEventListener('DOMContentLoaded', () => {
    updateTheme();
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Ensure theme updates when system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);
});

// CPU Usage Simulation (for the indicator)
function simulateCPUUsage() {
    return Math.floor(30 + Math.random() * 40);
}

function updateCPUUsageIndicator() {
    const cpuUsageElement = document.getElementById('cpu-usage');
    if (!cpuUsageElement) return;

    const usage = simulateCPUUsage();
    cpuUsageElement.textContent = `${usage}%`;
    cpuUsageElement.className = 'cpu-usage-indicator';

    if (usage < 50) {
        cpuUsageElement.classList.add('low');
    } else if (usage < 80) {
        cpuUsageElement.classList.add('medium');
    } else {
        cpuUsageElement.classList.add('high');
    }
}

// Simulate CPU usage every 5 seconds
setInterval(updateCPUUsageIndicator, 5000);
updateCPUUsageIndicator();

// High-level Initialization Wrapper
function init() {
    initUI();
    setupSidebarResize();
    setupResizeHandle();
    setupNetworkListener(onNewRequest);
    setupEventHandlers();
    setupUndoRedo();
    setupBulkReplay({ executeRequest, state, addToHistory, renderRequestItem });
    setupExtractorFeatures();
    setupAIFeatures();
}

// Handle New Request from Network Listener
function onNewRequest(request) {
    const parsed = parseRequest(request);
    if (!parsed) return;

    const id = addRequest(parsed);
    addToHistory(parsed);
    renderRequestItem(parsed, id);
    updateHistoryButtons();
}

// Event Handlers
function setupEventHandlers() {
    const filterInput = document.getElementById('filter-input');
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const sendBtn = elements.sendBtn;
    const captureBtn = document.getElementById('capture-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            filterRequests(e.target.value);
        });
    }

    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            if (filterInput) filterInput.value = '';
            filterRequests('');
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Clear all requests?')) {
                state.requests = [];
                clearAllRequestsUI();
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportRequests();
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            importRequests();
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const raw = elements.rawRequestInput.innerText;
            const parsed = parseRequest(raw);

            if (!parsed) {
                alert('Invalid HTTP request format.');
                return;
            }

            const id = addRequest(parsed);
            addToHistory(parsed);
            renderRequestItem(parsed, id);
            updateHistoryButtons();

            try {
                const response = await executeRequest(parsed);
                displayResponse(response);
            } catch (error) {
                console.error('Error executing request:', error);
                alert('Failed to send request. See console for details.');
            }
        });
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', captureScreenshot);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    setupContextMenu(selectRequest);
}

// Response Rendering
function displayResponse(response) {
    const responsePanel = elements.responsePanel;
    const responseStatus = document.getElementById('response-status');
    const responseHeaders = document.getElementById('response-headers');
    const responseBody = document.getElementById('response-body');
    const timingInfo = document.getElementById('timing-info');
    const sizeInfo = document.getElementById('size-info');

    if (!responsePanel) return;

    responsePanel.style.display = 'block';

    responseStatus.textContent = `${response.status} ${response.statusText || ''}`;
    responseStatus.className = 'status-code';
    if (response.status >= 200 && response.status < 300) {
        responseStatus.classList.add('status-success');
    } else if (response.status >= 400 && response.status < 500) {
        responseStatus.classList.add('status-client-error');
    } else if (response.status >= 500) {
        responseStatus.classList.add('status-server-error');
    }

    const headersEntries = Object.entries(response.headers || {});
    responseHeaders.innerHTML = headersEntries
        .map(([key, value]) => `<div class="header-row"><span class="header-key">${escapeHtml(key)}:</span> <span class="header-value">${escapeHtml(value)}</span></div>`)
        .join('');

    const contentType = response.headers['content-type'] || '';
    let bodyContent = response.body || '';

    if (contentType.includes('application/json')) {
        try {
            const parsed = JSON.parse(bodyContent);
            bodyContent = JSON.stringify(parsed, null, 2);
        } catch {
            // Keep raw body
        }
    }

    responseBody.innerHTML = `<pre class="code-block">${highlightHTTP(bodyContent)}</pre>`;

    if (response.timing) {
        timingInfo.textContent = `Time: ${response.timing.total} ms`;
    } else {
        timingInfo.textContent = '';
    }

    if (response.size) {
        sizeInfo.textContent = `Size: ${formatBytes(response.size)}`;
    } else {
        sizeInfo.textContent = '';
    }

    setupDiffView(response);
}

// Diff View
function setupDiffView(response) {
    const diffToggle = document.getElementById('diff-toggle');
    const diffContainer = document.getElementById('diff-container');

    if (!diffToggle || !diffContainer) return;

    diffToggle.addEventListener('click', () => {
        diffContainer.classList.toggle('visible');

        if (diffContainer.classList.contains('visible')) {
            const lastHistory = state.history[state.history.length - 1];
            if (!lastHistory) {
                diffContainer.innerHTML = '<p>No previous response to diff against.</p>';
                return;
            }

            const diffHtml = renderDiff(lastHistory.body || '', response.body || '');
            diffContainer.innerHTML = diffHtml;
        }
    });
}

// Secret Scanner and Endpoint Extractor
function setupExtractorFeatures() {
    const secretScanBtn = document.getElementById('secret-scan-btn');
    const endpointExtractBtn = document.getElementById('endpoint-extract-btn');
    const extractorModal = document.getElementById('extractor-modal');
    const extractorContent = document.getElementById('extractor-content');
    const extractorTabs = document.querySelectorAll('.extractor-tab');
    const extractorSearchContainer = document.getElementById('extractor-search-container');
    const extractorSearchInput = document.getElementById('extractor-search');
    let currentMode = 'secrets';

    if (!secretScanBtn || !endpointExtractBtn || !extractorModal || !extractorContent) return;

    secretScanBtn.addEventListener('click', async () => {
        currentMode = 'secrets';
        extractorModal.style.display = 'block';
        extractorSearchContainer.style.display = 'none';
        extractorContent.innerHTML = '<div class="loading-spinner">Scanning for secrets...</div>';

        try {
            const text = elements.rawRequestInput.innerText;
            const results = await scanForSecrets(text);
            if (!results || results.length === 0) {
                extractorContent.innerHTML = '<p>No secrets detected.</p>';
            } else {
                extractorContent.innerHTML = results.map(r => `
                    <div class="secret-item">
                        <div class="secret-header">
                            <span class="secret-label">${escapeHtml(r.label)}</span>
                            <span class="secret-score">Confidence: ${(r.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <pre class="secret-snippet">${escapeHtml(r.snippet)}</pre>
                    </div>
                `).join('');
            }
        } catch (error) {
            extractorContent.innerHTML = `<p>Error during scanning: ${escapeHtml(error.message)}</p>`;
        }
    });

    endpointExtractBtn.addEventListener('click', async () => {
        currentMode = 'endpoints';
        extractorModal.style.display = 'block';
        extractorSearchContainer.style.display = 'block';
        extractorContent.innerHTML = '<div class="loading-spinner">Extracting endpoints...</div>';

        try {
            const text = elements.rawRequestInput.innerText;
            const results = await extractEndpoints(text);

            if (!results || results.length === 0) {
                extractorContent.innerHTML = '<p>No endpoints detected.</p>';
            } else {
                renderEndpoints(results);
            }
        } catch (error) {
            extractorContent.innerHTML = `<p>Error during extraction: ${escapeHtml(error.message)}</p>`;
        }
    });

    extractorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            extractorTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.tab;

            if (currentMode === 'secrets') {
                extractorSearchContainer.style.display = 'none';
            } else {
                extractorSearchContainer.style.display = 'block';
            }
        });
    });

    if (extractorSearchInput) {
        extractorSearchInput.addEventListener('input', () => {
            const query = extractorSearchInput.value.toLowerCase();
            const items = extractorContent.querySelectorAll('.endpoint-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    function renderEndpoints(endpoints) {
        extractorContent.innerHTML = endpoints.map(ep => `
            <div class="endpoint-item">
                <div class="endpoint-header">
                    <span class="endpoint-method">${escapeHtml(ep.method)}</span>
                    <span class="endpoint-path">${escapeHtml(ep.path)}</span>
                </div>
                <div class="endpoint-details">
                    ${ep.description ? `<p>${escapeHtml(ep.description)}</p>` : ''}
                    ${ep.params && ep.params.length ? `
                        <div class="endpoint-params">
                            <h4>Parameters</h4>
                            <ul>
                                ${ep.params.map(p => `
                                    <li>
                                        <span class="param-name">${escapeHtml(p.name)}</span>
                                        <span class="param-type">${escapeHtml(p.type || '')}</span>
                                        ${p.description ? `<span class="param-desc">${escapeHtml(p.description)}</span>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
}

// AI Features
// AI Features
function setupAIFeatures() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const aiProviderSelect = document.getElementById('ai-provider');

    const openaiApiKeyInput = document.getElementById('openai-api-key');
    const openaiBaseUrlInput = document.getElementById('ai-openai-base-url');
    const openaiModelInput = document.getElementById('ai-openai-model');

    const ollamaBaseUrlInput = document.getElementById('ai-ollama-base-url');
    const ollamaModelInput = document.getElementById('ai-ollama-model');

    const anthropicApiKeyInput = document.getElementById('anthropic-api-key');
    const anthropicModelSelect = document.getElementById('anthropic-model');

    // Global prompt/context
    const promptTemplateInput = document.getElementById('ai-prompt-template');
    const contextTemplateInput = document.getElementById('ai-context-template');

    // Per-action prompt/context
    const promptExplainInput = document.getElementById('ai-prompt-explain');
    const contextExplainInput = document.getElementById('ai-context-explain');
    const promptSuggestInput = document.getElementById('ai-prompt-suggest');
    const contextSuggestInput = document.getElementById('ai-context-suggest');

    const aiMenuBtn = document.getElementById('ai-menu-btn');
    const aiMenuDropdown = document.getElementById('ai-menu-dropdown');

    const explainBtn = document.getElementById('explain-btn');
    const suggestAttackBtn = document.getElementById('suggest-attack-btn');
    const ctxExplainAi = document.getElementById('ctx-explain-ai');

    const explanationModal = document.getElementById('explanation-modal');
    const explanationContent = document.getElementById('explanation-content');

    const providerSections = document.querySelectorAll('.ai-provider-section');

    if (!settingsModal || !explanationModal || !explanationContent) return;

    function updateProviderSections(provider) {
        providerSections.forEach(sec => {
            const p = sec.dataset.provider;
            sec.style.display = p === provider ? 'block' : 'none';
        });
    }

    if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', () => {
            updateProviderSections(aiProviderSelect.value);
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const settings = getAISettings();

            const currentProvider = settings.provider || 'anthropic';
            if (aiProviderSelect) {
                aiProviderSelect.value = currentProvider;
            }
            updateProviderSections(currentProvider);

            // Anthropic
            if (anthropicApiKeyInput) {
                anthropicApiKeyInput.value =
                    localStorage.getItem('anthropic_api_key') || '';
            }
            if (anthropicModelSelect) {
                anthropicModelSelect.value =
                    localStorage.getItem('anthropic_model') ||
                    anthropicModelSelect.value;
            }

            // OpenAI
            if (openaiApiKeyInput) {
                openaiApiKeyInput.value =
                    localStorage.getItem('openai_api_key') || '';
            }
            if (openaiBaseUrlInput) {
                openaiBaseUrlInput.value =
                    localStorage.getItem('openai_base_url') || '';
            }
            if (openaiModelInput) {
                openaiModelInput.value =
                    localStorage.getItem('openai_model') || '';
            }

            // Ollama
            if (ollamaBaseUrlInput) {
                ollamaBaseUrlInput.value =
                    localStorage.getItem('ollama_base_url') || '';
            }
            if (ollamaModelInput) {
                ollamaModelInput.value =
                    localStorage.getItem('ollama_model') || '';
            }

            // Global Prompt + Context
            if (promptTemplateInput) {
                promptTemplateInput.value =
                    localStorage.getItem('ai_prompt_template') || '';
            }
            if (contextTemplateInput) {
                contextTemplateInput.value =
                    localStorage.getItem('ai_context_template') || '';
            }

            // Per-mode Prompt + Context
            if (promptExplainInput) {
                promptExplainInput.value =
                    localStorage.getItem('ai_prompt_explain') || '';
            }
            if (contextExplainInput) {
                contextExplainInput.value =
                    localStorage.getItem('ai_context_explain') || '';
            }
            if (promptSuggestInput) {
                promptSuggestInput.value =
                    localStorage.getItem('ai_prompt_suggest_attacks') || '';
            }
            if (contextSuggestInput) {
                contextSuggestInput.value =
                    localStorage.getItem('ai_context_suggest_attacks') || '';
            }

            settingsModal.style.display = 'block';
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const provider = aiProviderSelect ? aiProviderSelect.value : 'anthropic';

            const promptTemplate = promptTemplateInput
                ? promptTemplateInput.value.trim()
                : '';
            const contextTemplate = contextTemplateInput
                ? contextTemplateInput.value.trim()
                : '';

            const promptByMode = {
                explain: promptExplainInput ? promptExplainInput.value.trim() : '',
                'suggest-attacks': promptSuggestInput ? promptSuggestInput.value.trim() : ''
            };

            const contextByMode = {
                explain: contextExplainInput ? contextExplainInput.value.trim() : '',
                'suggest-attacks': contextSuggestInput ? contextSuggestInput.value.trim() : ''
            };

            const settings = {
                provider,
                promptTemplate,
                contextTemplate,
                promptByMode,
                contextByMode
            };

            if (provider === 'anthropic') {
                settings.apiKey = anthropicApiKeyInput.value.trim();
                settings.model = anthropicModelSelect
                    ? anthropicModelSelect.value
                    : 'claude-3-5-sonnet-20241022';
            } else if (provider === 'openai') {
                settings.apiKey = openaiApiKeyInput.value.trim();
                settings.baseUrl = openaiBaseUrlInput.value.trim();
                settings.model = openaiModelInput.value.trim();
            } else if (provider === 'ollama') {
                settings.baseUrl = ollamaBaseUrlInput.value.trim();
                settings.model = ollamaModelInput.value.trim();
            }

            saveAISettings(settings);
            alert('Settings saved!');
            settingsModal.style.display = 'none';
        });
    }

    if (aiMenuBtn && aiMenuDropdown) {
        aiMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            aiMenuDropdown.classList.toggle('show');
        });
        window.addEventListener('click', () => {
            if (aiMenuDropdown.classList.contains('show')) {
                aiMenuDropdown.classList.remove('show');
            }
        });
    }

    const handleAIRequest = async (mode, content) => {
        const settings = getAISettings();

        if ((settings.provider === 'anthropic' || settings.provider === 'openai') &&
            !settings.apiKey) {
            alert('Please configure your AI provider and API key in Settings first.');
            settingsModal.style.display = 'block';
            return;
        }

        explanationModal.style.display = 'block';
        explanationContent.innerHTML = '<div class="loading-spinner">Generating...</div>';

        try {
            await streamExplanation(settings, content, mode, (text) => {
                if (typeof marked !== 'undefined') {
                    explanationContent.innerHTML = marked.parse(text);
                } else {
                    explanationContent.innerHTML =
                        `<pre style="white-space: pre-wrap; font-family: sans-serif;">${text}</pre>`;
                }
            });
        } catch (error) {
            explanationContent.innerHTML =
                `<div style="color: var(--error-color); padding: 20px;">Error: ${error.message}</div>`;
        }
    };

    if (explainBtn) {
        explainBtn.addEventListener('click', () => {
            const content = elements.rawRequestInput.innerText;
            if (!content.trim()) {
                alert('Request is empty.');
                return;
            }
            handleAIRequest('explain', content);
        });
    }

    if (suggestAttackBtn) {
        suggestAttackBtn.addEventListener('click', () => {
            const content = elements.rawRequestInput.innerText;
            if (!content.trim()) {
                alert('Request is empty.');
                return;
            }
            handleAIRequest('suggest-attacks', content);
        });
    }

    if (ctxExplainAi) {
        ctxExplainAi.addEventListener('click', () => {
            const selection = window.getSelection().toString();
            if (!selection.trim()) {
                alert('Please select some text to explain.');
                return;
            }
            handleAIRequest('explain', selection);
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}


// Initialize
init();
