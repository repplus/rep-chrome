// AI Explanation Module - Request explanation functionality
import { getAISettings, streamExplanation } from './core.js';

/**
 * Handles AI explanation request
 * @param {string} promptPrefix - Prefix for the explanation prompt
 * @param {string} content - Content to explain
 * @param {HTMLElement} explanationModal - Modal element to display explanation
 * @param {HTMLElement} explanationContent - Content element in modal
 * @param {HTMLElement} settingsModal - Settings modal element
 */
export async function handleAIExplanation(promptPrefix, content, explanationModal, explanationContent, settingsModal, onTextUpdate) {
    const { provider, apiKey, model } = getAISettings();
    if (!apiKey) {
        const providerName = provider === 'gemini' ? 'Gemini' : 'Anthropic';
        alert(`Please configure your ${providerName} API Key in Settings first.`);
        settingsModal.style.display = 'block';
        return;
    }

    // Update modal title
    const modalTitleElement = explanationModal.querySelector('.modal-header h3');
    if (modalTitleElement) {
        modalTitleElement.textContent = 'Request Explanation';
    }

    explanationModal.style.display = 'block';
    explanationContent.innerHTML = '<div class="loading-spinner">Generating...</div>';

    try {
        await streamExplanation(apiKey, model, promptPrefix + "\n\n" + content, (text) => {
            if (onTextUpdate) onTextUpdate(text);
            if (typeof marked !== 'undefined') {
                explanationContent.innerHTML = marked.parse(text);
            } else {
                explanationContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: sans-serif;">${text}</pre>`;
            }
        }, provider);
    } catch (error) {
        explanationContent.innerHTML = `<div style="color: var(--error-color); padding: 20px;">Error: ${error.message}</div>`;
    }
}

