// Request Editor Module - Request/response editing and view switching
import { state, addToHistory } from '../core/state.js';
import { highlightHTTP } from '../core/utils/network.js';
import { generateHexView } from './hex-view.js';
import { generateJsonView } from './json-view.js';
import { events, EVENT_NAMES } from '../core/events.js';
import { getStatusClass, formatRawResponse } from '../network/response-parser.js';

export function selectRequest(index) {
    state.selectedRequest = state.requests[index];

    // Parse URL
    const urlObj = new URL(state.selectedRequest.request.url);
    const path = urlObj.pathname + urlObj.search;
    const method = state.selectedRequest.request.method;
    const httpVersion = state.selectedRequest.request.httpVersion || 'HTTP/1.1';

    // Construct Raw Request
    let rawText = `${method} ${path} ${httpVersion}\n`;

    let headers = state.selectedRequest.request.headers;
    const hasHost = headers.some(h => h.name.toLowerCase() === 'host');
    if (!hasHost) {
        rawText += `Host: ${urlObj.host}\n`;
    }

    rawText += headers
        .filter(h => !h.name.startsWith(':'))
        .map(h => `${h.name}: ${h.value}`)
        .join('\n');

    // Body
    if (state.selectedRequest.request.postData && state.selectedRequest.request.postData.text) {
        let bodyText = state.selectedRequest.request.postData.text;
        try {
            const jsonBody = JSON.parse(bodyText);
            bodyText = JSON.stringify(jsonBody, null, 2);
        } catch (e) {
            // Not JSON or invalid JSON, use as-is
        }
        rawText += '\n\n' + bodyText;
    }

    const useHttps = urlObj.protocol === 'https:';

    // Initialize History
    state.requestHistory = [];
    state.historyIndex = -1;
    addToHistory(rawText, useHttps);

    // Initialize Undo/Redo
    state.undoStack = [rawText];
    state.redoStack = [];

    // Reset baseline for regular requests
    state.regularRequestBaseline = null;

    // Emit events for UI updates
    events.emit('ui:request-selected', {
        index,
        rawText: highlightHTTP(rawText),
        useHttps,
        request: state.selectedRequest
    });

    // If we have captured response data, show it immediately
    if (state.selectedRequest.responseBody !== undefined) {
        const status = state.selectedRequest.responseStatus || '';
        const statusText = state.selectedRequest.responseStatusText || '';
        const responseHeaders = state.selectedRequest.responseHeaders || [];
        const responseBody = state.selectedRequest.responseBody || '';

        const rawResponse = formatRawResponse({
            status,
            statusText,
            headers: responseHeaders,
            body: responseBody
        });

        state.currentResponse = rawResponse;

        // Estimate size from body length
        const sizeBytes = new TextEncoder().encode(responseBody || '').length;
        const sizeLabel = sizeBytes ? `${sizeBytes} bytes` : '';

        events.emit(EVENT_NAMES.UI_UPDATE_RESPONSE_VIEW, {
            status: status ? `${status} ${statusText}`.trim() : '',
            statusClass: getStatusClass(Number(status) || 0),
            time: '', // devtools listener doesn't provide timing per request; leave empty
            size: sizeLabel,
            content: rawResponse,
            diffEnabled: false,
            baseline: null,
            showDiff: false
        });
    }
}

export function toggleLayout(save = true) {
    const container = document.querySelector('.split-view-container');
    const isVertical = container.classList.toggle('vertical-layout');
    
    events.emit(EVENT_NAMES.UI_LAYOUT_TOGGLED, { isVertical });

    // Update icon rotation
    const btn = document.getElementById('layout-toggle-btn');
    if (btn) {
        const svg = btn.querySelector('svg');
        if (svg) {
            svg.style.transform = isVertical ? 'rotate(90deg)' : 'rotate(0deg)';
            svg.style.transition = 'transform 0.3s ease';
        }
    }

    // Reset flex sizes to 50/50 to avoid weird sizing when switching
    const requestPane = document.querySelector('.request-pane');
    const responsePane = document.querySelector('.response-pane');
    if (requestPane && responsePane) {
        requestPane.style.flex = '1';
        responsePane.style.flex = '1';
    }

    if (save) {
        localStorage.setItem('rep_layout_preference', isVertical ? 'vertical' : 'horizontal');
    }
}

export function switchRequestView(view) {
    events.emit(EVENT_NAMES.UI_VIEW_SWITCHED, { pane: 'request', view });
    // Update Tabs
    document.querySelectorAll('.view-tab[data-pane="request"]').forEach(t => {
        t.classList.toggle('active', t.dataset.view === view);
    });

    // Update Content Visibility
    ['pretty', 'raw', 'hex'].forEach(v => {
        const el = document.getElementById(`req-view-${v}`);
        if (el) {
            el.style.display = v === view ? 'flex' : 'none';
            el.classList.toggle('active', v === view);
        }
    });

    // Sync Content - emit event to get current content
    let content = '';
    events.emit('ui:get-request-content', (text) => {
        content = text;
    });
    
    // Fallback: try to get from DOM directly
    const rawInput = document.getElementById('raw-request-input');
    if (rawInput) {
        content = rawInput.innerText;
    }

    if (view === 'raw') {
        const textarea = document.getElementById('raw-request-textarea');
        if (textarea) textarea.value = content;
    } else if (view === 'hex') {
        const hexDisplay = document.getElementById('req-hex-display');
        if (hexDisplay) hexDisplay.textContent = generateHexView(content);
    } else if (view === 'pretty') {
        // Ensure pretty view is up to date if coming from raw
        const textarea = document.getElementById('raw-request-textarea');
        if (textarea && textarea.value !== content) {
            events.emit('ui:update-request-content', {
                text: textarea.value,
                highlighted: highlightHTTP(textarea.value)
            });
        }
    }
}

export function switchResponseView(view) {
    events.emit(EVENT_NAMES.UI_VIEW_SWITCHED, { pane: 'response', view });
    // Update Tabs
    document.querySelectorAll('.view-tab[data-pane="response"]').forEach(t => {
        t.classList.toggle('active', t.dataset.view === view);
    });

    // Update Content Visibility
    ['pretty', 'raw', 'hex', 'render', 'json'].forEach(v => {
        const el = document.getElementById(`res-view-${v}`);
        if (el) {
            el.style.display = v === view ? 'flex' : 'none';
            el.classList.toggle('active', v === view);
        }
    });

    // Sync Content
    // Note: Response content is stored in state.currentResponse
    const content = state.currentResponse || '';

    if (view === 'raw') {
        const pre = document.getElementById('raw-response-text');
        if (pre) pre.textContent = content;
    } else if (view === 'hex') {
        const hexDisplay = document.getElementById('res-hex-display');
        if (hexDisplay) hexDisplay.textContent = generateHexView(content);
    } else if (view === 'json') {
        const jsonDisplay = document.getElementById('res-json-display');
        if (jsonDisplay) {
            jsonDisplay.innerHTML = '';
            jsonDisplay.appendChild(generateJsonView(content));
        }
    }
}

