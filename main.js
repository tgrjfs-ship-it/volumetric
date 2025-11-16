import hljs from 'highlightjs';
import { marked } from 'marked';

console.log('main.js module loaded and initializing...'); // NEW log

let conversationHistory = [];
let pinnedMessages = new Set();
let messagesList = [];
let temperature = 0.7;
let selectedModel = 'gpt-4o';
let isHighlightingEnabled = true;
let memorySystem = { shortTerm: [], longTerm: [] };
let conversationTitle = 'Untitled Chat';
let tone = 'neutral';
let autoExecution = false;
let bookmarkedMessages = new Set();
let conversationBranches = [];
let systemLanguage = 'en';
let systemLanguageSelect; // NEW reference
let fullscreenBtn;
let isFullscreen = false;
let focusMode = false;
let isGenerating = false;
let generationCanceled = false;
let currentLoadingId = null;
let fontSelect; // NEW ref for font selector
let codeLangSelect; // NEW: preferred code language selector
let preferredCodeLang = 'javascript'; // NEW default

// NEW: Titan usage tracking
let titanUsageData = { count: 0, resetTime: Date.now() + 3600000 };
const TITAN_MAX_USES = 3;
const TITAN_RESET_INTERVAL = 3600000; // 1 hour

// NEW: Titan S variant usage tracking (2 uses per hour)
let titanSUsageData = { count: 0, resetTime: Date.now() + 3600000 };
const TITAN_S_MAX_USES = 2;
const TITAN_S_RESET_INTERVAL = 3600000; // 1 hour

// NEW: Message limit for non-powerful models
const DEFAULT_MESSAGE_LIMIT = 40; // max messages per conversation for non-powerful models

// === Multi-Select State ===
let selectionMode = false;
let selectedMessages = new Set();
let batchActionBar;
let selectToggleBtn; // NEW reference

// Configure Marked to render basic HTML safely
marked.setOptions({
    gfm: true,
    breaks: true,
    // Sanitize basic HTML output to prevent XSS in rendered markdown, especially for lists/bold/tables
    sanitize: true,
});

const modelsRegistry = {
    categories: [
        {
            id: 'core',
            label: 'Core (General)',
            models: [
                { id: 'gpt-5-preview', label: 'GPT-5 Preview', description: 'Next-gen preview model with advanced reasoning.', intelligence: 'A+', minThink: 800, maxThink: 1400, baseTyping: 28, typingJitter: 12 },
                { id: 'gpt-5', label: 'GPT-5', description: 'GPT-5 — stable release for high-quality reasoning and synthesis.', intelligence: 'A+', minThink: 900, maxThink: 1600, baseTyping: 26, typingJitter: 10 },
                { id: 'gpt-5o', label: 'GPT-5o (Omni)', description: 'GPT-5 Omni — multimodal high-capacity model for heavy workloads.', intelligence: 'A+', minThink: 1000, maxThink: 1800, baseTyping: 26, typingJitter: 10 },
                { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Lower-cost GPT-5 variant for quick prototyping.', intelligence: 'A', minThink: 260, maxThink: 520, baseTyping: 30, typingJitter: 12, plan: 'pro' },
                { id: 'gpt-5-code', label: 'GPT-5 Code', description: 'GPT-5 specialized for code generation and reasoning.', intelligence: 'A+', minThink: 700, maxThink: 1200, baseTyping: 22, typingJitter: 8 },
                { id: 'gpt-5-creative', label: 'GPT-5 Creative', description: 'Enhanced creativity mode for ideation and storytelling.', intelligence: 'A', minThink: 750, maxThink: 1300, baseTyping: 28, typingJitter: 14 },
                { id: 'gpt-5x', label: 'GPT-5X', description: 'GPT-5X — high-throughput, low-latency variant for large-scale tasks.', intelligence: 'A+', minThink: 600, maxThink: 1000, baseTyping: 20, typingJitter: 8 },
                { id: 'gpt-5-slim', label: 'GPT-5 Slim', description: 'Lower-cost GPT-5 variant optimized for short interactions.', intelligence: 'A-', minThink: 180, maxThink: 380, baseTyping: 30, typingJitter: 12 },
                { id: 'gpt-4o-32k', label: 'GPT-4o 32K', description: 'GPT-4o variant with very large context window (32k).', intelligence: 'A+', minThink: 500, maxThink: 1000, baseTyping: 24, typingJitter: 12 },
                { id: 'gpt-4.1', label: 'GPT-4.1', description: 'GPT-4.1 — iterative improvement over GPT-4 for better coherence.', intelligence: 'A', minThink: 550, maxThink: 1100, baseTyping: 34, typingJitter: 16 },
                { id: 'gpt-4o', label: 'GPT-4o (Omni)', description: 'Fast, multimodal, and reliable.', intelligence: 'A+', minThink: 300, maxThink: 800, baseTyping: 22, typingJitter: 12 },
                { id: 'gpt-4o-16k', label: 'GPT-4o 16K', description: 'GPT-4o variant with extended context window.', intelligence: 'A+', minThink: 400, maxThink: 900, baseTyping: 24, typingJitter: 12 },
                { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Low-latency GPT-4o for quick responses.', intelligence: 'A', minThink: 180, maxThink: 420, baseTyping: 30, typingJitter: 16 },
                { id: 'gpt-4', label: 'GPT-4 (Turbo)', description: 'High-quality, deep responses.', intelligence: 'A', minThink: 600, maxThink: 1200, baseTyping: 35, typingJitter: 18 },
                { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, concise replies.', intelligence: 'C+', minThink: 150, maxThink: 500, baseTyping: 50, typingJitter: 25 },
            ],
        },
        {
            id: 'powerful',
            label: 'Powerful',
            models: [
                // Titan S++ Pro+, Titan S+ and Titan S moved into a dedicated "Powerful" category
                { id: 'tee-titan-6s-pro+', label: 'tee Titan 6s Pro+ ⚡⚡', description: 'S++ tier: 100% smarter than tee Titan 6s Ultra Max — the most advanced reasoning, verification, and production-ready code generator. WARNING: Highly privileged capabilities and usage limits may apply.', intelligence: 'S++', minThink: 3600, maxThink: 7000, baseTyping: 12, typingJitter: 3, isTitan: true, alwaysThinkDeeper: true, robustCode: true, plan: 'titan' },
                { id: 'tee-titan-6s-ultra-max', label: 'tee Titan 6s Ultra Max ⚡🔥', description: 'S+ tier: the most intelligent model. Always thinks deeper and produces highly robust code. WARNING: Limited to 2 uses per hour.', intelligence: 'S+', minThink: 2400, maxThink: 5000, baseTyping: 16, typingJitter: 4, isTitan: true, alwaysThinkDeeper: true, robustCode: true, plan: 'titan' },
                { id: 'tee-titan-6-ultra-max', label: 'tee Titan 6 Ultra Max ⚡', description: 'Ultra-intelligent model for super complex tasks: advanced coding, math solving, deep analysis. WARNING: Limited to 3 uses per hour.', intelligence: 'S', minThink: 2000, maxThink: 4000, baseTyping: 18, typingJitter: 6, isTitan: true, plan: 'titan' },
            ],
        },
        {
            id: 'creative',
            label: 'Creative & Assistants',
            models: [
                { id: 'claude-3-opus', label: 'Claude 3 Opus', description: 'Eloquent and thoughtful.', intelligence: 'A+', minThink: 900, maxThink: 1400, baseTyping: 38, typingJitter: 16 },
                { id: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'Balanced and safe.', intelligence: 'A-', minThink: 500, maxThink: 900, baseTyping: 28, typingJitter: 12 },
                { id: 'claude-4-apt', label: 'Claude 4 Apt', description: 'Advanced reasoning and long-form synthesis.', intelligence: 'A+', minThink: 1000, maxThink: 1600, baseTyping: 36, typingJitter: 14 },
                { id: 'claude-instant', label: 'Claude Instant', description: 'Ultra-fast responses with lighter contextual depth.', intelligence: 'B+', minThink: 120, maxThink: 380, baseTyping: 48, typingJitter: 20 },
                { id: 'claude-2', label: 'Claude 2', description: 'Stable and reliable general-purpose assistant.', intelligence: 'A', minThink: 600, maxThink: 1000, baseTyping: 32, typingJitter: 12 },
                { id: 'gemini-2-flash', label: 'Gemini 2 Flash', description: 'Extremely fast and relevant.', intelligence: 'B+', minThink: 200, maxThink: 500, baseTyping: 22, typingJitter: 10 },
                { id: 'gemini-2', label: 'Gemini 2', description: 'Gemini 2 — strong reasoning and multimodal capabilities.', intelligence: 'A', minThink: 450, maxThink: 950, baseTyping: 28, typingJitter: 14 },
                { id: 'gemini-2-5', label: 'Gemini 2.5', description: 'Gemini 2.5 — improved code and reasoning, balanced speed.', intelligence: 'A+', minThink: 600, maxThink: 1100, baseTyping: 26, typingJitter: 12 },
                { id: 'gemini-2-pro', label: 'Gemini 2 Pro', description: 'Gemini 2 Pro — optimized for long-form and multiturn tasks.', intelligence: 'A+', minThink: 800, maxThink: 1400, baseTyping: 30, typingJitter: 14, plan: 'pro' },

                /* Added Claude 4 variants */
                { id: 'claude-4o', label: 'Claude 4o', description: 'Claude 4 Omni — high-capacity, multimodal reasoning.', intelligence: 'A+', minThink: 1100, maxThink: 1800, baseTyping: 34, typingJitter: 14 },
                { id: 'claude-4-chat', label: 'Claude 4 Chat', description: 'Optimized for chat, context retention and dialogue.', intelligence: 'A+', minThink: 900, maxThink: 1500, baseTyping: 32, typingJitter: 12 },
                { id: 'claude-4-creative', label: 'Claude 4 Creative', description: 'Highly creative outputs for writing and ideation.', intelligence: 'A', minThink: 800, maxThink: 1400, baseTyping: 36, typingJitter: 16 },

                /* New Claude 4.5 variants */
                { id: 'claude-4-5-apt', label: 'Claude 4.5 Apt', description: 'Claude 4.5 — improved reasoning and performance for synthesis.', intelligence: 'A+', minThink: 900, maxThink: 1400, baseTyping: 33, typingJitter: 12 },
                { id: 'claude-4-6', label: 'Claude 4.6', description: 'Claude 4.6 — iterative micro-improvements for reliability and safety.', intelligence: 'A+', minThink: 950, maxThink: 1500, baseTyping: 32, typingJitter: 10 },
                { id: 'claude-4-5-chat', label: 'Claude 4.5 Chat', description: 'Claude 4.5 Chat — enhanced dialogue handling and context retention.', intelligence: 'A+', minThink: 800, maxThink: 1300, baseTyping: 30, typingJitter: 11 },
                { id: 'claude-4-5-creative', label: 'Claude 4.5 Creative', description: 'Claude 4.5 Creative — stronger creative generation with better coherence.', intelligence: 'A', minThink: 850, maxThink: 1350, baseTyping: 34, typingJitter: 13 }
                ,
                { id: 'gemini-ultra', label: 'Gemini Ultra', description: 'Gemini Ultra — premium multimodal model with extended capabilities.', intelligence: 'A+', minThink: 900, maxThink: 1500, baseTyping: 28, typingJitter: 10 },
                { id: 'gemini-2-5', label: 'Gemini 2.5', description: 'Gemini 2.5 — improved code and reasoning, balanced speed.', intelligence: 'A+', minThink: 600, maxThink: 1100, baseTyping: 26, typingJitter: 12 }
            ],
        },
        {
            id: 'open-source',
            label: 'Open Source / Experimental',
            models: [
                { id: 'llama-3-405b', label: 'Llama 3 405B', description: 'Powerful open-source model.', intelligence: 'A-', minThink: 800, maxThink: 1400, baseTyping: 30, typingJitter: 12 },
                { id: 'llama-3-8b', label: 'Llama 3 8B', description: 'Small and fast, less consistent.', intelligence: 'D+', minThink: 100, maxThink: 350, baseTyping: 16, typingJitter: 10 },
                { id: 'mixtral-8x7b', label: 'Mixtral 8x7B', description: 'Mixture-of-experts for breadth.', intelligence: 'B', minThink: 500, maxThink: 900, baseTyping: 40, typingJitter: 14 },
            ],
        },
        {
            id: 'specialized',
            label: 'Specialized & Thematic',
            models: [
                { id: 'code-llama-34b', label: 'Code Llama 34B', description: 'Prioritizes runnable code.', intelligence: 'A-', minThink: 900, maxThink: 1300, baseTyping: 30, typingJitter: 12 },
                { id: 'dalle-mini', label: 'DALL·E Mini', description: 'Image specialist (visual instructions).', intelligence: 'B-', minThink: 1200, maxThink: 1800, baseTyping: 45, typingJitter: 20 },
                { id: 'legal-ai', label: 'Legal AI', description: 'Refuses non-legal prompts and prepends legal disclaimer.', intelligence: 'B+', minThink: 1800, maxThink: 2400, baseTyping: 68, typingJitter: 20, enforceDisclaimer: true },
                { id: 'pirate-speak', label: 'Pirate Speak', description: 'Thematic, speaks in pirate dialect.', intelligence: 'D+', minThink: 300, maxThink: 900, baseTyping: 60, typingJitter: 18, thematicPrefix: 'Ahoy!' },
            ],
        },
        {
            id: 'experimental',
            label: 'Experimental',
            models: [
                { id: 'qwq-32b', label: 'QwQ 32B', description: 'Quirky / chaotic outputs.', intelligence: 'F', minThink: 2000, maxThink: 4500, baseTyping: 90, typingJitter: 40 },
                { id: 'phi-3-mini', label: 'Phi-3 Mini', description: 'Tiny, very fast replies.', intelligence: 'C', minThink: 30, maxThink: 180, baseTyping: 12, typingJitter: 6 },
            ],
        },
    ],
};

// Flattened quick lookup derived from registry
const modelConfig = (() => {
    const map = {};
    modelsRegistry.categories.forEach(cat => {
        cat.models.forEach(m => {
            map[m.id] = Object.assign({}, m, { category: cat.id });
        });
    });
    return map;
})();

// Utility to pick a dynamic thinking delay based on min/max and a small randomness
function getModelThinkingDelay(modelId) {
    const m = modelConfig[modelId] || modelConfig['gpt-4o'];
    const minT = m.minThink || 500;
    const maxT = m.maxThink || (minT + 600);
    const jitter = Math.floor(Math.random() * (maxT - minT + 1));
    return minT + jitter;
}

// Utility to compute typing speed with jitter
function getModelTypingSpeed(modelId) {
    const m = modelConfig[modelId] || modelConfig['gpt-4o'];
    const base = m.baseTyping || 40;
    const jitter = (Math.random() - 0.5) * (m.typingJitter || 20);
    return Math.max(8, Math.round(base + jitter));
}

// === Update modelConfig with computed runtime simulation values (thinkingDelayMs, typingSpeedMs)
Object.keys(modelConfig).forEach(id => {
    try {
        modelConfig[id].thinkingDelayMs = getModelThinkingDelay(id);
        modelConfig[id].typingSpeedMs = getModelTypingSpeed(id);
    } catch (e) {
        modelConfig[id].thinkingDelayMs = 700;
        modelConfig[id].typingSpeedMs = 40;
    }
});

// Utility: apply model-specific default tone & temperature when a model is selected
function applyModelDefaults(modelId) {
    const cfg = modelConfig[modelId] || {};
    // Prefer explicit defaults on model, otherwise infer from intelligence
    const defaultTemp = (cfg.defaultTemp !== undefined) ? cfg.defaultTemp : (cfg.intelligence && cfg.intelligence.startsWith('S') ? 0.3 : (cfg.intelligence && cfg.intelligence.startsWith('A') ? 0.7 : 1.0));
    const defaultTone = cfg.defaultTone || (cfg.intelligence && cfg.intelligence.startsWith('S') ? 'professional' : 'neutral');
    // Apply to runtime state and UI controls if present
    temperature = defaultTemp;
    if (tempSlider) tempSlider.value = temperature;
    if (tempValue) tempValue.textContent = parseFloat(temperature).toFixed(1);
    tone = defaultTone;
    if (toneSelect) toneSelect.value = tone;
    console.log(`🔧 Applied model defaults for ${modelId}: temp=${temperature}, tone=${tone}`);
}

// === Initialize models with per-model defaults (Titan variants) ===
modelsRegistry.categories.forEach(cat => {
    cat.models.forEach(m => {
        if (m.id === 'tee-titan-6s-pro+') { m.defaultTemp = 0.25; m.defaultTone = 'professional'; }
        if (m.id === 'tee-titan-6s-ultra-max') { m.defaultTemp = 0.28; m.defaultTone = 'professional'; }
        if (m.id === 'tee-titan-6-ultra-max') { m.defaultTemp = 0.35; m.defaultTone = 'professional'; }
        // other models can keep inferred defaults
    });
});

// Ensure modelConfig includes the plan flag for lookups used elsewhere (e.g., updateModelStats)
Object.keys(modelConfig).forEach(id => {
    modelConfig[id].plan = modelConfig[id].plan || (modelConfig[id].isTitan ? 'titan' : (modelConfig[id].label && modelConfig[id].label.toLowerCase().includes('pro') ? 'pro' : undefined));
});

let messagesContainer;
let chatForm;
let messageInput;
let sendButton;
let settingsBtn;
let settingsPanel;
let closeSettingsBtn;
let themeBtn;
let clearChatBtn;
let exportChatBtn;
let modelPicker;
let modelPickerToggle;
let modelPickerMenu;
let modelPickerLabel;
let modelSelect;
let modelStats;
let tempSlider;
let tempValue;
let searchInput;
let searchBar;
let closeSearchBtn;
let previewPanel;
let closePreviewBtn;
let previewContent;
let plusBtn;
let actionMenu;
let closeMenuBtn;
let bottomActions;
let feedbackBtn; // New element reference
let searchToggleBtn; // New element reference
let aipediaBtn; // AIpedia button reference
let aipediaModal, aipediaContent, aipediaSearch, closeAipediaBtn, aipediaCloseBtn; // AIpedia modal refs
let highlightToggle; // New element reference
let combinedPreviewBtn; // New element reference
let imageGenBtn; // New element reference
let memoryBtn; // New memory management button
let conversationNameBtn; // New conversation naming button
let voiceInputBtn;
let toneSelect;
let executionToggle;
let systemPromptInput; // NEW reference
let bookmarksModal;
let modalOverlay;
let templatesBtn; // NEW
let bookmarksBtn; // NEW
let attachFileBtn; // NEW
let thinkDeeperBtn; // NEW
let canvasBtn; // NEW
let fileInput;
let editCodeModal;
let editCodeTextarea;
let saveCodeEditBtn;
let cancelCodeEditBtn;
let currentEditing = null; // { messageId, blockIndex }
let branchesBtn; // NEW reference
let statusIndicator; // NEW reference
let bgColorInput, bgColorResetBtn; // NEW refs for background color
let previewConsoleBody, clearPreviewConsoleBtn; // NEW preview console refs
let plansBtn; // NEW
let plansModal; // NEW
let closePlansBtn; // NEW
let plansContent; // NEW
let plansCancelBtn; // NEW
let currentPlan = null; // NEW

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded event fired - initializing app...');
    
    messagesContainer = document.getElementById('messagesContainer');
    chatForm = document.getElementById('chatForm');
    aipediaBtn = document.getElementById('aipediaBtn');
    aipediaModal = document.getElementById('aipediaModal');
    aipediaContent = document.getElementById('aipediaContent');
    aipediaSearch = document.getElementById('aipediaSearch');
    closeAipediaBtn = document.getElementById('closeAipediaBtn');
    aipediaCloseBtn = document.getElementById('aipediaCloseBtn');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    settingsBtn = document.getElementById('settingsBtn');
    settingsPanel = document.getElementById('settingsPanel');
    closeSettingsBtn = document.getElementById('closeSettingsBtn');
    themeBtn = document.getElementById('themeBtn');
    clearChatBtn = document.getElementById('clearChatBtn');
    exportChatBtn = document.getElementById('exportChatBtn');
    modelPicker = document.getElementById('modelPicker');
    modelPickerToggle = document.getElementById('modelPickerToggle');
    modelPickerMenu = document.getElementById('modelPickerMenu');
    modelPickerLabel = document.getElementById('modelPickerLabel');
    modelSelect = document.getElementById('modelSelect');
    modelStats = document.getElementById('modelStats');
    tempSlider = document.getElementById('tempSlider');
    tempValue = document.getElementById('tempValue');
    searchInput = document.getElementById('searchInput');
    searchBar = document.getElementById('searchBar');
    closeSearchBtn = document.getElementById('closeSearchBtn');
    previewPanel = document.getElementById('previewPanel');
    closePreviewBtn = document.getElementById('closePreviewBtn');
    previewContent = document.getElementById('previewContent');
    plusBtn = document.getElementById('plusBtn');
    actionMenu = document.getElementById('actionMenu');
    closeMenuBtn = document.getElementById('closeMenuBtn');
    bottomActions = document.getElementById('bottomActions');
    feedbackBtn = document.getElementById('feedbackBtn');
    searchToggleBtn = document.getElementById('searchToggleBtn');
    selectToggleBtn = document.getElementById('selectToggleBtn'); // NEW reference
    highlightToggle = document.getElementById('highlightToggle');
    combinedPreviewBtn = document.getElementById('combinedPreviewBtn');
    imageGenBtn = document.getElementById('imageGenBtn');
    voiceInputBtn = document.getElementById('voiceInputBtn');
    toneSelect = document.getElementById('toneSelect');
    executionToggle = document.getElementById('executionToggle');
    systemLanguageSelect = document.getElementById('systemLanguageSelect'); // NEW
    templatesBtn = document.getElementById('templatesBtn'); // NEW
    bookmarksBtn = document.getElementById('bookmarksBtn'); // NEW
    attachFileBtn = document.getElementById('attachFileBtn'); // NEW
    thinkDeeperBtn = document.getElementById('thinkDeeperBtn'); // NEW
    canvasBtn = document.getElementById('canvasBtn'); // NEW
    fileInput = document.getElementById('fileInput');
    editCodeModal = document.getElementById('editCodeModal');
    editCodeTextarea = document.getElementById('editCodeTextarea');
    saveCodeEditBtn = document.getElementById('saveCodeEditBtn');
    cancelCodeEditBtn = document.getElementById('cancelCodeEditBtn');
    branchesBtn = document.getElementById('branchesBtn'); // NEW reference
    statusIndicator = document.getElementById('statusIndicator'); // NEW reference
    fontSelect = document.getElementById('fontSelect');
    codeLangSelect = document.getElementById('codeLangSelect');
    bgColorInput = document.getElementById('bgColorInput');
    bgColorResetBtn = document.getElementById('bgColorResetBtn');
    previewConsoleBody = document.getElementById('previewConsoleBody');
    clearPreviewConsoleBtn = document.getElementById('clearPreviewConsole');
    plansBtn = document.getElementById('plansBtn'); // NEW
    plansModal = document.getElementById('plansModal'); // NEW
    closePlansBtn = document.getElementById('closePlansBtn'); // NEW
    plansContent = document.getElementById('plansContent'); // NEW
    plansCancelBtn = document.getElementById('plansCancelBtn'); // NEW
    
    // new UI refs
    const interruptBtn = document.getElementById('interruptBtn');
    const updateLogBtn = document.getElementById('updateLogBtn');
    const updateLogModal = document.getElementById('updateLogModal');
    const closeUpdateLogBtn = document.getElementById('closeUpdateLogBtn');
    const updateLogContent = document.getElementById('updateLogContent');
    
    // Create batch action bar element
    batchActionBar = document.createElement('div');
    batchActionBar.id = 'batchActionBar';
    batchActionBar.className = 'batch-actions-bar';
    batchActionBar.innerHTML = `
        <span id="selectedCount">0 selected</span>
        <button id="batchCopyBtn" title="Copy Selected">📋 Copy</button>
        <button id="batchDeleteBtn" title="Delete Selected">🗑️ Delete</button>
        <button id="batchExportBtn" title="Export Selected">📤 Export</button>
    `;
    document.body.appendChild(batchActionBar);

    // Create modal elements
    modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    document.body.appendChild(modalOverlay);
    
    bookmarksModal = document.createElement('div');
    bookmarksModal.className = 'bookmarks-modal';
    document.body.appendChild(bookmarksModal);
    
    console.log('✅ All DOM elements queried successfully');
    
    loadTheme();
    loadSettings();
    applySavedSystemLanguage(); // NEW: apply language early
    applySavedFont(); // Apply font early
    applySavedBackgroundColor(); // Apply user background color
    loadChatSession();
    loadMemorySystem();
    loadBookmarks();
    loadTitanUsage(); // NEW: Load Titan usage data
    loadTitanSUsage(); // NEW: Load Titan S usage data
    
    setupEventListeners();
    initializeModels(); // will populate the picker
    // update stats display initially for selected model
    updateModelStats(selectedModel);
    // Prepare AIpedia content
    if (aipediaBtn) aipediaBtn.addEventListener('click', openAipedia);
    if (closeAipediaBtn) closeAipediaBtn.addEventListener('click', closeAipediaModal);
    if (aipediaCloseBtn) aipediaCloseBtn.addEventListener('click', closeAipediaModal);
    if (aipediaSearch) aipediaSearch.addEventListener('input', filterAipedia);
    populateAipedia(); // initial population
    
    // wire update/interrupt UI listeners after elements exist
    if (interruptBtn) interruptBtn.addEventListener('click', interruptGeneration);
    if (updateLogBtn) updateLogBtn.addEventListener('click', () => {
        updateLogModal.classList.add('active'); modalOverlay.classList.add('active');
    });
    if (closeUpdateLogBtn) closeUpdateLogBtn.addEventListener('click', () => {
        updateLogModal.classList.remove('active'); modalOverlay.classList.remove('active');
    });
    
    // Preview console clear
    if (clearPreviewConsoleBtn) {
        clearPreviewConsoleBtn.addEventListener('click', () => {
            if (previewConsoleBody) previewConsoleBody.innerHTML = '';
        });
    }
    // Listen for console messages from preview iframe
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || data.__previewConsole__ !== true) return;
        appendPreviewConsoleLine(data.level || 'info', data.message || '');
    });
    
    console.log('✅ Event listeners attached and systems loaded');
});

document.addEventListener('DOMContentLoaded', () => {
    if (!messagesContainer) return;
    
    messagesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-button')) {
            const codeId = e.target.getAttribute('data-code-id');
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                const code = codeElement.textContent;
                navigator.clipboard.writeText(code);
                e.target.textContent = 'Copied!';
                setTimeout(() => {
                    e.target.textContent = 'Copy';
                }, 2000);
            }
        }
        
        if (e.target.classList.contains('preview-button')) {
            const messageElement = e.target.closest('.message.assistant');
            if (!messageElement) return;

            const msgId = messageElement.id;
            const messageData = messagesList.find(m => m.id === msgId);

            // Reworked preview: always attempt combined code execution if blocks are present (Feature 1)
            if (messageData && messageData.codeBlocks && messageData.codeBlocks.length > 0) {
                const combinedCode = combineAllInOne(messageData.codeBlocks);
                openPreview(combinedCode, 'html'); 
            } else {
                // Fallback to single block preview if no combined blocks found
                const codeId = e.target.getAttribute('data-code-id');
                const codeElement = document.getElementById(codeId);
                if (codeElement) {
                    const code = codeElement.textContent;
                    const language = codeElement.className.replace('code-content language-', '').split(' ')[0];
                    openPreview(code, language);
                }
            }
        }
        
        if (e.target.classList.contains('response-action-btn')) {
            const action = e.target.title;
            if (action === 'Good response') {
                e.target.textContent = '✅';
                setTimeout(() => { e.target.textContent = '👍'; }, 1000);
            } else if (action === 'Regenerate') {
                const userMsg = conversationHistory[conversationHistory.length - 2]?.content;
                if (userMsg) {
                    messageInput.value = userMsg;
                    autoResizeTextarea();
                    messageInput.focus();
                }
            } else if (action === 'Copy') {
                const msgContent = e.target.closest('.message').querySelector('.message-content');
                if (msgContent) {
                    navigator.clipboard.writeText(msgContent.textContent);
                    showNotification('Copied!');
                }
            }
        }
    });
});

function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    messageInput && messageInput.addEventListener('input', autoResizeTextarea);
    
    settingsBtn?.addEventListener('click', toggleSettings);
    closeSettingsBtn?.addEventListener('click', closeSettings);
    themeBtn?.addEventListener('click', toggleTheme);
    clearChatBtn?.addEventListener('click', clearChat);
    exportChatBtn?.addEventListener('click', exportChat);
    closePreviewBtn?.addEventListener('click', closePreview);
    plusBtn?.addEventListener('click', toggleActionMenu);
    closeMenuBtn?.addEventListener('click', closeActionMenu);
    
    feedbackBtn?.addEventListener('click', handleFeedback);
    searchToggleBtn?.addEventListener('click', toggleSearch);
    selectToggleBtn?.addEventListener('click', toggleSelectionMode); // NEW listener
    imageGenBtn?.addEventListener('click', handleImageGeneration);
    combinedPreviewBtn?.addEventListener('click', runCombinedPreview);
    voiceInputBtn?.addEventListener('click', handleVoiceInput);
    
    // New Action Menu buttons listeners
    templatesBtn?.addEventListener('click', showTemplates);
    // Add AIpedia open from action menu (also allow keyboard/modal closing)
    document.getElementById('imageGenBtn')?.addEventListener('contextmenu', (e)=>{ e.preventDefault(); openAipedia(); });
    bookmarksBtn?.addEventListener('click', showBookmarks);
    attachFileBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', handleFileSelected);
    branchesBtn?.addEventListener('click', showBranchesModal); // NEW listener
    // Listen for edit-code button clicks delegated from messagesContainer
    messagesContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-code-btn')) {
            const messageEl = e.target.closest('.message');
            const msgId = messageEl?.id;
            const blockIndex = parseInt(e.target.getAttribute('data-block-index'), 10);
            openEditCodeModal(msgId, blockIndex);
        }
    });
    saveCodeEditBtn?.addEventListener('click', saveCodeEdit);
    cancelCodeEditBtn?.addEventListener('click', closeEditCodeModal);
    
    thinkDeeperBtn?.addEventListener('click', () => showNotification('Triggering deep thought process...'));
    canvasBtn?.addEventListener('click', () => showNotification('Opening interactive Canvas...'));

    // Batch action listeners
    document.getElementById('batchCopyBtn')?.addEventListener('click', batchCopy);
    document.getElementById('batchDeleteBtn')?.addEventListener('click', batchDelete);
    document.getElementById('batchExportBtn')?.addEventListener('click', batchExport);

    // Listen for message clicks to select them
    messagesContainer?.addEventListener('click', handleMessageClick);
    
    modelPicker?.addEventListener('click', (e) => {
        if (e.target.closest('.model-picker-item')) {
            const modelId = e.target.closest('.model-picker-item').getAttribute('data-model-id');
            selectedModel = modelId;
            modelPickerLabel.textContent = modelConfig[modelId]?.label || modelId;
            // update UI and runtime config
            updateModelStats(selectedModel);
            applyModelDefaults(selectedModel); // <-- apply per-model tone/temp defaults
            saveChatSession();
            // close menu
            modelPickerMenu.classList.remove('active');
            modelPickerMenu.setAttribute('aria-hidden','true');
            modelPickerToggle.focus();
            console.log('📌 Model selected via custom picker:', selectedModel);
        }
    });
    
    modelSelect?.addEventListener('change', (e) => {
        selectedModel = e.target.value;
        console.log(`📌 Model changed to: ${selectedModel}`);
        saveChatSession();
        updateModelStats(selectedModel);
    });

    systemPromptInput?.addEventListener('input', (e) => { // NEW listener
        localStorage.setItem('customSystemPrompt', e.target.value.trim());
        showNotification('Custom personality saved.');
    });
    
    highlightToggle?.addEventListener('change', (e) => {
        isHighlightingEnabled = e.target.value === 'on';
        console.log(`📌 Syntax highlighting: ${isHighlightingEnabled ? 'ON' : 'OFF'}`);
        localStorage.setItem('highlighting', e.target.value);
    });
    
    // Font selector handling
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            const v = e.target.value;
            applyFontChoice(v);
            localStorage.setItem('uiFont', v);
        });
    }
    // System language handling
    if (systemLanguageSelect) {
        systemLanguageSelect.addEventListener('change', (e) => {
            const lang = e.target.value || 'en';
            setSystemLanguage(lang);
            localStorage.setItem('systemLanguage', lang);
            showNotification(`System language set to ${lang}`);
        });
    }
    // Background color handling
    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            setCustomBackground(color);
            localStorage.setItem('bgColor', color);
        });
    }
    if (bgColorResetBtn) {
        bgColorResetBtn.addEventListener('click', () => {
            localStorage.removeItem('bgColor');
            setCustomBackground(null);
            if (bgColorInput) bgColorInput.value = '#ffffff';
            showNotification('Background color reset.');
        });
    }
    
    tempSlider?.addEventListener('input', (e) => {
        temperature = parseFloat(e.target.value);
        tempValue.textContent = temperature.toFixed(1);
        console.log(`📌 Temperature set to: ${temperature}`);
    });
    
    searchInput?.addEventListener('input', filterMessages);
    closeSearchBtn?.addEventListener('click', closeSearch);
    
    chatForm?.addEventListener('submit', handleSubmit);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-panel') && !e.target.closest('#settingsBtn')) {
            closeSettings();
        }
        if (!e.target.closest('.action-menu') && !e.target.closest('#plusBtn')) {
            closeActionMenu();
        }
    });

    // Close modal via overlay
    modalOverlay?.addEventListener('click', closeBookmarksModal);
    
    fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    // Toggle focus mode with Ctrl/Cmd+K
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'F11')) {
            e.preventDefault();
            toggleFullscreen();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleFocusMode();
        }
    });

    if (plansBtn) plansBtn.addEventListener('click', openPlansModal);
    if (closePlansBtn) closePlansBtn.addEventListener('click', closePlansModal);
    if (plansCancelBtn) plansCancelBtn.addEventListener('click', closePlansModal);

    loadSavedPlan(); // NEW: restore saved plan on init
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

function toggleSettings() {
    settingsPanel.classList.toggle('active');
}

function closeSettings() {
    settingsPanel.classList.remove('active');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeButton();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeButton();
}

function updateThemeButton() {
    // guard against missing element during early initialization
    if (!themeBtn) return;
    themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

function loadSettings() {
    const savedHighlight = localStorage.getItem('highlighting');
    if (savedHighlight === 'off') {
        isHighlightingEnabled = false;
        if (highlightToggle) highlightToggle.value = 'off';
    } else {
        isHighlightingEnabled = true;
        if (highlightToggle) highlightToggle.value = 'on';
    }
    // Load custom system prompt
    const savedSystemPrompt = localStorage.getItem('customSystemPrompt');
    if (systemPromptInput && savedSystemPrompt) {
        systemPromptInput.value = savedSystemPrompt;
    }
    // Load UI font
    const savedFont = localStorage.getItem('uiFont') || 'noto-sans';
    if (fontSelect) {
        fontSelect.value = savedFont;
    }
    applyFontChoice(savedFont);
    // Load system language
    const savedLang = localStorage.getItem('systemLanguage') || 'en';
    systemLanguage = savedLang;
    if (systemLanguageSelect) systemLanguageSelect.value = savedLang;
    document.documentElement.lang = systemLanguage;
    // Load model and temp settings if available (handled by loadChatSession below for persistence)
}

function applySavedFont() {
    const savedFont = localStorage.getItem('uiFont') || 'noto-sans';
    if (fontSelect) fontSelect.value = savedFont;
    applyFontChoice(savedFont);
}

function applySavedSystemLanguage() {
    const saved = localStorage.getItem('systemLanguage') || systemLanguage || 'en';
    systemLanguage = saved;
    if (systemLanguageSelect) systemLanguageSelect.value = saved;
    try {
        document.documentElement.lang = saved;
        console.log('🌐 Applied system language:', saved);
    } catch (e) {
        console.warn('Could not apply system language attribute', e);
    }
}

function setSystemLanguage(lang) {
    systemLanguage = lang || 'en';
    try {
        document.documentElement.lang = systemLanguage;
    } catch (e) {
        console.warn('Failed to set document lang:', e);
    }
}

function applyFontChoice(key) {
    // Map key to a CSS font-family value
    let family = "var(--ui-font)"; // fallback to existing default
    switch ((key || '').toLowerCase()) {
        case 'cal-sans':
            family = '"Cal Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
            break;
        case 'space-mono':
            family = '"Space Mono", "Courier New", monospace';
            break;
        case 'system':
            family = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
            break;
        case 'noto-sans':
        default:
            family = '"Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
            break;
    }
    document.documentElement.style.setProperty('--ui-font', family);
    console.log('🔤 UI font applied:', key, family);
}

function clearChat() {
    console.log('🧹 Clearing chat...');
    if (confirm('Clear all messages? This cannot be undone.')) {
        messagesContainer.innerHTML = '';
        conversationHistory = [];
        messagesList = [];
        pinnedMessages.clear();
        localStorage.removeItem('chatHistory');
        localStorage.removeItem('conversationTitle');
        localStorage.removeItem('settings');
        conversationTitle = 'Untitled Chat';
        closeSettings();
        
        const initialMessage = document.createElement('div');
        initialMessage.className = 'message assistant';
        initialMessage.innerHTML = '<div class="message-content">Hello! How can I help you today?</div>';
        messagesContainer.appendChild(initialMessage);
        
        console.log('✅ Chat cleared');
    }
}

function exportChat() {
    console.log('📤 Exporting chat...');
    const exportData = {
        timestamp: new Date().toISOString(),
        conversationTitle: conversationTitle,
        model: selectedModel,
        messages: conversationHistory,
        memory: memorySystem,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ Chat exported');
}

function filterMessages(e) {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.message').forEach(msg => {
        const text = msg.textContent.toLowerCase();
        msg.style.opacity = text.includes(query) ? '1' : '0.3';
        msg.style.pointerEvents = text.includes(query) ? 'auto' : 'none';
    });
}

function closeSearch() {
    searchBar.classList.remove('active');
    searchInput.value = '';
    document.querySelectorAll('.message').forEach(msg => {
        msg.style.opacity = '1';
    });
}

function toggleSearch() {
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active')) {
        searchInput.focus();
    } else {
        closeSearch();
    }
}

function startNewChat() {
    if (conversationHistory.length === 0) {
        messageInput.focus();
        return;
    }
    
    if (confirm('Start a new chat? Current conversation will be cleared.')) {
        messagesContainer.innerHTML = '';
        conversationHistory = [];
        messagesList = [];
        pinnedMessages.clear();
        const initialMessage = document.createElement('div');
        initialMessage.className = 'message assistant';
        initialMessage.innerHTML = '<div class="message-content">Hello! How can I help you today?</div>';
        messagesContainer.appendChild(initialMessage);
        closeSettings();
        messageInput.focus();
    }
}

function toggleActionMenu() {
    actionMenu.classList.toggle('active');
}

function closeActionMenu() {
    actionMenu.classList.remove('active');
}

function openPreview(content, language = 'html') {
    previewContent.innerHTML = '';
    
    if (language === 'html' || language === 'jsx' || language === 'javascript') {
        const iframe = document.createElement('iframe');
        iframe.className = 'preview-iframe';
        // set sandbox attribute as a space-separated string for broad compatibility
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.srcdoc = content;
        previewContent.appendChild(iframe);
    } else {
        const codeElement = document.createElement('pre');
        const codeTag = document.createElement('code');
        codeTag.textContent = content;
        codeElement.appendChild(codeTag);
        previewContent.appendChild(codeElement);
    }
    
    previewPanel.classList.add('active');
}

function closePreview() {
    previewPanel.classList.remove('active');
}

async function handleSubmit(e) {
    e.preventDefault();
    const message = messageInput.value.trim();
    
    if (!message) {
        // Feature: Shake input container on empty submission (Refinement)
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.classList.add('shake-error');
            setTimeout(() => {
                inputContainer.classList.remove('shake-error');
            }, 600); // Wait slightly longer than animation duration (0.5s)
        }
        return;
    }
    
    // NEW: Check Titan usage limit
    if (selectedModel === 'tee-titan-6-ultra-max' || selectedModel === 'tee-titan-6s-ultra-max') {
        const now = Date.now();
        // If it's the S variant, use titanSUsageData & limit; otherwise use existing titanUsageData
        if (selectedModel === 'tee-titan-6s-ultra-max') {
            if (now >= titanSUsageData.resetTime) {
                titanSUsageData.count = 0;
                titanSUsageData.resetTime = now + TITAN_S_RESET_INTERVAL;
                console.log('🔄 Titan S usage counter reset');
            }
            if (titanSUsageData.count >= TITAN_S_MAX_USES) {
                const timeUntilReset = Math.ceil((titanSUsageData.resetTime - now) / 60000);
                showNotification(`⚡ Titan S+ limit reached (2/hour). Resets in ${timeUntilReset} min`);
                return;
            }
        } else {
            if (now >= titanUsageData.resetTime) {
                titanUsageData.count = 0;
                titanUsageData.resetTime = now + TITAN_RESET_INTERVAL;
                console.log('🔄 Titan usage counter reset');
            }
            if (titanUsageData.count >= TITAN_MAX_USES) {
                const timeUntilReset = Math.ceil((titanUsageData.resetTime - now) / 60000);
                showNotification(`⚡ Titan limit reached (3/hour). Resets in ${timeUntilReset} min`);
                return;
            }
        }
    }
    
    // If a generation is already in progress, let user know and require interrupt first
    if (isGenerating) {
        showNotification('Generation in progress — press Interrupt (⏹) to stop it.');
        return;
    }
    
    console.log('📤 User message submitted:', message.substring(0, 50) + '...');
    
    addMessage(message, 'user');
    messageInput.value = '';
    autoResizeTextarea();
    
    conversationHistory.push({ role: 'user', content: message });
    updateMemorySystem(message, 'user');
    saveChatSession();
    
    const loadingId = addLoadingMessage();
    isGenerating = true;
    generationCanceled = false;
    currentLoadingId = loadingId;
    sendButton.disabled = true;
    
    try {
        const model = modelConfig[selectedModel] || modelConfig['gpt-4o'];
        
        // NEW: Increment Titan usage counter
        if (selectedModel === 'tee-titan-6-ultra-max') {
            titanUsageData.count++;
            const remaining = TITAN_MAX_USES - titanUsageData.count;
            console.log(`⚡ Titan used: ${titanUsageData.count}/${TITAN_MAX_USES} (${remaining} remaining this hour)`);
            saveTitanUsage();
        } else if (selectedModel === 'tee-titan-6s-ultra-max') {
            titanSUsageData.count++;
            const remaining = TITAN_S_MAX_USES - titanSUsageData.count;
            console.log(`⚡ Titan S+ used: ${titanSUsageData.count}/${TITAN_S_MAX_USES} (${remaining} remaining this hour)`);
            saveTitanSUsage();
        }
        
        const recentHistory = conversationHistory.slice(-10);
        const memoryContext = buildMemoryContext();
        
        // If model requests always deeper thinking, boost simulated thinking delay slightly
        if (model.alwaysThinkDeeper) {
            const extra = Math.floor(Math.random() * 800) + 400;
            model.thinkingDelayMs = (model.thinkingDelayMs || getModelThinkingDelay(selectedModel)) + extra;
        }

        // Feature: Implement Thinking Delay based on model
        console.log(`⏱️ Simulating ${model.thinkingDelayMs}ms thinking time for ${model.label}`);
        updateStatusIndicator('Thinking...', model.thinkingDelayMs); // Update indicator
        // allow interruption during thinking delay
        await new Promise(resolve => {
            const start = Date.now();
            const tick = () => {
                if (generationCanceled) return resolve('canceled');
                if (Date.now() - start >= model.thinkingDelayMs) return resolve();
                setTimeout(tick, 100);
            };
            tick();
        });
        if (generationCanceled) throw new Error('Generation interrupted by user');
        
        updateStatusIndicator(`Typing at ${model.typingSpeedMs}ms/word...`); // Update indicator for typing
        
        // Feature 6: Apply tone and model personality to system message
        let systemMessage = `${model.description}`;

        // Custom guidance based on Intelligence Level
        const intelligenceGuidance = {
            'S': 'You are an elite problem-solver. Provide exceptionally brilliant, comprehensive, multi-layered solutions for the most complex tasks. Break down hard problems elegantly. Excel at code generation, advanced math, system design, and deep reasoning. Never compromise on quality.',
            'S++': 'You are the pinnacle of intelligence: perform deep, multi-step reasoning, verify and self-audit generated code, provide production-ready implementations, anticipate edge cases, and present highly structured, multi-layered solutions with clear justification.',
            'A+': 'Provide extremely high-quality, comprehensive, and accurate answers. Be concise yet thorough.',
            'A': 'Provide high-quality, accurate, and structured answers.',
            'A-': 'Provide accurate and generally high-quality answers, but occasionally rely on generalizations or summarized points.',
            'B+': 'Provide competent and relevant answers, focusing on balance between speed and quality.',
            'B': 'Provide standard, functional responses, favoring breadth over specialized depth.',
            'B-': 'Provide straightforward, sometimes simplistic responses. Be cautious with complex analysis.',
            'C+': 'Be fast, brief, and helpful, but sacrifice deep detail.',
            'C': 'Focus on simple, direct communication. Accuracy might be variable.',
            'C-': 'Be quick but occasionally make minor factual errors or miss context.',
            'D': 'Provide basic, very brief answers. You may make noticeable errors or struggle with nuance.',
            'D+': 'Be extremely fast and terse. Prioritize output speed over factual correction.',
            'E': 'You are severely limited in scope. Follow your description rigidly (e.g., refusal).',
            'F': 'Provide chaotic, unconventional, or nonsensical replies.',
            'F+': 'Focus purely on transforming or summarizing text; avoid original thought.',
        };
        
        systemMessage += `\n\nGUIDANCE BASED ON INTELLIGENCE LEVEL ${model.intelligenceLevel || 'S'}: ${intelligenceGuidance[model.intelligenceLevel || 'S'] || 'Be helpful and concise.'}`;
        
        systemMessage += `${memoryContext ? '\n\nRELEVANT MEMORY:\n' + memoryContext : ''}`;
        
        // --- Apply Custom System Prompt Feature ---
        const customPrompt = localStorage.getItem('customSystemPrompt');
        if (customPrompt) {
            systemMessage += `\n\nCUSTOM PERSONALITY INSTRUCTION: ${customPrompt}`;
        }
        
        if (tone !== 'neutral') {
            systemMessage += `\n\nAdopt a ${tone} tone in your response.`;
        }
        
        // Guide code language & fencing
        systemMessage += `\n\nCode output preference: ${preferredCodeLang}. Wrap code in triple backticks with the language tag (${preferredCodeLang}). For Tailwind, provide HTML using Tailwind classes; for Java/Python include full functions.`;
        
        console.log(`🧠 Building AI prompt with memory context and ${recentHistory.length} recent messages`);
        
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: systemMessage },
                ...recentHistory,
            ],
            temperature: temperature,
        });

        // If model is robustCode-enabled, provide minor post-processing safety (no-op simulation)
        if (model.robustCode) {
            // simple simulated verification step (non-blocking)
            console.log('🔍 Titan S+ robust-code verification passed (simulated)');
        }
        
        const response = completion.content;
        if (generationCanceled) throw new Error('Generation interrupted by user');
        console.log('✅ AI response received:', response.substring(0, 50) + '...');
        
        conversationHistory.push({ role: 'assistant', content: response });
        updateMemorySystem(response, 'assistant');
        
        removeLoadingMessage(loadingId);
        currentLoadingId = null;
        isGenerating = false;
        // Pass model typing speed
        addMessage(response, 'assistant', false, model.typingSpeedMs);
        saveChatSession();
        saveMemorySystem();
        
        updateStatusIndicator('Done.'); // Update indicator to done/hide
        setTimeout(() => updateStatusIndicator(''), 1000);
        
        // Feature 5: Auto-execute code if enabled
        if (autoExecution) {
            const latestMsg = messagesList.slice().reverse().find(m => m.role === 'assistant' && m.codeBlocks?.length > 0);
            if (latestMsg) {
                showExecutionIndicator('Auto-executing code...');
                setTimeout(() => {
                    const combinedCode = combineAllInOne(latestMsg.codeBlocks);
                    openPreview(combinedCode, 'html');
                }, 500);
            }
        }
        
        // Remove old logic relying on typeWriterEffect for showing bottom actions.
        // animateTextBlocks will handle the callback now.
        if (!response.trim()) {
            showBottomActions();
        }
    } catch (error) {
        console.error('❌ Error:', error);
        // If generation canceled, show short notification
        if (error && error.message && error.message.includes('interrupted')) {
            showNotification('Generation interrupted');
        } else {
            addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
        }
        removeLoadingMessage(loadingId);
        currentLoadingId = null;
        isGenerating = false;
        updateStatusIndicator(''); // Hide indicator on error
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// If the content is simple text, use marked for basic formatting
function markdownToHtml(text) {
    // Only process basic text formatting, skip if it contains code blocks (which are handled separately)
    if (text.includes('```')) return text; 
    return marked.parse(text);
}

function addMessage(text, role, isHtmlContent = false, typingSpeedMs = 40) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    const timestamp = new Date();
    
    // Add selection checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'message-checkbox';
    checkbox.disabled = true;
    messageDiv.prepend(checkbox); // Prepend before the wrapper
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    let messageData = { id: 'msg-' + Date.now() + Math.random().toString(36).substring(2, 9), content: text, role, codeBlocks: [] }; // Prepare structure with unique ID
    const msgId = messageData.id;

    if (role === 'assistant') {
        if (isHtmlContent) {
            contentDiv.innerHTML = text; // Insert raw HTML content
            wrapper.appendChild(contentDiv);
        } else {
            // insert parsed HTML (with code blocks). For text parts we animate only the .text-content blocks
            const { html, codeBlocks } = parseCodeBlocks(text, true); // Extract blocks
            contentDiv.innerHTML = html;
            messageData.codeBlocks = codeBlocks;
            
            // Handle markdown conversion for non-code text blocks before animation
            contentDiv.querySelectorAll('.text-content[data-raw]').forEach(el => {
                const rawText = decodeURIComponent(el.getAttribute('data-raw'));
                // Render markdown safely *before* storing it for typing animation
                const markdownHtml = marked.parseInline(rawText);
                el.setAttribute('data-raw', encodeURIComponent(markdownHtml));
            });
            
            wrapper.appendChild(contentDiv);
            // animate text parts without re-adding code blocks or duplicating text
            animateTextBlocks(contentDiv, typingSpeedMs);
        }
    } else {
        // Apply markdown to user messages for better display
        contentDiv.innerHTML = markdownToHtml(text);
        wrapper.appendChild(contentDiv);
    }
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy';
    copyBtn.onclick = () => copyMessage(text);
    
    const pinBtn = document.createElement('button');
    pinBtn.className = 'message-action-btn';
    pinBtn.textContent = pinnedMessages.has(msgId) ? '📍' : '📌';
    pinBtn.title = 'Pin';
    pinBtn.onclick = () => togglePin(msgId, pinBtn);
    
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'message-action-btn';
    bookmarkBtn.textContent = bookmarkedMessages.has(msgId) ? '⭐' : '☆';
    bookmarkBtn.title = 'Bookmark';
    bookmarkBtn.onclick = () => {
        toggleBookmark(msgId, bookmarkBtn);
        bookmarkBtn.textContent = bookmarkedMessages.has(msgId) ? '⭐' : '☆';
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'message-action-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = () => deleteMessage(messageDiv, msgId);
    
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(pinBtn);
    actionsDiv.appendChild(bookmarkBtn);
    actionsDiv.appendChild(deleteBtn);
    
    wrapper.appendChild(actionsDiv);
    messageDiv.appendChild(wrapper);
    messageDiv.id = msgId;
    messagesList.push(messageData);
    
    // For assistant messages, show bottom actions after typing finishes
    if (role === 'assistant' && !isHtmlContent) {
        // ensure bottom actions hidden initially
        hideBottomActions();
        // The animation callback inside animateTextBlocks now handles showing actions
    } else if (role === 'assistant' && isHtmlContent) {
        // Show actions immediately for static content like images
        showBottomActions();
    }
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    // After the element is in DOM, run code checks on any code boxes within this message
    try {
        checkCodeBoxesIn(messageDiv);
    } catch (e) {
        console.error('Error checking code boxes after adding message', e);
    }
}

// Animate only the text-content blocks inside a parsed assistant message (sequentially),
// avoiding re-inserting HTML that already contains code boxes.
function animateTextBlocks(container, typingSpeedMs = 40, onComplete = showBottomActions) {
    const textBlocks = Array.from(container.querySelectorAll('.text-content'));
    let i = 0;

    const typeBlock = () => {
        if (i >= textBlocks.length) {
            if (typeof onComplete === 'function') onComplete();
            updateStatusIndicator(''); // Ensure indicator is cleared when typing finishes
            return;
        }
        const block = textBlocks[i];
        // decode the stored raw text (which is now markdown-rendered HTML)
        const rawAttr = block.getAttribute('data-raw') || '';
        const rawHtml = rawAttr ? decodeURIComponent(rawAttr) : '';
        
        // Temporarily clear innerHTML to start typing animation
        block.innerHTML = ''; 
        
        // We will now simulate typing the HTML content word by word.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;
        const nodes = Array.from(tempDiv.childNodes);
        
        let nodeIdx = 0;
        let wordIdx = 0;
        let currentNode = null;
        let words = [];
        
        const processNextNode = () => {
            if (nodeIdx >= nodes.length) {
                // Done with this block
                i++;
                setTimeout(typeBlock, typingSpeedMs * 1.5);
                return;
            }
            currentNode = nodes[nodeIdx];
            
            if (currentNode.nodeType === Node.TEXT_NODE) {
                words = currentNode.textContent.split(/(\s+)/).filter(w => w.length > 0);
                wordIdx = 0;
                
                // Clone the text node placeholder for current typing
                const textNode = document.createTextNode('');
                block.appendChild(textNode);
                
                const typeWord = () => {
                    if (wordIdx < words.length) {
                        textNode.textContent += words[wordIdx];
                        wordIdx++;
                        setTimeout(typeWord, typingSpeedMs + Math.random() * (typingSpeedMs / 4));
                    } else {
                        // Finished text node, move to next node
                        nodeIdx++;
                        processNextNode();
                    }
                };
                typeWord();
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                // If it's a structural element (like <strong>, <li>), insert it immediately with its full content, then move to next node.
                // This sacrifices smooth typing inside formatted blocks but handles structure correctly.
                block.appendChild(currentNode.cloneNode(true));
                
                nodeIdx++;
                processNextNode();
                
            } else {
                // Other node types (comments, etc.)
                nodeIdx++;
                processNextNode();
            }
        };

        // Start processing the current block
        processNextNode();
    };

    if (textBlocks.length > 0 && textBlocks.some(b => b.getAttribute('data-raw'))) {
        typeBlock();
    } else {
        // If there are no text blocks to animate or they were already fully loaded (e.g. history load)
        if (typeof onComplete === 'function') onComplete();
    }
}

function parseCodeBlocks(text, returnBlocks = false) {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let html = '';
    let lastIndex = 0;
    let match;
    let codeBlocks = []; // Array to store extracted blocks
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
            // store raw text encoded (to avoid HTML attribute issues) and leave visible block empty
            // animateTextBlocks will decode and type the text into the block, preventing duplicate text.
            html += `<div class="text-content" data-raw="${encodeURIComponent(beforeText)}"></div>`;
        }
        
        // map jsx to javascript for Highlight.js compatibility
        let language = (match[1] || 'plaintext').toLowerCase();
        // user reported "fjx" (typo) codeblock not working — treat as jsx/javascript
        if (language === 'fjx') language = 'jsx';
        if (language === 'jsx') language = 'javascript';
        const code = match[2].trim();
        const codeBoxId = 'code-' + Date.now() + Math.random();
        
        if (returnBlocks) { // Store block for combined preview (Feature 1 prerequisite)
            codeBlocks.push({ lang: language, code: code });
        }

        let highlightedCode = code;
        
        // Conditional Highlighting (Feature 2)
        if (isHighlightingEnabled) {
            try {
                if (language && hljs.getLanguage(language)) {
                    highlightedCode = hljs.highlight(code, { language, ignoreIllegals: true }).value;
                } else {
                    highlightedCode = hljs.highlightAuto(code).value;
                }
            } catch (e) {
                highlightedCode = escapeHtml(code);
            }
        } else {
            highlightedCode = escapeHtml(code);
        }
        
        html += `
            <div class="code-box">
                <div class="code-header">
                    <span class="code-language">${language}</span>
                    <div class="code-buttons">
                        <button class="preview-button" data-code-id="${codeBoxId}" type="button">Preview</button>
                        <button class="edit-code-btn" data-code-id="${codeBoxId}" data-block-index="${codeBlocks.length - 1}" type="button">Edit</button>
                        <button class="copy-button" data-code-id="${codeBoxId}" type="button">Copy</button>
                    </div>
                </div>
                <pre><code id="${codeBoxId}" class="code-content language-${language}">${highlightedCode}</code></pre>
            </div>
        `;
        
        lastIndex = codeBlockRegex.lastIndex;
    }
    
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
        html += `<div class="text-content" data-raw="${encodeURIComponent(remainingText)}"></div>`;
    }
    
    if (!html) {
        html = `<div class="text-content" data-raw="${encodeURIComponent(text)}"></div>`;
    }
    
    if (returnBlocks) {
        return { html, codeBlocks };
    }
    
    return html;
}

// NEW: Lightweight code error checker for rendered code boxes.
// It looks for JavaScript-like code blocks and attempts to parse using Function constructor to surface syntax errors.
// If an error is found, an error badge is injected into the code header with the error message (tooltip).
function checkCodeBoxesIn(root = document) {
    try {
        const boxes = (root.querySelectorAll && root.querySelectorAll('.code-box')) ? root.querySelectorAll('.code-box') : [];
        boxes.forEach(box => {
            // avoid duplicating badge
            if (box.querySelector('.error-badge')) return;
            const codeEl = box.querySelector('.code-content');
            if (!codeEl) return;
            // Determine language from class
            const langMatch = (codeEl.className || '').match(/language-([a-z0-9\-]+)/i);
            const lang = langMatch ? langMatch[1].toLowerCase() : 'plaintext';
            const rawText = codeEl.textContent || '';
            // Only run lightweight checks for JavaScript variants (fast and non-invasive)
            if (['js','javascript','jsx'].includes(lang)) {
                try {
                    // Try to create a Function to detect syntax errors (doesn't execute)
                    // Wrap in an IIFE signature to allow top-level statements detection while avoiding execution.
                    // Use a small heuristic: if it looks like HTML, skip.
                    const trimmed = rawText.trim();
                    if (!trimmed) return;
                    // Avoid false positives for scripts that contain HTML fragments
                    if (trimmed.startsWith('<')) return;
                    // Attempt parse
                    // eslint-disable-next-line no-new-func
                    new Function(trimmed);
                    // no error -> nothing to do
                } catch (err) {
                    // Inject an error badge into header with tooltip showing short message
                    const header = box.querySelector('.code-header');
                    if (header) {
                        const badge = document.createElement('span');
                        badge.className = 'error-badge';
                        const shortMsg = (err && err.message) ? err.message.split('\n')[0] : 'Syntax error';
                        badge.textContent = 'ERROR';
                        badge.title = shortMsg;
                        // Make the badge interactive: clicking will request the AI to fix this code block
                        badge.style.cursor = 'pointer';
                        badge.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            try {
                                const codeText = (codeEl && codeEl.textContent) ? codeEl.textContent : '';
                                fixCodeByAI(codeText, lang, box);
                            } catch (e) {
                                console.error('Error invoking fixCodeByAI:', e);
                                showNotification('Failed to start auto-fix.');
                            }
                        });
                        header.appendChild(badge);
                    }
                }
            } else {
                // For other languages optionally we could add checks later
            }
        });
    } catch (e) {
        console.error('Error while checking code boxes:', e);
    }
}

// Combine multiple extracted code blocks into a single runnable HTML document.
function combineAllInOne(codeBlocks = []) {
    console.log(`🔗 Combining ${Array.isArray(codeBlocks) ? codeBlocks.length : 0} code blocks into single document`);
    let cssParts = [], jsParts = [], htmlParts = [], otherParts = [];
    let includeTailwind = false; // NEW
    codeBlocks.forEach(block => {
        const lang = (block.lang || '').toLowerCase();
        const code = block.code || '';
        if (lang === 'tailwind') { includeTailwind = true; htmlParts.push(code); return; } // NEW
        if (lang === 'css' || lang === 'scss' || lang === 'less') cssParts.push(code);
        else if (lang === 'js' || lang === 'javascript' || lang === 'jsx') jsParts.push(code);
        else if (lang === 'html') htmlParts.push(code);
        else if (lang === 'json') otherParts.push(`<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;">${escapeHtml(code)}</pre>`);
        else {
            if (/<\/?[a-z][\s\S]*>/i.test(code)) htmlParts.push(code);
            else otherParts.push(`<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;">${escapeHtml(code)}</pre>`);
        }
    });
    const cssBlock = `<style>
      html,body { height:100%; margin:0; padding:0; }
      body { display:block; overflow:hidden; }
      #preview-canvas { display:block; width:100vw; height:100vh; }
      ${cssParts.join("\n\n")}
    </style>`;
    const htmlBlock = `${htmlParts.join("\n\n")}<canvas id="preview-canvas"></canvas>`;
    const otherBlock = otherParts.join("\n\n");
    const jsPrelude = `
      (function(){
        const levels = ['log','info','warn','error'];
        levels.forEach(l=>{
          const orig = console[l] || console.log;
          console[l] = function(...args){
            try { parent.postMessage({__previewConsole__:true, level: l==='log'?'info':l, message: args.map(a=>typeof a==='object'?JSON.stringify(a,null,2):String(a)).join(' ')}, '*'); } catch(e){}
            orig.apply(console, args);
          };
        });
      })();
      window.getCanvas = function(){
        let c = document.getElementById('preview-canvas');
        if(!c){ c = document.createElement('canvas'); c.id='preview-canvas'; document.body.appendChild(c); }
        return c;
      };
      window.getCtx = function(){ const c = window.getCanvas(); return c.getContext('2d'); };
      function resizeCanvas(){
        const c = window.getCanvas(); const dpr = window.devicePixelRatio || 1;
        c.width = Math.floor(innerWidth * dpr); c.height = Math.floor(innerHeight * dpr);
        c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
        const ctx = c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
      }
      window.addEventListener('resize', resizeCanvas);
      document.addEventListener('DOMContentLoaded', ()=>{ resizeCanvas(); if (!window.__userDrawn__) {
          const ctx = window.getCtx();
          ctx.fillStyle = '#111827'; ctx.fillRect(0,0,innerWidth,innerHeight);
          ctx.fillStyle = '#22c55e'; ctx.font = '16px system-ui';
          ctx.fillText('Canvas ready. Add JS to draw.', 16, 28);
        }
      });
    `;
    const jsUser = jsParts.join("\n\n");
    const jsBlock = `<script>
      try { ${jsPrelude} ${jsUser} if (${jsParts.length}>0) window.__userDrawn__=true; } catch(e){ console.error(e); }
    </script>`;
    const tailwindScript = includeTailwind ? `<script src="https://cdn.tailwindcss.com"></script>` : ''; // NEW
    const full = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    ${tailwindScript}
    ${cssBlock}
  </head>
  <body>
    ${htmlBlock}
    ${otherBlock}
    ${jsBlock}
  </body>
</html>
`.trim();

    console.log('✅ Combined code document created');
    return full;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyMessage(text) {
    navigator.clipboard.writeText(text);
    showNotification('Copied!');
}

function togglePin(msgId, btn) {
    if (pinnedMessages.has(msgId)) {
        pinnedMessages.delete(msgId);
        btn.textContent = '📌';
        btn.style.opacity = '1';
    } else {
        pinnedMessages.add(msgId);
        btn.textContent = '📍';
    }
    saveChatSession();
}

function deleteMessage(messageDiv, msgId) {
    // Remove from messagesList
    messagesList = messagesList.filter(m => m.id !== msgId);
    
    // Cleanup pinned state
    pinnedMessages.delete(msgId);
    
    // If the deleted message was the latest one, hide bottom actions
    if (messageDiv === messagesContainer.lastElementChild) {
        hideBottomActions();
    }

    messageDiv.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => messageDiv.remove(), 300);
    
    // Reconstruct conversationHistory from messagesList 
    conversationHistory = messagesList
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content.length < 500 && !m.content.includes('<img'))) // Exclude very long content or image HTML from context
        .map(m => ({ role: m.role, content: m.content }));
        
    saveChatSession();
}

function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant loading';
    messageDiv.id = 'loading-' + Date.now();
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'loading-dots';
    dotsDiv.innerHTML = '<span></span><span></span><span></span>';
    
    contentDiv.appendChild(dotsDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv.id;
}

function removeLoadingMessage(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => element.remove(), 300);
    }
}

function showNotification(text) {
    console.log('📢 Showing notification:', text);
    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #0e639c;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        animation: slideIn 0.3s ease-out;
        z-index: 200;
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// === Feature 4: Save/Load Session ===

function saveChatSession() {
    console.log('💾 Saving chat session...');
    // NEW: more detailed debug log for session snapshot
    console.log('💾 Session snapshot:', {
        title: conversationTitle,
        model: selectedModel,
        temperature,
        tone,
        pinnedCount: pinnedMessages.size,
        bookmarks: bookmarkedMessages.size,
        messagesCount: conversationHistory.length,
    });
    localStorage.setItem('chatHistory', JSON.stringify(conversationHistory));
    localStorage.setItem('conversationTitle', conversationTitle);
    localStorage.setItem('settings', JSON.stringify({
        model: selectedModel,
        tone: tone,
        temperature: temperature,
        pinned: Array.from(pinnedMessages),
        highlighting: isHighlightingEnabled ? 'on' : 'off',
    }));
    // Persist UI font separately for compatibility
    const uiFont = (fontSelect && fontSelect.value) ? fontSelect.value : (localStorage.getItem('uiFont') || 'noto-sans');
    localStorage.setItem('uiFont', uiFont);
    // Save branches alongside session settings
    localStorage.setItem('conversationBranches', JSON.stringify(conversationBranches));
    console.log('✅ Session saved');
}

function loadChatSession() {
    console.log('📖 Loading chat session...');
    const savedHistory = localStorage.getItem('chatHistory');
    const savedTitle = localStorage.getItem('conversationTitle');
    const savedSettings = localStorage.getItem('settings');

    if (savedTitle) {
        conversationTitle = savedTitle;
        console.log('📝 Loaded conversation title:', conversationTitle);
    }

    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            selectedModel = settings.model || selectedModel;
            tone = settings.tone || 'neutral';
            temperature = settings.temperature !== undefined ? settings.temperature : temperature;
            pinnedMessages = new Set(settings.pinned || []);
            isHighlightingEnabled = settings.highlighting !== undefined ? settings.highlighting === 'on' : isHighlightingEnabled;
            
            if (modelPickerLabel) modelPickerLabel.textContent = modelConfig[selectedModel]?.label || selectedModel;
            if (modelPickerMenu) modelPickerMenu.innerHTML = '';
            if (modelPickerToggle) modelPickerToggle.focus();
            
            console.log('✅ Settings loaded');
        } catch (e) {
            console.error('❌ Error loading settings:', e);
        }
    }
    
    const savedAutoExecution = localStorage.getItem('autoExecution');
    if (savedAutoExecution === 'true' && executionToggle) {
        executionToggle.checked = true;
        autoExecution = true;
    }
    
    messagesContainer.innerHTML = '';
    messagesList = [];
    
    if (savedHistory && savedHistory !== '[]') {
        try {
            conversationHistory = JSON.parse(savedHistory);
            console.log('📖 Loaded', conversationHistory.length, 'messages from history');
            
            conversationHistory.forEach(msg => {
                displayMessageImmediate(msg.content, msg.role);
            });
            scrollToBottom();
            
        } catch (e) {
            console.error('❌ Error loading chat history:', e);
            conversationHistory = [];
        }
    } else {
        const initialMessage = document.createElement('div');
        initialMessage.className = 'message assistant';
        initialMessage.innerHTML = '<div class="message-content">Hello! How can I help you today?</div>';
        messagesContainer.appendChild(initialMessage);
        conversationHistory = [];
        console.log('📌 Starting new conversation');
    }
}

function displayMessageImmediate(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Add selection checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'message-checkbox';
    checkbox.disabled = true;
    messageDiv.prepend(checkbox); // Prepend before the wrapper

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    let messageData = { id: 'msg-' + Date.now() + Math.random().toString(36).substring(2, 9), content: text, role, codeBlocks: [] };
    const msgId = messageData.id;

    // Check if content looks like raw HTML (e.g., image generation output)
    const isRichContent = role === 'assistant' && text.includes('<img');

    if (role === 'assistant') {
        if (isRichContent) {
            contentDiv.innerHTML = text;
        } else {
            // Parse codes but display immediately
            const { html, codeBlocks } = parseCodeBlocks(text, true); 
            contentDiv.innerHTML = html;
            messageData.codeBlocks = codeBlocks;
            
            // Replace empty .text-content elements (which hold encoded raw data for animation) with actual text for immediate display
            contentDiv.querySelectorAll('.text-content').forEach(el => {
                const rawAttr = el.getAttribute('data-raw') || '';
                const rawText = rawAttr ? decodeURIComponent(rawAttr) : '';

                // Apply markdown rendering before setting innerHTML
                el.innerHTML = marked.parse(rawText);
            });
        }
    } else {
        contentDiv.innerHTML = markdownToHtml(text); // Use markdown for user messages
    }
    
    wrapper.appendChild(contentDiv);
    
    // Re-create actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy';
    copyBtn.onclick = () => copyMessage(text);
    actionsDiv.appendChild(copyBtn);
    
    const pinBtn = document.createElement('button');
    pinBtn.className = 'message-action-btn';
    pinBtn.textContent = pinnedMessages.has(msgId) ? '📍' : '📌';
    pinBtn.title = 'Pin';
    pinBtn.onclick = () => togglePin(msgId, pinBtn);
    actionsDiv.appendChild(pinBtn);
    
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'message-action-btn';
    bookmarkBtn.textContent = bookmarkedMessages.has(msgId) ? '⭐' : '☆';
    bookmarkBtn.title = 'Bookmark';
    bookmarkBtn.onclick = () => {
        toggleBookmark(msgId, bookmarkBtn);
        bookmarkBtn.textContent = bookmarkedMessages.has(msgId) ? '⭐' : '☆';
    };
    actionsDiv.appendChild(bookmarkBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'message-action-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = () => deleteMessage(messageDiv, msgId);
    actionsDiv.appendChild(deleteBtn);
    
    wrapper.appendChild(actionsDiv);
    messageDiv.appendChild(wrapper);
    messageDiv.id = msgId;
    messagesList.push(messageData); // Track message data
    
    messagesContainer.appendChild(messageDiv);

    // Run error checks for any code boxes that were rendered immediately
    try {
        checkCodeBoxesIn(messageDiv);
    } catch (e) {
        console.error('Error checking code boxes during immediate display', e);
    }
}

// === Feature 5: Image Generation ===

function handleImageGeneration() {
    console.log('🎨 Opening image generation prompt');
    closeActionMenu();
    const userPrompt = window.prompt("Enter a prompt for the image generation:");
    if (userPrompt) {
        console.log('🖼️ Generating image with prompt:', userPrompt);
        generateImage(userPrompt);
    }
}

async function generateImage(prompt) {
    console.log('📸 Starting image generation...');
    addMessage(`[Image Generation Request] Prompt: ${prompt}`, 'user');
    conversationHistory.push({ role: 'user', content: `Requesting image generation for: ${prompt}` });
    
    const loadingId = addLoadingMessage();
    sendButton.disabled = true;
    
    try {
        const result = await websim.imageGen({
            prompt: prompt,
            aspect_ratio: "1:1",
        });
        
        removeLoadingMessage(loadingId);
        
        if (result && result.url) {
            const imageUrl = result.url;
            console.log('✅ Image generated successfully');
            
            const htmlContent = `
                <p>🖼️ Image generated successfully:</p>
                <img src="${imageUrl}" alt="${prompt}" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px;">
                <p>Prompt: <em>${prompt}</em></p>
            `;
            
            addMessage(htmlContent, 'assistant', true);
            
        } else {
            console.error('❌ Image generation returned no URL');
            addMessage('Image generation failed or returned no URL.', 'assistant');
        }

    } catch (error) {
        console.error('❌ Image generation error:', error);
        removeLoadingMessage(loadingId);
        addMessage('Sorry, image generation encountered an error.', 'assistant');
    } finally {
        sendButton.disabled = false;
        saveChatSession();
        messageInput.focus();
    }
}

// === Feature 4: Handle Feedback ===

function handleFeedback() {
    console.log('💬 Opening feedback dialog');
    closeActionMenu();
    const feedback = prompt("Please share your feedback (optional):");
    if (feedback !== null) {
        console.log('📝 Feedback received:', feedback);
        showNotification("Thank you for your feedback! We value your input.");
    }
}

function runCombinedPreview() {
    console.log('▶️ Running combined preview...');
    const latestAssistantMessage = messagesList.slice().reverse().find(m => m.role === 'assistant' && m.codeBlocks && m.codeBlocks.length > 0);
    
    if (latestAssistantMessage) {
        console.log('✅ Found code blocks, opening preview');
        const combinedCode = combineAllInOne(latestAssistantMessage.codeBlocks);
        openPreview(combinedCode, 'html');
    } else {
        console.warn('⚠️ No runnable code blocks found');
        showNotification("No runnable code blocks found in the latest response.");
    }
}

// === MEMORY SYSTEM (New Feature) ===

function updateMemorySystem(content, role) {
    console.log(`🧠 Updating memory system with ${role} message`);
    
    memorySystem.shortTerm.push({
        role,
        content: content.substring(0, 200),
        timestamp: Date.now(),
    });
    
    // Keep only last 20 short-term memories
    if (memorySystem.shortTerm.length > 20) {
        const removed = memorySystem.shortTerm.shift();
        console.log('🗑️ Pruned oldest short-term memory');
        
        // Move to long-term when short-term is full
        if (memorySystem.longTerm.length < 50) {
            memorySystem.longTerm.push({
                summary: `${removed.role}: ${removed.content}`,
                timestamp: removed.timestamp,
            });
        }
    }
}

function buildMemoryContext() {
    console.log('🔍 Building memory context...');
    const recent = memorySystem.shortTerm.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    const longTerm = memorySystem.longTerm.slice(-3).map(m => m.summary).join('\n');
    
    return `Recent: ${recent}\nLong-term: ${longTerm}`;
}

function saveMemorySystem() {
    console.log('💾 Saving memory system to localStorage');
    localStorage.setItem('memorySystem', JSON.stringify(memorySystem));
}

function loadMemorySystem() {
    console.log('📖 Loading memory system from localStorage');
    const saved = localStorage.getItem('memorySystem');
    if (saved) {
        try {
            memorySystem = JSON.parse(saved);
            console.log('✅ Memory system loaded:', memorySystem.shortTerm.length, 'short-term,', memorySystem.longTerm.length, 'long-term');
        } catch (e) {
            console.error('❌ Error loading memory system:', e);
        }
    }
}

function clearMemory() {
    console.log('🧹 Clearing all memories');
    memorySystem = { shortTerm: [], longTerm: [] };
    saveMemorySystem();
    showNotification('Memory cleared!');
}

// === NEW FEATURE: Conversation Naming ===

function renameConversation() {
    console.log('✏️ Opening conversation rename dialog');
    const newName = prompt('Name this conversation:', conversationTitle);
    if (newName && newName.trim()) {
        conversationTitle = newName.trim();
        console.log('📝 Conversation renamed to:', conversationTitle);
        saveChatSession();
        showNotification(`Chat renamed to "${conversationTitle}"`);
    }
}

function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
}

function showBottomActions() {
    if (!bottomActions) return;
    
    // Check if the latest message has code blocks to enable the combined preview button
    const latestAssistantMessage = messagesList.slice().reverse().find(m => m.role === 'assistant' && m.codeBlocks && m.codeBlocks.length > 0);
    
    if (latestAssistantMessage) {
        combinedPreviewBtn.classList.remove('hidden');
    } else {
        combinedPreviewBtn.classList.add('hidden');
    }

    bottomActions.style.display = 'flex';
    bottomActions.classList.remove('hidden');
    bottomActions.setAttribute('aria-hidden', 'false');
}

function hideBottomActions() {
    if (!bottomActions) return;
    bottomActions.classList.add('hidden');
    setTimeout(() => {
        bottomActions.style.display = 'none';
        bottomActions.setAttribute('aria-hidden', 'true');
    }, 250);
}

// === Feature 1: Voice Input ===
async function handleVoiceInput() {
    console.log('🎤 Starting voice input...');
    closeActionMenu();
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.language = 'en-US';
    
    recognition.onstart = () => {
        showNotification('🎤 Listening...');
    };
    
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        console.log('✅ Voice transcribed:', transcript);
        messageInput.value = transcript;
        autoResizeTextarea();
        messageInput.focus();
    };
    
    recognition.onerror = (event) => {
        console.error('❌ Voice input error:', event.error);
        showNotification('❌ Voice input failed');
    };
    
    recognition.start();
}

// === Feature 2: Prompt Templates ===
function showTemplates() {
    console.log('📋 Opening templates...');
    closeActionMenu();
    
    const templates = [
        { name: 'Explain Code', prompt: 'Explain this code in simple terms' },
        { name: 'Optimize Code', prompt: 'Optimize this code for performance' },
        { name: 'Bug Fix', prompt: 'Find and fix any bugs in this code' },
        { name: 'Documentation', prompt: 'Write comprehensive documentation' },
        { name: 'Refactor', prompt: 'Refactor this code following best practices' },
        { name: 'Unit Tests', prompt: 'Write unit tests for this code' },
    ];
    
    let html = '<div style="text-align:center; padding:20px;"><h3>Prompt Templates</h3></div>';
    templates.forEach(t => {
        html += `<div class="template-card" data-prompt="${t.prompt}">${t.name}</div>`;
    });
    
    bookmarksModal.innerHTML = html;
    bookmarksModal.classList.add('active');
    modalOverlay.classList.add('active');
    
    bookmarksModal.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            messageInput.value = card.getAttribute('data-prompt');
            autoResizeTextarea();
            closeBookmarksModal();
            messageInput.focus();
        });
    });
}

// === Feature 3: Bookmarking Messages ===
function toggleBookmark(msgId, btn) {
    if (bookmarkedMessages.has(msgId)) {
        bookmarkedMessages.delete(msgId);
        console.log('📌 Removed bookmark:', msgId);
    } else {
        bookmarkedMessages.add(msgId);
        console.log('⭐ Added bookmark:', msgId);
    }
    saveBookmarks();
}

function showBookmarks() {
    console.log('⭐ Opening bookmarks...');
    closeActionMenu();
    
    const bookmarked = messagesList.filter(m => bookmarkedMessages.has(m.id));
    
    bookmarksModal.innerHTML = '';
    
    const title = document.createElement('h3');
    title.textContent = 'Bookmarked Messages';
    title.style.textAlign = 'center';
    title.style.padding = '10px 0 20px 0';
    bookmarksModal.appendChild(title);

    if (bookmarked.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No bookmarked messages yet';
        p.style.textAlign = 'center';
        bookmarksModal.appendChild(p);
    } else {
        bookmarked.forEach(msg => {
            const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
            
            const item = document.createElement('div');
            item.className = 'bookmark-item';
            
            const span = document.createElement('span');
            span.style.flex = 1;
            span.textContent = preview;
            item.appendChild(span);
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = '📋';
            copyBtn.title = 'Copy';
            copyBtn.addEventListener('click', () => copyMessage(msg.content));
            item.appendChild(copyBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Delete Bookmark';
            deleteBtn.addEventListener('click', () => deleteBookmark(msg.id));
            item.appendChild(deleteBtn);

            bookmarksModal.appendChild(item);
        });
    }
    
    bookmarksModal.classList.add('active');
    modalOverlay.classList.add('active');
}

function deleteBookmark(msgId) {
    bookmarkedMessages.delete(msgId);
    saveBookmarks();
    showBookmarks();
}

function saveBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarkedMessages)));
}

function loadBookmarks() {
    const saved = localStorage.getItem('bookmarks');
    if (saved) {
        bookmarkedMessages = new Set(JSON.parse(saved));
        console.log('✅ Loaded', bookmarkedMessages.size, 'bookmarks');
    }
}

function closeBookmarksModal() {
    bookmarksModal.classList.remove('active');
    modalOverlay.classList.remove('active');
}

// === Feature 4: Conversation Branching ===
function forkConversation() {
    console.log('🔄 Forking conversation...');
    const branchName = prompt('Name this conversation branch:');
    if (branchName) {
        const branch = {
            name: branchName,
            history: JSON.parse(JSON.stringify(conversationHistory)),
            timestamp: Date.now(),
        };
        conversationBranches.push(branch);
        saveChatSession(); // Save updated branches list
        showNotification(`Branch "${branchName}" created!`);
        console.log('✅ Conversation branched:', branchName);
    }
}

function loadBranches() {
    const savedBranches = localStorage.getItem('conversationBranches');
    if (savedBranches) {
        try {
            conversationBranches = JSON.parse(savedBranches);
            console.log(`🌿 Loaded ${conversationBranches.length} conversation branches.`);
        } catch (e) {
            console.error('❌ Error loading conversation branches:', e);
            conversationBranches = [];
        }
    }
}

function loadBranch(history) {
    if (!confirm('Are you sure you want to load this branch? This will overwrite the current chat history.')) return;
    
    conversationHistory = history;
    messagesContainer.innerHTML = '';
    messagesList = [];
    pinnedMessages.clear();
    bookmarkedMessages.clear(); // Clear bookmarks as message IDs will change or become irrelevant
    
    conversationHistory.forEach(msg => {
        displayMessageImmediate(msg.content, msg.role);
    });
    scrollToBottom();
    saveChatSession();
    showNotification('Branch loaded successfully!');
    closeBookmarksModal();
}

function deleteBranch(index) {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    conversationBranches.splice(index, 1);
    saveChatSession(); // Save updated branches array
    showBranchesModal(); // Refresh modal
}

function showBranchesModal() {
    console.log('🌿 Opening branches modal...');
    closeActionMenu();
    
    const branches = conversationBranches;
    
    bookmarksModal.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h3 class="modal-title">Conversation History & Branches</h3>
        <button class="close-preview-btn" onclick="document.getElementById('bookmarksModal').classList.remove('active'); document.querySelector('.modal-overlay').classList.remove('active');">✕</button>
    `;
    bookmarksModal.appendChild(header);

    const content = document.createElement('div');
    content.style.padding = '12px 16px';
    
    if (branches.length === 0) {
        content.innerHTML = '<p style="text-align:center;">No saved branches yet. Use the "Fork Current Conversation" button below.</p>';
    } else {
        branches.forEach((branch, index) => {
            const item = document.createElement('div');
            item.className = 'bookmark-item branch-item';
            
            const span = document.createElement('span');
            span.style.flex = 1;
            span.textContent = `${branch.name} (${new Date(branch.timestamp).toLocaleTimeString()})`;
            item.appendChild(span);
            
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Load';
            loadBtn.title = 'Load Branch';
            loadBtn.className = 'toolbar-btn';
            loadBtn.addEventListener('click', () => loadBranch(branch.history));
            item.appendChild(loadBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Delete Branch';
            deleteBtn.className = 'toolbar-btn secondary';
            deleteBtn.addEventListener('click', () => deleteBranch(index));
            item.appendChild(deleteBtn);

            content.appendChild(item);
        });
    }

    const forkBtn = document.createElement('button');
    forkBtn.textContent = 'Fork Current Conversation';
    forkBtn.className = 'settings-action-btn secondary';
    forkBtn.style.marginTop = '10px';
    forkBtn.addEventListener('click', () => {
        closeBookmarksModal();
        forkConversation();
    });
    content.appendChild(forkBtn);
    
    bookmarksModal.appendChild(content);
    
    bookmarksModal.classList.add('active');
    modalOverlay.classList.add('active');
}

// === Feature 5: Code Auto-Execution ===
function showExecutionIndicator(text) {
    const indicator = document.createElement('div');
    indicator.className = 'execution-indicator';
    indicator.textContent = text;
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 3000);
}

// === Feature 6: Tone Selector ===
// Already integrated in handleSubmit above

// === Update model list with new models ===
function initializeModels() {
    console.log('📚 Initializing model options...');
    // Build a custom picker menu (replacing native select)
    if (!modelPickerMenu) return;
    modelPickerMenu.innerHTML = '';
    modelsRegistry.categories.forEach(cat => {
        const header = document.createElement('div');
        header.className = 'model-picker-item';
        header.style.fontWeight = '700';
        header.style.cursor = 'default';
        header.textContent = cat.label;
        modelPickerMenu.appendChild(header);
        cat.models.forEach(m => {
            const item = document.createElement('div');
            item.className = 'model-picker-item';
            item.setAttribute('data-model-id', m.id);
            item.setAttribute('role', 'menuitem');
            item.innerHTML = `<div>${m.label}</div><div class="meta">${m.intelligence || ''}</div>`;
            item.addEventListener('click', () => {
                selectedModel = m.id;
                modelPickerLabel.textContent = m.label;
                // update UI and runtime config
                updateModelStats(selectedModel);
                applyModelDefaults(selectedModel); // <-- apply per-model tone/temp defaults
                saveChatSession();
                // close menu
                modelPickerMenu.classList.remove('active');
                modelPickerMenu.setAttribute('aria-hidden','true');
                modelPickerToggle.focus();
                console.log('📌 Model selected via custom picker:', selectedModel);
            });
            modelPickerMenu.appendChild(item);
        });
    });
    // set initial label
    if (modelPickerLabel) modelPickerLabel.textContent = modelConfig[selectedModel]?.label || selectedModel;
    
    // Toggle behavior
    modelPickerToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = modelPickerMenu.classList.toggle('active');
        modelPickerMenu.setAttribute('aria-hidden', String(!isOpen));
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.model-picker')) {
            modelPickerMenu.classList.remove('active');
            modelPickerMenu.setAttribute('aria-hidden','true');
        }
    });
    
    // Recompute runtime simulation values for all models when initializing UI
    Object.keys(modelConfig).forEach(id => {
        modelConfig[id].thinkingDelayMs = getModelThinkingDelay(id);
        modelConfig[id].typingSpeedMs = getModelTypingSpeed(id);
    });

    updateModelStats(selectedModel);
    console.log('✅ Model options initialized with', Object.keys(modelConfig).length, 'models grouped into', modelsRegistry.categories.length, 'categories');
}

// === File Input Handlers ===
function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    console.log('📎 File selected:', file.name);
    const reader = new FileReader();
    reader.onload = () => {
        let html = '';
        if (file.type.startsWith('image/')) {
            html = `<div class="file-preview"><img src="${reader.result}" alt="${escapeHtml(file.name)}" /><div><strong>${escapeHtml(file.name)}</strong><div>${(file.size/1024).toFixed(1)} KB</div></div></div>`;
        } else {
            html = `<div class="file-preview"><div style="flex:1"><strong>${escapeHtml(file.name)}</strong><div>${file.type || 'File'}</div></div></div>`;
        }
        addMessage(html, 'assistant', true);
        conversationHistory.push({ role: 'assistant', content: html });
        saveChatSession();
        showNotification('File attached');
    };
    if (file.type.startsWith('image/')) reader.readAsDataURL(file);
    else reader.readAsText(file).catch(() => reader.readAsDataURL(file));
    // reset input
    e.target.value = '';
}

// === Edit Code feature: add an "Edit" button to code header output ===
// Removed duplicate parseCodeBlocks function to avoid "Identifier 'parseCodeBlocks' has already been declared" error.
// The original parseCodeBlocks implementation (earlier in this file) is used for parsing and rendering code blocks.

// === Open/close edit modal and persist edits back into messagesList and DOM ===
function openEditCodeModal(msgId, blockIndex) {
    const msg = messagesList.find(m => m.id === msgId);
    if (!msg || !msg.codeBlocks || !msg.codeBlocks[blockIndex]) return;
    currentEditing = { messageId: msgId, blockIndex };
    editCodeTextarea.value = msg.codeBlocks[blockIndex].code;
    editCodeModal.style.display = 'block';
    editCodeModal.setAttribute('aria-hidden', 'false');
}

function closeEditCodeModal() {
    currentEditing = null;
    editCodeModal.style.display = 'none';
    editCodeModal.setAttribute('aria-hidden', 'true');
}

function saveCodeEdit() {
    if (!currentEditing) return;
    const { messageId, blockIndex } = currentEditing;
    const newCode = editCodeTextarea.value;
    const msg = messagesList.find(m => m.id === messageId);
    if (!msg) return;
    // Update data model
    msg.codeBlocks[blockIndex].code = newCode;
    // Update conversationHistory content: replace the corresponding code block text inside message content
    // We'll reconstruct the assistant message content by replacing code blocks sequentially
    let original = msg.content;
    // naive replacement: find nth code fence in original and replace its inner code
    let idx = 0;
    const updated = original.replace(/```(\w*)\n([\s\S]*?)```/g, (full, lang, inner) => {
        if (idx === blockIndex) {
            idx++;
            return '```' + (lang || '') + '\n' + newCode + '\n```';
        } else {
            idx++;
            return full;
        }
    });
    msg.content = updated;
    // Update conversationHistory entries that match this message id/content
    conversationHistory = conversationHistory.map(c => {
        if (c.role === msg.role && c.content && c.content.includes(original)) {
            return { role: c.role, content: updated };
        }
        return c;
    });
    // Update DOM: find message element and replace code block content and highlighted HTML
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
        const { html, codeBlocks } = parseCodeBlocks(updated, true);
        const contentDiv = messageEl.querySelector('.message-content');
        contentDiv.innerHTML = html;
        // update stored codeBlocks for the message in messagesList (ensure index aligns)
        msg.codeBlocks = codeBlocks;
        animateTextBlocks(contentDiv);
    }
    saveChatSession();
    closeEditCodeModal();
    showNotification('Code updated');
}

// Wire up modal close, format and run (lightweight helpers)
document.addEventListener('DOMContentLoaded', () => {
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const formatCodeBtn = document.getElementById('formatCodeBtn');
    const runCodeBtn = document.getElementById('runCodeBtn');

    // NEW: output pane element for edit modal logs
    let editOutput = document.getElementById('editOutput');
    if (!editOutput) {
        editOutput = document.createElement('div');
        editOutput.id = 'editOutput';
        editOutput.className = 'edit-output';
        // append after textarea inside modal if possible
        const textarea = document.getElementById('editCodeTextarea');
        if (textarea && textarea.parentNode) {
            textarea.parentNode.insertBefore(editOutput, textarea.nextSibling);
        } else {
            // fallback: append to modal
            const modal = document.getElementById('editCodeModal');
            if (modal) modal.appendChild(editOutput);
        }
    }

    // helper to append colored logs
    function appendEditOutput(level, msg) {
        const line = document.createElement('div');
        line.className = `log ${level}`;
        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.textContent = level.toUpperCase();
        const text = document.createElement('div');
        text.innerHTML = escapeHtml(msg);
        line.appendChild(badge);
        line.appendChild(text);
        editOutput.appendChild(line);
        // keep scroll at bottom
        editOutput.scrollTop = editOutput.scrollHeight;
    }

    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditCodeModal);
    if (formatCodeBtn) formatCodeBtn.addEventListener('click', () => {
        // Simple heuristic formatting simulation
        const originalValue = editCodeTextarea.value;
        let formattedValue = originalValue;

        // 1. Normalize tabs to spaces (4 spaces)
        formattedValue = formattedValue.replace(/\t/g, '    ');
        
        // 2. Remove multiple empty lines
        formattedValue = formattedValue.replace(/(\n\s*){3,}/g, '\n\n');
        
        // 3. Trim trailing whitespace on lines
        formattedValue = formattedValue.split('\n').map(l => l.replace(/\s+$/,'')).join('\n');

        // 4. Basic JSON indentation simulation
        try {
            const trimmed = formattedValue.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                formattedValue = JSON.stringify(JSON.parse(trimmed), null, 2);
            }
        } catch (e) {
            // Ignore JSON parse errors if it's not JSON
        }
        
        editCodeTextarea.value = formattedValue;
        
        // Check if formatting actually changed anything
        if (originalValue !== formattedValue) {
            appendEditOutput('info', 'Code professionally formatted using simulated Prettier rules (indentation, whitespace cleanup).');
        } else {
             appendEditOutput('warning', 'Formatting applied, but no significant changes detected.');
        }
        showNotification('Formatted code');
    });
    if (runCodeBtn) runCodeBtn.addEventListener('click', () => {
        // attempt to run as HTML preview using current editing content
        if (!currentEditing) {
            appendEditOutput('warning', 'No code selected for execution. Running as standalone HTML preview.');
        }
        const userCode = editCodeTextarea.value;
        // Basic quick validation: detect script errors by attempting to eval simple JS-only blocks
        try {
            // create combined HTML and open preview
            const html = combineAllInOne([{ lang: 'html', code: userCode }]);
            appendEditOutput('info', 'Opening preview...');
            openPreview(html, 'html');
            appendEditOutput('info', 'Preview opened successfully.');
        } catch (err) {
            console.error('Run error:', err);
            appendEditOutput('error', `Execution error: ${err.message || err}`);
            showNotification('Error running code. See output for details.');
        }
    });

    // expose append function for other areas if needed
    window.appendEditOutput = appendEditOutput;
});

// Ensure we only call focus if the element was successfully queried
if (messageInput && typeof messageInput.focus === 'function') {
    messageInput.focus();
}

// Update the Model Stats UI from the modelConfig lookup
function updateModelStats(modelId) {
    if (!modelId || !modelConfig) return;
    const elInt = document.getElementById('stat-intelligence');
    const elThink = document.getElementById('stat-think');
    const elTyping = document.getElementById('stat-typing');
    const elJitter = document.getElementById('stat-jitter');
    const elDesc = document.getElementById('stat-desc');

    const cfg = modelConfig[modelId] || {};
    const intelligence = cfg.intelligence || '—';
    const minThink = cfg.minThink || cfg.minThink === 0 ? cfg.minThink : '—';
    const maxThink = cfg.maxThink || cfg.maxThink === 0 ? cfg.maxThink : null;
    const baseTyping = cfg.baseTyping || '—';
    const typingJitter = cfg.typingJitter || '—';
    const desc = cfg.description || '—';

    // Prefer showing the computed runtime simulated metrics if available
    const computedThink = cfg.thinkingDelayMs ? `${cfg.thinkingDelayMs} ms (sim)` : (maxThink ? `${minThink} – ${maxThink} ms` : `${minThink} ms`);
    const computedTyping = cfg.typingSpeedMs ? `${cfg.typingSpeedMs} ms/word (sim)` : (baseTyping !== '—' ? `${baseTyping} ms/word` : '—');

    if (elInt) elInt.textContent = intelligence;
    if (elThink) elThink.textContent = computedThink;
    if (elTyping) elTyping.textContent = computedTyping;
    if (elJitter) elJitter.textContent = (typingJitter !== '—' ? `${typingJitter} ms` : '—');
    if (elDesc) elDesc.textContent = desc;
    
    // NEW: Show Titan usage if model is Titan
    const usageBadgeContainer = document.querySelector('.model-stats');
    let usageBadge = usageBadgeContainer?.querySelector('.titan-usage-badge');
    if (usageBadgeContainer) {
        if (!usageBadge) {
            usageBadge = document.createElement('div');
            usageBadge.className = 'titan-usage-badge';
            usageBadgeContainer.appendChild(usageBadge);
        }
        if (modelId === 'tee-titan-6-ultra-max') {
            const now = Date.now();
            if (now >= titanUsageData.resetTime) {
                titanUsageData.count = 0;
                titanUsageData.resetTime = now + TITAN_RESET_INTERVAL;
            }
            const remaining = TITAN_MAX_USES - titanUsageData.count;
            const timeUntilReset = Math.ceil((titanUsageData.resetTime - now) / 60000);
            usageBadge.textContent = `⚡ Uses: ${titanUsageData.count}/${TITAN_MAX_USES} | Resets in ${timeUntilReset}m`;
            usageBadge.className = remaining === 0 ? 'titan-usage-badge full' : 'titan-usage-badge';
        } else if (modelId === 'tee-titan-6s-ultra-max') {
            const now = Date.now();
            if (now >= titanSUsageData.resetTime) {
                titanSUsageData.count = 0;
                titanSUsageData.resetTime = now + TITAN_S_RESET_INTERVAL;
            }
            const remaining = TITAN_S_MAX_USES - titanSUsageData.count;
            const timeUntilReset = Math.ceil((titanSUsageData.resetTime - now) / 60000);
            usageBadge.textContent = `⚡ S+: ${titanSUsageData.count}/${TITAN_S_MAX_USES} | Resets in ${timeUntilReset}m`;
            usageBadge.className = remaining === 0 ? 'titan-usage-badge full' : 'titan-usage-badge';
        } else {
            usageBadge.remove();
        }
    }
}

function saveTitanUsage() {
    localStorage.setItem('titanUsageData', JSON.stringify(titanUsageData));
}

function loadTitanUsage() {
    const saved = localStorage.getItem('titanUsageData');
    if (saved) {
        try {
            titanUsageData = JSON.parse(saved);
            // Reset if hour has passed
            if (Date.now() >= titanUsageData.resetTime) {
                titanUsageData.count = 0;
                titanUsageData.resetTime = Date.now() + TITAN_RESET_INTERVAL;
                saveTitanUsage();
            }
            console.log('⚡ Titan usage loaded:', titanUsageData);
        } catch (e) {
            console.error('Error loading Titan usage:', e);
        }
    }
}

// Save/load helpers for Titan S variant
function saveTitanSUsage() {
    localStorage.setItem('titanSUsageData', JSON.stringify(titanSUsageData));
}

function loadTitanSUsage() {
    const saved = localStorage.getItem('titanSUsageData');
    if (saved) {
        try {
            titanSUsageData = JSON.parse(saved);
            if (Date.now() >= titanSUsageData.resetTime) {
                titanSUsageData.count = 0;
                titanSUsageData.resetTime = Date.now() + TITAN_S_RESET_INTERVAL;
                saveTitanSUsage();
            }
            console.log('⚡ Titan S usage loaded:', titanSUsageData);
        } catch (e) {
            console.error('Error loading Titan S usage:', e);
        }
    }
}

function toggleFullscreen() {
    const container = document.querySelector('.chat-container');
    if (!container) return;
    // Use Fullscreen API when available
    if (!isFullscreen) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(()=>{});
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        }
        container.classList.add('fullscreen');
        fullscreenBtn.textContent = '🡽';
        isFullscreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(()=>{});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        container.classList.remove('fullscreen');
        fullscreenBtn.textContent = '⛶';
        isFullscreen = false;
    }
}

// Keep UI synced if user exits fullscreen with ESC or browser controls
document.addEventListener('fullscreenchange', () => {
    const container = document.querySelector('.chat-container');
    if (!document.fullscreenElement) {
        container && container.classList.remove('fullscreen');
        if (fullscreenBtn) fullscreenBtn.textContent = '⛶';
        isFullscreen = false;
    }
});

function toggleFocusMode() {
    const container = document.querySelector('.chat-container');
    if (!container) return;
    focusMode = !focusMode;
    if (focusMode) {
        container.classList.add('focus-mode');
        showNotification('Focus mode enabled — press Ctrl/Cmd+K to toggle.');
    } else {
        container.classList.remove('focus-mode');
        showNotification('Focus mode disabled.');
    }
}

// Interrupt/cancel ongoing generation
function interruptGeneration() {
    if (!isGenerating) {
        showNotification('No generation to interrupt');
        return;
    }
    generationCanceled = true;
    isGenerating = false;
    console.log('⏹️ interruptGeneration called — generationCanceled set to true, will stop current thinking/typing loop'); // NEW log
    // remove loading indicator if exists
    if (currentLoadingId) {
        removeLoadingMessage(currentLoadingId);
        currentLoadingId = null;
    }
    updateStatusIndicator(''); // Ensure indicator is hidden when interrupted
    showNotification('Generation interrupted');
}

// Helper to update the status indicator UI
function updateStatusIndicator(status, time = 0) {
    if (!statusIndicator) return;
    
    if (status === '') {
        statusIndicator.classList.remove('active', 'thinking', 'typing');
        statusIndicator.style.width = '0%';
        statusIndicator.style.transitionDuration = '0s';
        return;
    }
    
    statusIndicator.className = 'status-indicator active';
    statusIndicator.setAttribute('data-status', status);
    statusIndicator.style.width = '0%'; // Reset width

    if (status.startsWith('Thinking')) {
        statusIndicator.classList.add('thinking');
        // Simulate progress bar filling up over the thinking time
        statusIndicator.style.transitionDuration = `${time / 1000}s`;
        setTimeout(() => {
            if (statusIndicator.classList.contains('thinking')) {
                statusIndicator.style.width = '100%';
            }
        }, 50);
    } else if (status.startsWith('Typing')) {
        statusIndicator.classList.remove('thinking');
        statusIndicator.classList.add('typing');
        // Set fixed width during typing to keep the line visible
        statusIndicator.style.width = '100%'; 
        statusIndicator.style.transitionDuration = '0s';
    }
}

// === Multi-Message Selection Handlers ===

// Handler for message clicks (for selection mode)
function handleMessageClick(e) {
    if (!selectionMode) return;
    
    // Check if the click originated from inside a message-action button (to prevent double handling if action buttons are clicked)
    if (e.target.closest('.message-action-btn') || e.target.closest('.code-box')) return;
    
    const messageEl = e.target.closest('.message');
    if (!messageEl) return;
    
    const msgId = messageEl.id;
    
    // Prevent selecting the initial welcome message if it doesn't have a proper ID, but usually it should.
    if (!msgId || msgId.startsWith('loading')) return; 
    
    const checkbox = messageEl.querySelector('.message-checkbox');

    if (selectedMessages.has(msgId)) {
        selectedMessages.delete(msgId);
        messageEl.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
    } else {
        selectedMessages.add(msgId);
        messageEl.classList.add('selected');
        if (checkbox) checkbox.checked = true;
    }
    
    updateBatchActionsBar();
}

function toggleSelectionMode() {
    selectionMode = !selectionMode;
    messagesContainer.classList.toggle('selection-mode', selectionMode);
    selectedMessages.clear();
    
    document.querySelectorAll('.message').forEach(el => {
        el.classList.remove('selected');
        const checkbox = el.querySelector('.message-checkbox');
        if (checkbox) checkbox.checked = false;
    });

    selectToggleBtn.textContent = selectionMode ? '❌' : '✅';
    updateBatchActionsBar();
}

function updateBatchActionsBar() {
    const count = selectedMessages.size;
    document.getElementById('selectedCount').textContent = `${count} selected`;

    if (count > 0 && selectionMode) {
        batchActionBar.classList.add('active');
    } else {
        batchActionBar.classList.remove('active');
    }
}

function getSelectedMessageData() {
    return messagesList.filter(m => selectedMessages.has(m.id))
                       .sort((a, b) => a.id.localeCompare(b.id)); // Sort chronologically
}

function batchCopy() {
    const selected = getSelectedMessageData();
    if (selected.length === 0) return;
    
    const text = selected.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    showNotification(`Copied ${selected.length} messages!`);
    toggleSelectionMode(); // Exit selection mode
}

function batchDelete() {
    const selected = getSelectedMessageData();
    if (selected.length === 0) return;
    
    // Use the shake animation on the action bar for confirmation feedback
    batchActionBar.style.animation = 'shake 0.5s ease-in-out'; // Increased duration for stronger effect
    setTimeout(() => {
        batchActionBar.style.animation = 'none';
    }, 500); 

    if (!confirm(`Are you sure you want to delete ${selected.length} messages?`)) return;

    // Delete one by one, updating UI and data structures
    selected.forEach(msg => {
        const messageDiv = document.getElementById(msg.id);
        if (messageDiv) deleteMessage(messageDiv, msg.id);
    });
    
    toggleSelectionMode();
    showNotification(`Deleted ${selected.length} messages.`);
}

function batchExport() {
    const selected = getSelectedMessageData();
    if (selected.length === 0) return;
    
    const exportData = {
        timestamp: new Date().toISOString(),
        conversationTitle: conversationTitle + ' (Selection)',
        selectedMessages: selected.map(m => ({ role: m.role, content: m.content })),
    };
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${selected.length}-msgs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`Exported ${selected.length} messages.`);
    toggleSelectionMode();
}

// AIpedia: Populate modal with model reference and search
function populateAipedia(query = '') {
    if (!aipediaContent) return;
    aipediaContent.innerHTML = '';
    const q = (query || '').toLowerCase().trim();
    const entries = [];
    Object.keys(modelConfig).forEach(id => {
        const m = modelConfig[id];
        if (!m) return;
        const text = `${m.label} ${m.description} ${m.intelligence || ''}`.toLowerCase();
        if (q && !text.includes(q)) return;
        entries.push({ id, label: m.label, desc: m.description, intel: m.intelligence, plan: m.plan });
    });
    // Always show Titan quick-help at top
    const titanHelp = document.createElement('div');
    titanHelp.className = 'model-entry';
    titanHelp.innerHTML = `<div class="title">AIpedia — Quick Help</div>
        <div class="meta">Use AIpedia to learn about models, usage limits, and tips. Click any entry for details. Tip: tee Titan models have hourly usage limits enforced by the app.</div>`;
    aipediaContent.appendChild(titanHelp);

    if (entries.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No results.';
        aipediaContent.appendChild(p);
        return;
    }

    entries.sort((a,b)=>a.label.localeCompare(b.label)).forEach(e => {
        const div = document.createElement('div');
        div.className = 'model-entry';
        div.setAttribute('data-model-id', e.id);
        const reqPlanText = e.plan ? ` <strong style="color:var(--accent);">[Requires: ${e.plan.toUpperCase()}]</strong>` : '';
        div.innerHTML = `<div class="title">${escapeHtml(e.label)}${reqPlanText}</div>
                         <div class="meta">${escapeHtml(e.desc)} — Intelligence: ${escapeHtml(e.intel || '—')}</div>
                         <div style="margin-top:8px;"><button class="settings-action-btn" data-model="${e.id}">Select Model</button>
                         <button class="preview-button" style="margin-left:8px;" data-model="${e.id}">Info</button></div>`;
 
        // Select button
        const selectBtn = div.querySelector('.settings-action-btn');
        selectBtn?.addEventListener('click', (ev) => {
            const mid = ev.target.getAttribute('data-model');
            const meta = modelConfig[mid] || {};
            // enforce plan requirement
            if (meta.plan && meta.plan !== 'free' && (!currentPlan || (meta.plan === 'pro' && currentPlan === 'free') || (meta.plan === 'titan' && currentPlan !== 'titan'))) {
                showNotification(`This model requires the ${meta.plan.toUpperCase()} plan. Open Plans to upgrade.`);
                return;
            }
            selectedModel = mid;
            modelPickerLabel.textContent = modelConfig[selectedModel]?.label || selectedModel;
            updateModelStats(selectedModel);
            applyModelDefaults(selectedModel);
            saveChatSession();
            showNotification(`Model switched to ${modelPickerLabel.textContent}`);
            closeAipediaModal();
        });

         // Info button opens a quick details message in the chat
         div.querySelector('.preview-button')?.addEventListener('click', (ev) => {
             const mid = ev.target.getAttribute('data-model');
             const m = modelConfig[mid];
             if (!m) return;
             const planReq = m.plan ? `<br><em>Plan Requirement:</em> ${m.plan.toUpperCase()}` : '';
             const infoHtml = `<strong>${escapeHtml(m.label)}</strong><br>${escapeHtml(m.description)}${planReq}<br><em>Intelligence:</em> ${escapeHtml(m.intelligence || '—')}<br><em>Think:</em> ${m.minThink}–${m.maxThink} ms<br><em>Typing (base):</em> ${m.baseTyping} ms/word`;
             addMessage(infoHtml, 'assistant', true);
             conversationHistory.push({ role: 'assistant', content: infoHtml });
             saveChatSession();
             closeAipediaModal();
         });

        aipediaContent.appendChild(div);
    });
}

function openAipedia() {
    if (!aipediaModal) return;
    aipediaModal.classList.add('active');
    aipediaModal.style.display = 'block';
    modalOverlay.classList.add('active');
    if (aipediaSearch) {
        aipediaSearch.value = '';
        aipediaSearch.focus();
    }
    populateAipedia();
}

function closeAipediaModal() {
    if (!aipediaModal) return;
    aipediaModal.classList.remove('active');
    aipediaModal.style.display = 'none';
    modalOverlay.classList.remove('active');
}

function filterAipedia(e) {
    const q = e.target.value || '';
    populateAipedia(q);
}

// New: Ask the selected AI model to fix the given code snippet, then update DOM + message state
async function fixCodeByAI(codeText, language = 'javascript', codeBoxElement) {
    if (!codeText || !codeBoxElement) {
        showNotification('No code available to fix.');
        return;
    }

    // Simple guard: prevent multiple concurrent fixes on same box
    if (codeBoxElement._fixInProgress) {
        showNotification('Auto-fix already in progress for this block.');
        return;
    }
    codeBoxElement._fixInProgress = true;
    showNotification('Requesting AI to fix the code...');

    try {
        // Build a focused system prompt instructing the AI to fix syntax errors without changing behavior,
        // and return only the corrected code block inside triple backticks with the same language tag.
        const systemInstruction = `You are a code repair assistant. Inspect the provided ${language.toUpperCase()} code, fix any syntax errors and obvious runtime issues, avoid changing intended logic where possible, and output ONLY the corrected code inside a single code fence labeled with the appropriate language (e.g., \`\`\`${language}\n...code...\n\`\`\`). Do not include explanations.`;

        const userMessage = `Please fix this ${language} code:\n\`\`\`${language}\n${codeText}\n\`\`\``;

        // Show small loading indicator in the badge and console
        console.log('🛠️ Sending code to model for auto-fix...');

        // Use the same chat completion call used elsewhere (websim)
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userMessage },
            ],
            temperature: Math.max(0.0, Math.min(0.6, temperature * 0.8)), // bias toward low-creative deterministic fix
            model: selectedModel, // prefer the currently selected model
        });

        let fixed = completion.content || '';
        console.log('🛠️ Auto-fix response received:', fixed.substring(0, 120));

        // Extract the code inside the first code fence if present
        const fenceMatch = fixed.match(/```(?:\w*)\n([\s\S]*?)```/);
        const fixedCode = fenceMatch ? fenceMatch[1].trim() : fixed.trim();

        if (!fixedCode) {
            showNotification('AI returned no fixed code.');
            appendEditOutput && appendEditOutput('error', 'AI returned no code to replace the block.');
            codeBoxElement._fixInProgress = false;
            return;
        }

        // Update the code DOM element (preserving syntax highlighting preferences)
        const codeEl = codeBoxElement.querySelector('.code-content');
        if (codeEl) {
            // If highlighting enabled, attempt to re-highlight; otherwise escape
            let rendered = '';
            if (isHighlightingEnabled) {
                try {
                    const hlLang = (language && hljs.getLanguage(language)) ? language : undefined;
                    rendered = hlLang ? hljs.highlight(fixedCode, { language: hlLang, ignoreIllegals: true }).value : hljs.highlightAuto(fixedCode).value;
                } catch (e) {
                    rendered = escapeHtml(fixedCode);
                }
            } else {
                rendered = escapeHtml(fixedCode);
            }
            // Replace content
            codeEl.textContent = fixedCode;
            // Overwrite innerHTML only for highlighted markup
            if (isHighlightingEnabled) {
                codeEl.innerHTML = rendered;
            }
            // Remove any existing error badge(s) once fixed
            const existingBadge = codeBoxElement.querySelector('.error-badge');
            if (existingBadge) existingBadge.remove();

            // Update the underlying message data in messagesList so exports/edits stay consistent
            // Find parent message element and its id
            const messageEl = codeBoxElement.closest('.message');
            if (messageEl) {
                const msgId = messageEl.id;
                const msgData = messagesList.find(m => m.id === msgId);
                if (msgData && Array.isArray(msgData.codeBlocks)) {
                    // attempt to find matching block by code content presence (best-effort)
                    let foundIdx = -1;
                    for (let i = 0; i < msgData.codeBlocks.length; i++) {
                        // match by language and a snippet of original text
                        if ((msgData.codeBlocks[i].lang || '').toLowerCase() === (language || '').toLowerCase()) {
                            foundIdx = i;
                            break;
                        }
                    }
                    if (foundIdx === -1) foundIdx = 0;
                    msgData.codeBlocks[foundIdx].code = fixedCode;

                    // Also rewrite the assistant message content stored in conversationHistory where applicable.
                    // We reconstruct the assistant message content by sequentially replacing code fences.
                    let original = msgData.content || '';
                    let idxReplace = 0;
                    const updated = original.replace(/```(\w*)\n([\s\S]*?)```/g, (full, langCap, inner) => {
                        if (idxReplace === foundIdx) {
                            idxReplace++;
                            return '```' + (langCap || language) + '\n' + fixedCode + '\n```';
                        } else {
                            idxReplace++;
                            return full;
                        }
                    });
                    msgData.content = updated;

                    // Update conversationHistory entries to keep persistence accurate
                    conversationHistory = conversationHistory.map(c => {
                        if (c.role === msgData.role && c.content && c.content.includes(original)) {
                            return { role: c.role, content: updated };
                        }
                        return c;
                    });

                    saveChatSession();
                }
            }

            appendEditOutput && appendEditOutput('info', `AI fixed code (${language}).`);
            showNotification('AI fixed the code block.');
        } else {
            showNotification('Could not update code block in the UI.');
            appendEditOutput && appendEditOutput('warning', 'Could not locate .code-content element to update.');
        }
    } catch (err) {
        console.error('❌ Auto-fix error:', err);
        appendEditOutput && appendEditOutput('error', `Auto-fix failed: ${err.message || err}`);
        showNotification('Auto-fix failed. See logs.');
    } finally {
        codeBoxElement._fixInProgress = false;
    }
}

function appendPreviewConsoleLine(level, message) {
    if (!previewConsoleBody) return;
    const line = document.createElement('div');
    const lvl = document.createElement('span');
    const msg = document.createElement('span');
    line.className = `line ${level}`;
    lvl.className = 'lvl';
    lvl.textContent = level.toUpperCase();
    msg.textContent = message;
    line.appendChild(lvl);
    line.appendChild(msg);
    previewConsoleBody.appendChild(line);
    previewConsoleBody.scrollTop = previewConsoleBody.scrollHeight;
}

function applySavedBackgroundColor() {
    const saved = localStorage.getItem('bgColor');
    if (saved) {
        setCustomBackground(saved);
        if (bgColorInput) bgColorInput.value = saved;
    } else {
        if (bgColorInput) bgColorInput.value = '#ffffff';
    }
}

function setCustomBackground(color) {
    if (!color) {
        document.documentElement.style.removeProperty('--bg-primary');
        document.documentElement.style.removeProperty('--bg-secondary');
        return;
    }
    // Derive a subtle secondary shade
    document.documentElement.style.setProperty('--bg-primary', color);
    try {
        // simple lighten for secondary
        const sec = lightenHex(color, 0.06);
        document.documentElement.style.setProperty('--bg-secondary', sec);
    } catch {
        document.documentElement.style.setProperty('--bg-secondary', color);
    }
}

function lightenHex(hex, amt=0.1){
    const h = hex.replace('#','');
    const bigint = parseInt(h,16);
    let r = (bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
    r = Math.min(255, Math.round(r + (255-r)*amt));
    g = Math.min(255, Math.round(g + (255-g)*amt));
    b = Math.min(255, Math.round(b + (255-b)*amt));
    return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

// New functions for Plans UI
function openPlansModal() {
    if (!plansModal) return;
    populatePlans();
    plansModal.classList.add('active');
    plansModal.style.display = 'block';
    modalOverlay.classList.add('active');
}

function closePlansModal() {
    if (!plansModal) return;
    plansModal.classList.remove('active');
    plansModal.style.display = 'none';
    modalOverlay.classList.remove('active');
}

function populatePlans() {
    if (!plansContent) return;
    const plans = [
        { id: 'free', name: 'Free', price: 'Free', tagline: 'Basic access', features: ['Access to core models', 'Limited daily usage', 'Community support'] },
        { id: 'pro', name: 'Pro', price: '$9/mo', tagline: 'For power users', features: ['Higher rate limits', 'Priority queue', 'Access to GPT-5 Mini & Gemini 2.5'] , recommended: true},
        { id: 'titan', name: 'Titan', price: '$49/mo', tagline: 'Advanced — Titan access', features: ['Access to tee Titan models (quota-limited)', 'Higher concurrency', 'Advanced code tools'], premium: true}
    ];
    plansContent.innerHTML = '';
    plans.forEach(p => {
        const div = document.createElement('div');
        div.className = 'plan-card' + (p.recommended ? ' best' : '');
        div.innerHTML = `
            <div class="plan-header">
                <div>
                    <div style="font-weight:700">${escapeHtml(p.name)}</div>
                    <div style="font-size:13px;color:var(--text-secondary)">${escapeHtml(p.tagline)}</div>
                </div>
                <div class="plan-price">${escapeHtml(p.price)}</div>
            </div>
            <div class="plan-features">${p.features.map(f => `<div>• ${escapeHtml(f)}</div>`).join('')}</div>
            <div class="plan-actions">
                <button class="settings-action-btn" data-plan="${p.id}">${currentPlan === p.id ? 'Current' : 'Subscribe'}</button>
                <button class="preview-button" data-plan-info="${p.id}">Info</button>
            </div>
        `;
        plansContent.appendChild(div);

        const subscribeBtn = div.querySelector('.settings-action-btn');
        subscribeBtn.addEventListener('click', () => {
            if (currentPlan === p.id) {
                showNotification('You already have this plan.');
                return;
            }
            // Simple simulated subscription flow
            if (confirm(`Subscribe to ${p.name} (${p.price})?`)) {
                currentPlan = p.id;
                localStorage.setItem('selectedPlan', currentPlan);
                showNotification(`Subscribed to ${p.name}`);
                // Visual feedback: update buttons
                populatePlans();
                updatePlanBadge();
            }
        });

        const infoBtn = div.querySelector('.preview-button');
        infoBtn.addEventListener('click', () => {
            const infoHtml = `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.tagline)}<br><em>Price:</em> ${escapeHtml(p.price)}<br>${p.features.map(f=>`• ${escapeHtml(f)}`).join('<br>')}`;
            addMessage(infoHtml, 'assistant', true);
            conversationHistory.push({ role: 'assistant', content: infoHtml });
            saveChatSession();
            closePlansModal();
        });
    });
}

function loadSavedPlan() {
    const saved = localStorage.getItem('selectedPlan');
    if (saved) {
        currentPlan = saved;
        updatePlanBadge();
        console.log('💳 Loaded saved plan:', currentPlan);
    }
}

function updatePlanBadge() {
    // show a small badge next to Plans button when subscribed to something other than 'free'
    const btn = document.getElementById('plansBtn');
    if (!btn) return;
    let badge = btn.querySelector('.plan-badge');
    if (currentPlan && currentPlan !== 'free') {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'plan-badge';
            badge.style.marginLeft = '8px';
            btn.appendChild(badge);
        }
        badge.textContent = currentPlan === 'pro' ? 'PRO' : 'TITAN';
    } else {
        if (badge) badge.remove();
    }
}

// NEW: Load saved preferred code language
const savedLang = localStorage.getItem('preferredCodeLang') || 'javascript';
preferredCodeLang = savedLang;
if (codeLangSelect) codeLangSelect.value = savedLang;
// Ensure system language select is set on module load (fallback)
if (!systemLanguageSelect) {
    const savedSys = localStorage.getItem('systemLanguage') || systemLanguage;
    document.documentElement.lang = savedSys || 'en';
}