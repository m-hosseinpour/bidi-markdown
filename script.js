/**
 * Main Application Script - Markdown Renderer
 * 
 * This is the main JavaScript file that handles all user interactions and application logic.
 * 
 * Key Features:
 * - Multi-file tab system for managing multiple documents
 * - Real-time markdown rendering with debouncing
 * - Theme switching (light/dark mode)
 * - Text direction controls (LTR/RTL)
 * - Markdown toolbar with formatting shortcuts
 * - Local storage persistence for user preferences
 * - Copy functionality with HTML styling preservation
 * - Responsive design adaptations
 * - Auto-render toggle with manual render option
 * - Full-height mode for immersive editing
 * 
 * Architecture:
 * - Event-driven with delegation for dynamic content
 * - Modular functions for specific features
 * - Debounced operations for performance
 * - Local storage integration for persistence
 * - Bootstrap integration for UI components
 * 
 * @author Matin KG
 * @version 1.0.0
 * @license MIT
 */

// Import application styles
import './style.css';
// Import the markdown rendering function
import { render } from './src/markdown/renderer.js';
// Import GitHub integration modules
import { GitHubAPI, GitHubSyncManager } from './src/github/github-integration.js';
// Import highlight.js themes as inline CSS for dynamic loading
import hljsThemeLight from 'highlight.js/styles/github.css?inline';
import hljsThemeDark from 'highlight.js/styles/github-dark.css?inline';
// Import markdown test file as a raw string
import markdownTestContent from './markdown-test.md?raw';

/**
 * Main application initialization
 * Waits for DOM to be fully loaded before setting up the application
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * DOM Element References
     * Cache all frequently accessed DOM elements for performance
     */
    
    // Core editor elements
    const markdownInput = document.getElementById('markdown-input');        // Main textarea for markdown input
    const markdownOutput = document.getElementById('markdown-output');      // Output div for rendered markdown
    
    // Layout and column controls
    const toggleInputSwitch = document.getElementById('toggleInputSwitch'); // Toggle to show/hide input panel
    const inputColumn = document.getElementById('input-column');            // Left column container
    const outputColumn = document.getElementById('output-column');          // Right column container
    
    // Theme and appearance controls
    const themeSwitch = document.getElementById('themeSwitch');             // Dark/light mode toggle
    const themeSwitchLabel = document.querySelector('label[for="themeSwitch"]'); // Theme switch label for icon updates
    const rootElement = document.documentElement;                           // HTML root for theme attributes
    const fullHeightModeSwitch = document.getElementById('fullHeightModeSwitch'); // Full viewport height toggle
    
    // Rendering controls
    const autoRenderSwitch = document.getElementById('autoRenderSwitch');   // Auto-render toggle
    const manualRenderButton = document.getElementById('manualRenderButton'); // Manual render button
    const mathOnBtn = document.getElementById('mathOnBtn');
    const mathOffBtn = document.getElementById('mathOffBtn');
    
    // Text direction controls
    const textDirLtrBtn = document.getElementById('textDirLtrBtn');         // LTR text direction button
    const textDirRtlBtn = document.getElementById('textDirRtlBtn');         // RTL text direction button
    const inlineCodeDirLtrBtn = document.getElementById('inlineCodeDirLtrBtn'); // Inline code LTR button
    const inlineCodeDirRtlBtn = document.getElementById('inlineCodeDirRtlBtn'); // Inline code RTL button
    const codeDirLtrBtn = document.getElementById('codeDirLtrBtn');         // Code block LTR button
    const codeDirRtlBtn = document.getElementById('codeDirRtlBtn');         // Code block RTL button
    
    // Toolbar and utility elements
    const markdownToolbar = document.getElementById('markdown-toolbar');    // Formatting toolbar
    const charCountSpan = document.getElementById('char-count');            // Character count display
    const wordCountSpan = document.getElementById('word-count');            // Word count display
    const copyOutputBtn = document.getElementById('copyOutputBtn');         // Copy output button
    const pageLoader = document.getElementById('page-loader');              // Initial page loader overlay
    
    // File management elements
    const fileTabsContainer = document.getElementById('file-tabs-container'); // File tabs container
    const fileTabsList = document.querySelector('.tab-list');               // Scrollable tabs list
    const addTabBtn = document.getElementById('add-tab-btn');               // Add new file button
    const renameFileModal = document.getElementById('renameFileModal');     // Rename modal dialog
    const fileNameInput = document.getElementById('fileNameInput');         // Rename input field
    const confirmRenameBtn = document.getElementById('confirmRenameBtn');   // Rename confirm button

    /**
     * Application State Variables
     * These variables maintain the current state of the application
     */
    
    // Rendering and display preferences
    let isAutoRenderEnabled = true;          // Whether to render markdown automatically on input
    let isMathRenderEnabled = true;
    let currentTextDirection = 'ltr';        // Current text direction (ltr/rtl)
    let currentInlineCodeDirection = 'ltr';  // Current inline code direction
    let currentCodeDirection = 'ltr';        // Current code block direction
    let isFullHeightModeEnabled = false;     // Whether full-height mode is active

    // File management state
    let files = {};                          // Object storing all file data {id: {id, name, content}}
    let activeFileId = null;                 // ID of currently active/selected file

    /**
     * UI Synchronization Functions
     */
    
    /**
     * Synchronizes header heights between input and output columns
     * Ensures both column headers have the same height for visual alignment
     * Called on window resize and layout changes
     */
    function syncHeaderHeights() {
        const tabsHeader = document.getElementById('file-tabs-container');
        const dirHeader = document.getElementById('direction-controls-container');
        if (!tabsHeader || !dirHeader) return;
        
        // Reset heights to natural values
        tabsHeader.style.height = '';
        dirHeader.style.height = '';
        
        // Calculate maximum height and apply to both
        const maxH = Math.max(tabsHeader.offsetHeight, dirHeader.offsetHeight);
        tabsHeader.style.height = `${maxH}px`;
        dirHeader.style.height = `${maxH}px`;
    }

    /**
     * Gracefully hides the page loader overlay once initialization completes
     * Ensures the transition runs only once and removes the element afterwards
     */
    function hidePageLoader() {
        if (!pageLoader || pageLoader.classList.contains('is-hidden')) {
            return;
        }

        document.body.classList.remove('loading');
        pageLoader.classList.add('is-hidden');

        setTimeout(() => {
            pageLoader?.remove();
        }, 600);
    }

    /**
     * File Management Functions
     * Handle creation, deletion, and management of multiple markdown files
     */

    /**
     * Generates a unique ID for new files based on timestamp
     * Ensures no ID conflicts by incrementing if timestamp already exists
     * 
     * @returns {number} Unique file identifier
     */
    function generateUniqueFileId() {
        let id = Date.now();
        // Handle rare case where multiple files created in same millisecond
        while (files[id]) {
            id++;
        }
        return id;
    }

    /**
     * Creates a new file object and adds it to the files collection
     * 
     * @param {string|null} name - Optional file name (defaults to 'New File')
     * @param {string} content - Initial content for the file (defaults to empty)
     * @returns {number} The ID of the newly created file
     */
    function createNewFile(name = null, content = '') {
        const id = generateUniqueFileId();
        const fileName = name || 'New File';
        
        // Create file object with all necessary properties
        files[id] = {
            id: id,
            name: fileName,
            content: content
        };
        
        return id;
    }

    /**
     * Switches the active file to the specified file ID
     * Saves current file content before switching and loads new file content
     * 
     * @param {number} fileId - The ID of the file to switch to
     */
    function switchToFile(fileId) {
        // Save current file content before switching
        if (activeFileId && files[activeFileId]) {
            files[activeFileId].content = markdownInput.value;
        }
        
        // Update active file ID
        activeFileId = fileId;
        
        // Load new file content into editor
        if (files[fileId]) {
            markdownInput.value = files[fileId].content;
            updateCounts();  // Update character/word counts
            
            // Re-render if auto-render is enabled
            if (isAutoRenderEnabled) {
                renderMarkdown();
            }
        }
        
        // Update tab UI to reflect new active state
        updateTabsUI();
        
        // Scroll active tab into view with slight delay for UI update
        setTimeout(() => {
            const activeTab = document.querySelector('.file-tab.active');
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 50);
    }

    /**
     * Deletes a file from the collection
     * Prevents deletion if it's the last remaining file
     * Automatically switches to another file if the deleted file was active
     * 
     * @param {number} fileId - The ID of the file to delete
     */
    function deleteFile(fileId) {
        // Prevent deletion of the last file (always keep at least one)
        if (Object.keys(files).length <= 1) {
            return;
        }
        
        // Remove file from collection
        delete files[fileId];
        
        // If deleted file was active, switch to another available file
        if (activeFileId === fileId) {
            const remainingIds = Object.keys(files);
            if (remainingIds.length > 0) {
                switchToFile(parseInt(remainingIds[0]));
            }
        }
        
        // Update tab UI to reflect changes
        updateTabsUI();
    }

    /**
     * Renames a file with the given new name
     * 
     * @param {number} fileId - The ID of the file to rename
     * @param {string} newName - The new name for the file
     */
    function renameFile(fileId, newName) {
        if (files[fileId]) {
            files[fileId].name = newName;
            updateTabsUI();  // Refresh tab display with new name
        }
    }

    /**
     * Shows the rename modal dialog for a specific file
     * Pre-fills the input with current file name and sets up focus
     * 
     * @param {number} fileId - The ID of the file to rename
     */
    function showRenameModal(fileId) {
        if (!files[fileId]) return;
        
        // Pre-fill input with current file name
        const currentName = files[fileId].name;
        fileNameInput.value = currentName;
        
        // Store file ID in button dataset for later retrieval
        confirmRenameBtn.dataset.fileId = fileId;
        
        // Show Bootstrap modal
        const modal = new bootstrap.Modal(renameFileModal);
        modal.show();
        
        // Focus and select input text when modal is fully shown
        renameFileModal.addEventListener('shown.bs.modal', () => {
            fileNameInput.focus();
            fileNameInput.select();  // Select all text for easy replacement
        }, { once: true });  // Only attach this listener once per modal show
    }

    /**
     * Handles confirmation of file rename operation
     * Retrieves new name from input and performs the rename if valid
     */
    function handleRenameConfirm() {
        const fileId = parseInt(confirmRenameBtn.dataset.fileId);
        const newName = fileNameInput.value.trim();
        
        // Only rename if new name is not empty and file exists
        if (newName && files[fileId]) {
            renameFile(fileId, newName);
        }
        
        // Hide the modal
        const modal = bootstrap.Modal.getInstance(renameFileModal);
        if (modal) {
            modal.hide();
        }
    }

    /**
     * Tab UI Management Functions
     */

    /**
     * Creates a DOM element for a file tab
     * 
     * @param {Object} file - The file object containing id, name, and content
     * @returns {HTMLDivElement} The created tab element
     */
    function createTabElement(file) {
        const tab = document.createElement('div');
        tab.className = `file-tab ${file.id === activeFileId ? 'active' : ''}`;
        tab.dataset.fileId = file.id;
        
        // Create tab HTML structure with file name and close button
        tab.innerHTML = `
            <span class="file-tab-name">${file.name}</span>
            <button class="file-tab-close" type="button" title="Close file">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        return tab;
    }

    /**
     * Updates the entire tab UI by regenerating all tab elements
     * Called whenever files are added, removed, renamed, or switched
     */
    function updateTabsUI() {
        // Clear existing tabs
        fileTabsList.innerHTML = '';
        
        // Create new tab elements for all files
        Object.values(files).forEach(file => {
            const tabElement = createTabElement(file);
            fileTabsList.appendChild(tabElement);
        });
        
        // Ensure header heights remain synchronized
        syncHeaderHeights();
    }

    /**
     * Scrolls the tab list to show the rightmost (newest) tab
     * Called when new tabs are added to ensure they're visible
     */
    function scrollTabsToEnd() {
        fileTabsList.scrollLeft = fileTabsList.scrollWidth;
    }

    /**
     * Initializes the file system on application startup
     * Attempts to restore saved files from localStorage, falls back to creating new file
     * 
     * Load Priority:
     * 1. Saved files from localStorage (new multi-file system)
     * 2. Legacy single file content from localStorage
     * 3. Empty new file as fallback
     */
    function initializeFiles() {
        const savedFiles = localStorage.getItem('markdownFiles');
        const savedActiveFileId = localStorage.getItem('markdownActiveFileId');
        
        // Try to load saved multi-file system
        if (savedFiles) {
            try {
                files = JSON.parse(savedFiles);
                activeFileId = savedActiveFileId ? parseInt(savedActiveFileId) : null;
                
                // Validate that active file ID still exists
                if (!activeFileId || !files[activeFileId]) {
                    const fileIds = Object.keys(files);
                    activeFileId = fileIds.length > 0 ? parseInt(fileIds[0]) : null;
                }
                
                // Load active file content into editor
                if (activeFileId && files[activeFileId]) {
                    markdownInput.value = files[activeFileId].content;
                }
                
                updateTabsUI();
                return;  // Successfully loaded, exit function
            } catch (e) {
                console.warn('Failed to load saved files:', e);
                // Continue to fallback logic below
            }
        }
        
        // Fallback: Create new file with legacy content or empty
        const savedInput = localStorage.getItem('markdownInputContent') || '';
        const firstFileId = createNewFile('New File', savedInput);
        switchToFile(firstFileId);
    }

    /**
     * Utility Functions
     */

    /**
     * Creates a debounced version of a function that delays execution
     * Prevents excessive calls during rapid user input (like typing)
     * 
     * @param {Function} func - The function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced version of the function
     */
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            // Clear previous timeout if function called again
            clearTimeout(timeoutId);
            // Set new timeout
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    /**
     * Updates the character and word count displays
     * Called whenever the input content changes
     */
    function updateCounts() {
        const text = markdownInput.value;
        const charCount = text.length;
        
        // Count words by splitting on whitespace and filtering empty strings
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = text.trim() === '' ? 0 : words.length;

        // Update display elements if they exist
        if (charCountSpan) {
            charCountSpan.textContent = `Chars: ${charCount}`;
        }
        if (wordCountSpan) {
            wordCountSpan.textContent = `Words: ${wordCount}`;
        }
    }

    /**
     * Core Rendering Functions
     */

    /**
     * Main markdown rendering function
     * Converts markdown text to HTML and applies enhancements
     * 
     * Process:
     * 1. Get markdown text from input
     * 2. Render to HTML using markdown-renderer module
     * 3. Apply directional styling to inline code
     * 4. Enhance code blocks with headers and controls
     * 5. Apply directional styling to code blocks
     */
    function renderMarkdown() {
        const markdownText = markdownInput.value;
        const html = render(markdownText, isMathRenderEnabled);  // Use imported render function
        markdownOutput.innerHTML = html;

        // Apply post-processing enhancements
        applyInlineCodeDirectionToElements(currentInlineCodeDirection);
        enhanceCodeBlocks();
        applyCodeDirectionToBlocks(currentCodeDirection);
    }

    /**
     * Enhances code blocks with interactive features
     * 
     * This function transforms plain <pre><code> elements into enhanced code blocks with:
     * - Language identification and display
     * - Copy-to-clipboard functionality
     * - Collapsible content
     * - Custom styling wrapper
     * - Direction control integration
     * 
     * Process for each code block:
     * 1. Skip already processed blocks
     * 2. Wrap in container with direction support
     * 3. Detect and normalize language information
     * 4. Create interactive header with language label, copy button, and collapse toggle
     * 5. Add event listeners for copy and collapse functionality
     */
    function enhanceCodeBlocks() {
        // Track processed elements to avoid double-processing
        const processedPres = new Set();
        const COLLAPSE_PIXELS_PER_SECOND = 480;
        const MIN_COLLAPSE_DURATION = 0.25;
        const MAX_COLLAPSE_DURATION = 0.9;

            const setupCollapseAnimation = (wrapper, preElement) => {
            let storedHeight = null;
            let isAnimating = false;
            
            const measureHeight = () => {
                // Temporarily show element to measure its natural height
                const wasCollapsed = wrapper.classList.contains('collapsed');
                if (wasCollapsed) {
                    wrapper.classList.remove('collapsed');
                    preElement.style.height = 'auto';
                }
                
                const height = preElement.scrollHeight;
                
                if (wasCollapsed) {
                    preElement.style.height = '0px';
                    wrapper.classList.add('collapsed');
                }
                
                return height;
            };
            
            const animateToHeight = (targetHeight, callback) => {
                if (isAnimating) return;
                
                isAnimating = true;
                preElement.style.height = preElement.offsetHeight + 'px';
                
                // Force a reflow to ensure the height is set
                preElement.offsetHeight;
                
                // Set target height
                preElement.style.height = targetHeight + 'px';
                
                // Wait for animation to complete
                const onTransitionEnd = () => {
                    preElement.removeEventListener('transitionend', onTransitionEnd);
                    isAnimating = false;
                    if (callback) callback();
                };
                
                preElement.addEventListener('transitionend', onTransitionEnd);
                
                // Fallback timeout in case transitionend doesn't fire
                setTimeout(() => {
                    if (isAnimating) {
                        preElement.removeEventListener('transitionend', onTransitionEnd);
                        isAnimating = false;
                        if (callback) callback();
                    }
                }, 400); // Slightly longer than CSS transition duration
            };
            
            const handleCollapse = () => {
                if (isAnimating) return;
                
                // Store current height before collapsing
                storedHeight = measureHeight();
                
                // Start collapse animation
                animateToHeight(0, () => {
                    wrapper.classList.add('collapsed');
                });
            };
            
            const handleExpand = () => {
                if (isAnimating) return;
                
                wrapper.classList.remove('collapsed');
                
                // Use stored height or measure current height
                const targetHeight = storedHeight || measureHeight();
                
                // Start expand animation
                animateToHeight(targetHeight, () => {
                    // Reset to auto height after animation completes
                    preElement.style.height = 'auto';
                });
            };
            
            return { 
                prepareForCollapse: handleCollapse,
                handleExpand: handleExpand 
            };
        };
        
        markdownOutput.querySelectorAll('pre').forEach((preElement) => {
            // Skip already processed or wrapped elements
            if (processedPres.has(preElement) || preElement.parentElement.classList.contains('code-block-wrapper')) {
                return;
            }

            const codeElement = preElement.querySelector('code');
            if (!codeElement) return;  // Skip pre elements without code

            /**
             * STEP 1: Create wrapper container for the code block
             * This provides styling boundaries and direction control
             */
            const wrapper = document.createElement('div');
            wrapper.classList.add('code-block-wrapper');
            wrapper.dataset.codeDirection = currentCodeDirection;

            // Insert wrapper and move pre element inside it
            preElement.parentNode.insertBefore(wrapper, preElement);
            wrapper.appendChild(preElement);
            processedPres.add(preElement);  // Mark as processed

            /**
             * STEP 2: Language detection and normalization
             * Try multiple methods to determine the programming language:
             * 1. Look for 'language-*' CSS classes (markdown standard)
             * 2. Look for highlight.js supported language classes
             * 3. Default to 'plaintext' if none found
             */
            let language = 'plaintext';
            const langClass = Array.from(codeElement.classList).find(cls => cls.startsWith('language-'));
            
            if (langClass) {
                // Standard markdown language class found
                language = langClass.replace('language-', '');
            } else {
                // Check if any class matches a highlight.js supported language
                const potentialLangClass = Array.from(codeElement.classList).find(cls => hljs.getLanguage(cls));
                if (potentialLangClass) {
                    language = potentialLangClass;
                    // Ensure standard language class is present
                    if (!codeElement.classList.contains(`language-${language}`)) {
                        codeElement.classList.add(`language-${language}`);
                    }
                } else if (!codeElement.className.includes('language-')) {
                    // No language detected, add plaintext class
                    codeElement.classList.add('language-plaintext');
                }
            }
            
            // Ensure highlight.js class is present for styling
            if (!codeElement.classList.contains('hljs')) {
                codeElement.classList.add('hljs');
            }

            /**
             * STEP 3: Create interactive header elements
             * Header contains: language label, copy button, collapse toggle
             */
            const header = document.createElement('div');
            header.classList.add('code-block-header');

            // Language display label
            const langSpan = document.createElement('span');
            langSpan.classList.add('language');
            langSpan.textContent = language;

            // Copy to clipboard button
            const copyButton = document.createElement('button');
            copyButton.classList.add('btn', 'btn-secondary', 'btn-sm', 'copy-code-button');
            copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyButton.title = 'Copy code to clipboard';
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');

            // Collapse/expand toggle icon
            const iconSpan = document.createElement('span');
            iconSpan.classList.add('collapse-icon');
            iconSpan.title = 'Toggle Collapse';

            // Assemble header elements
            header.appendChild(langSpan);
            header.appendChild(copyButton);
            header.appendChild(iconSpan);

            // Insert header before the code block
            wrapper.insertBefore(header, preElement);

            const collapseControls = setupCollapseAnimation(wrapper, preElement);

            /**
             * STEP 4: Copy functionality event handler
             * Uses Clipboard API for secure copying with visual feedback
             */
            copyButton.addEventListener('click', (e) => {
                e.stopPropagation();  // Prevent triggering collapse toggle
                const codeToCopy = codeElement.innerText;
                
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    // Success feedback: Change icon and color
                    copyButton.innerHTML = '<i class="bi bi-check-lg"></i>';
                    copyButton.classList.add('copied', 'btn-success');
                    copyButton.classList.remove('btn-secondary');
                    
                    // Reset button after 2 seconds
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
                        copyButton.classList.remove('copied', 'btn-success');
                        copyButton.classList.add('btn-secondary');
                    }, 2000);
                }).catch(err => {
                    // Error feedback: Show error icon
                    console.error('Failed to copy code: ', err);
                    copyButton.innerHTML = '<i class="bi bi-x-octagon-fill text-danger"></i>';
                    setTimeout(() => { 
                        copyButton.innerHTML = '<i class="bi bi-clipboard"></i>'; 
                    }, 2000);
                });
            });

            /**
             * STEP 5: Collapse/expand functionality
             * Click anywhere on header (except copy button) to toggle collapse
             */
            header.addEventListener('click', (event) => {
                // Only collapse if not clicking the copy button
                if (!copyButton.contains(event.target)) {
                    if (wrapper.classList.contains('collapsed')) {
                        collapseControls.handleExpand();
                    } else {
                        collapseControls.prepareForCollapse();
                    }
                }
            });
        });
    }


    /**
     * Layout and UI Control Functions
     */

    /**
     * Toggles the visibility of the input area (left column)
     * When hidden, the output area expands to full width
     * Saves the preference to localStorage for persistence
     */
    function toggleInputArea() {
        const isInputVisible = toggleInputSwitch.checked;
        
        if (isInputVisible) {
            // Show input: restore two-column layout
            inputColumn.classList.remove('hidden');
            outputColumn.classList.remove('full-width', 'col-lg-12');
            outputColumn.classList.add('col-lg-6');
            inputColumn.classList.add('col-lg-6');
        } else {
            // Hide input: expand output to full width
            inputColumn.classList.add('hidden');
            inputColumn.classList.remove('col-lg-6');
            outputColumn.classList.remove('col-lg-6');
            outputColumn.classList.add('full-width', 'col-lg-12');
        }
        
        // Persist preference and sync header heights
        localStorage.setItem('markdownRendererInputVisible', isInputVisible);
        syncHeaderHeights();
    }

    /**
     * Theme Management Functions
     */

    /**
     * Applies a theme (light or dark) to the entire application
     * Updates Bootstrap theme attribute, highlight.js styles, and UI icons
     * 
     * @param {string} theme - Either 'light' or 'dark'
     */
    function applyTheme(theme) {
        // Set Bootstrap theme attribute for CSS variable updates
        rootElement.setAttribute('data-bs-theme', theme);
        
        // Get or create style element for highlight.js theme
        let hljsThemeStyle = document.getElementById('hljs-theme-style');
        if (!hljsThemeStyle) {
            hljsThemeStyle = document.createElement('style');
            hljsThemeStyle.id = 'hljs-theme-style';
            document.head.appendChild(hljsThemeStyle);
        }

        // Apply theme-specific styles and icons
        if (theme === 'dark') {
            themeSwitchLabel.innerHTML = '<i class="bi bi-sun-fill"></i>';  // Sun icon for dark theme
            hljsThemeStyle.textContent = hljsThemeDark;  // Dark syntax highlighting
        } else {
            themeSwitchLabel.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';  // Moon icon for light theme
            hljsThemeStyle.textContent = hljsThemeLight;  // Light syntax highlighting
        }
        
        // Persist theme preference
        localStorage.setItem('markdownRendererTheme', theme);
    }

    /**
     * Toggles between light and dark themes
     * Determines current theme and switches to the opposite
     */
    function toggleTheme() {
        const currentTheme = rootElement.getAttribute('data-bs-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    /**
     * Rendering Control Functions
     */

    /**
     * Updates the auto-render state based on switch position
     * Enables/disables manual render button and triggers render if auto-enabled
     * Saves preference to localStorage
     */
    function updateAutoRenderState() {
        isAutoRenderEnabled = autoRenderSwitch.checked;
        manualRenderButton.disabled = isAutoRenderEnabled;  // Disable manual button when auto is on
        localStorage.setItem('markdownRendererAutoRender', isAutoRenderEnabled);
        
        // Immediately render if auto-render was just enabled
        if (isAutoRenderEnabled) {
            renderMarkdown();
        }
    }

    /**
     * Text Direction Control Functions
     * Support for LTR (Left-to-Right) and RTL (Right-to-Left) text rendering
     * Essential for multilingual support, especially Arabic and Persian text
     */

    /**
     * Sets the overall text direction for the output panel
     * Updates UI state, persists preference, and triggers re-render
     * 
     * @param {string} direction - Either 'ltr' or 'rtl'
     */
    function setTextDirection(direction) {
        currentTextDirection = direction;
        markdownOutput.dataset.textDirection = direction;  // CSS uses this for styling
        localStorage.setItem('markdownRendererTextDir', direction);  // Persist preference
        
        // Update button active states
        textDirLtrBtn.classList.toggle('active', direction === 'ltr');
        textDirRtlBtn.classList.toggle('active', direction === 'rtl');
        
        renderMarkdown();  // Re-render to apply direction changes
    }

    /**
     * Applies direction attribute to all inline code elements
     * Inline code may need different direction than surrounding text
     * 
     * @param {string} direction - Either 'ltr' or 'rtl'
     */
    function applyInlineCodeDirectionToElements(direction) {
        markdownOutput.querySelectorAll('code:not(pre code)').forEach(inlineCode => {
            inlineCode.dataset.inlineCodeDirection = direction;
        });
    }

    /**
     * Sets the direction for inline code elements (`code`)
     * Separate from general text direction for flexibility
     * 
     * @param {string} direction - Either 'ltr' or 'rtl'
     */
    function setInlineCodeDirection(direction) {
        currentInlineCodeDirection = direction;
        applyInlineCodeDirectionToElements(direction);
        localStorage.setItem('markdownRendererInlineCodeDir', direction);

        // Update button active states
        inlineCodeDirLtrBtn.classList.toggle('active', direction === 'ltr');
        inlineCodeDirRtlBtn.classList.toggle('active', direction === 'rtl');
    }

    /**
     * Applies direction attribute to all code block wrappers
     * Code blocks may contain mixed content requiring specific direction
     * 
     * @param {string} direction - Either 'ltr' or 'rtl'
     */
    function applyCodeDirectionToBlocks(direction) {
        markdownOutput.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
            wrapper.dataset.codeDirection = direction;
        });
    }

    /**
     * Sets the direction for code blocks (```code```)
     * Independent control for code block text direction
     * 
     * @param {string} direction - Either 'ltr' or 'rtl'
     */
    function setCodeDirection(direction) {
        currentCodeDirection = direction;
        applyCodeDirectionToBlocks(direction);
        localStorage.setItem('markdownRendererCodeDir', direction);

        // Update button active states
        codeDirLtrBtn.classList.toggle('active', direction === 'ltr');
        codeDirRtlBtn.classList.toggle('active', direction === 'rtl');
    }

    function applyMarkdownSyntax(syntaxType) {
        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;
        const selectedText = markdownInput.value.substring(start, end);
        const textBefore = markdownInput.value.substring(0, start);
        const textAfter = markdownInput.value.substring(end);
        let newText = '';
        let cursorPos = start;

        const wrapSelection = (beforeSyntax, afterSyntax, placeholder = '') => {
            if (selectedText) {
                newText = `${textBefore}${beforeSyntax}${selectedText}${afterSyntax}${textAfter}`;
                cursorPos = start + beforeSyntax.length + selectedText.length + afterSyntax.length;
            } else {
                newText = `${textBefore}${beforeSyntax}${placeholder}${afterSyntax}${textAfter}`;
                cursorPos = start + beforeSyntax.length;
                markdownInput.value = newText;
                markdownInput.setSelectionRange(cursorPos, cursorPos + placeholder.length);
                return;
            }
            markdownInput.value = newText;
            markdownInput.setSelectionRange(cursorPos, cursorPos);
        };

        const insertAtLineStart = (prefix, placeholder = '') => {
            let currentLineStart = textBefore.lastIndexOf('\n') + 1;
            let indentedPrefix = prefix;

            if (selectedText && selectedText.includes('\n')) {
                const lines = selectedText.split('\n');
                const firstSelectedLineStart = textBefore.lastIndexOf('\n') + 1;
                const textBeforeSelectionStart = markdownInput.value.substring(0, firstSelectedLineStart);
                const textAfterSelectionEnd = textAfter;

                const prefixedLines = lines.map(line => `${indentedPrefix}${line}`).join('\n');
                newText = `${textBeforeSelectionStart}${prefixedLines}${textAfterSelectionEnd}`;

                cursorPos = end + (lines.length * indentedPrefix.length);
                markdownInput.value = newText;
                markdownInput.setSelectionRange(firstSelectedLineStart + indentedPrefix.length, cursorPos);

            } else {
                const textBeforeLine = markdownInput.value.substring(0, currentLineStart);
                const currentLineContent = markdownInput.value.substring(currentLineStart).split('\n')[0];

                if (selectedText) {
                    newText = `${textBeforeLine}${indentedPrefix}${selectedText}${textAfter}`;
                    cursorPos = start + indentedPrefix.length;
                    const selectionEndPos = end + indentedPrefix.length;
                    markdownInput.value = newText;
                    markdownInput.setSelectionRange(cursorPos, selectionEndPos);
                } else {
                    newText = `${textBeforeLine}${indentedPrefix}${placeholder}${markdownInput.value.substring(currentLineStart)}`;
                    cursorPos = currentLineStart + indentedPrefix.length;
                    markdownInput.value = newText;
                    markdownInput.setSelectionRange(cursorPos, cursorPos + placeholder.length);
                }
            }
        };

        const insertOrderedListPrefix = (placeholder = 'List item') => {
            let currentLineStart = textBefore.lastIndexOf('\n') + 1;
            let prefixNum = 1;


            if (selectedText && selectedText.includes('\n')) {
                const lines = selectedText.split('\n');
                const firstSelectedLineStart = textBefore.lastIndexOf('\n') + 1;
                const textBeforeSelectionStart = markdownInput.value.substring(0, firstSelectedLineStart);
                const textAfterSelectionEnd = textAfter;

                const prefixedLines = lines.map((line, index) => `${index + prefixNum}. ${line}`).join('\n');
                newText = `${textBeforeSelectionStart}${prefixedLines}${textAfterSelectionEnd}`;

                cursorPos = end + (lines.length * 3) + (lines.length > 9 ? lines.length : 0);
                markdownInput.value = newText;
                markdownInput.setSelectionRange(firstSelectedLineStart + `${prefixNum}. `.length, cursorPos);
            } else {
                insertAtLineStart(`${prefixNum}. `, selectedText || placeholder);
            }
        };


        switch (syntaxType) {
            case 'bold': wrapSelection('**', '**', 'bold text'); break;
            case 'italic': wrapSelection('*', '*', 'italic text'); break;
            case 'strikethrough': wrapSelection('~~', '~~', 'strikethrough'); break;
            case 'inline-code': wrapSelection('`', '`', 'code'); break;
            case 'link':
                const url = prompt("Enter link URL:", "https://");
                if (url !== null && url.trim() !== "") {
                    wrapSelection('[', `](${url})`, selectedText || 'link text');
                } else { return; }
                break;
            case 'code-block':
                const language = prompt("Enter code language (optional):", "");
                const langStr = language ? language.trim() : '';
                const codePlaceholder = 'Your code here';
                const beforeBlock = (textBefore.length === 0 || textBefore.endsWith('\n\n') || textBefore.endsWith('\n')) ? `\`\`\`${langStr}\n` : `\n\`\`\`${langStr}\n`;
                const afterBlock = `\n\`\`\`` + (textAfter.startsWith('\n') ? '' : '\n');

                if (selectedText) {
                    newText = `${textBefore}${beforeBlock}${selectedText}${afterBlock}${textAfter}`;
                    cursorPos = start + beforeBlock.length + selectedText.length + afterBlock.length;
                } else {
                    newText = `${textBefore}${beforeBlock}${codePlaceholder}${afterBlock}${textAfter}`;
                    cursorPos = start + beforeBlock.length;
                    markdownInput.value = newText;
                    markdownInput.setSelectionRange(cursorPos, cursorPos + codePlaceholder.length);
                    return;
                }
                markdownInput.value = newText;
                markdownInput.setSelectionRange(cursorPos, cursorPos);
                break;
            case 'image':
                const altText = prompt("Enter image description (alt text):", "");
                if (altText === null) return;
                const imgUrl = prompt("Enter image URL:", "https://");
                if (imgUrl === null || imgUrl.trim() === "") return;

                let prefix = (textBefore.length > 0 && !textBefore.endsWith('\n')) ? '\n' : '';
                let suffix = (textAfter.length > 0 && !textAfter.startsWith('\n')) ? '\n' : '';
                const imageMarkdown = `![${altText || ''}](${imgUrl})`;

                newText = `${textBefore}${prefix}${imageMarkdown}${suffix}${textAfter}`;
                cursorPos = start + prefix.length + imageMarkdown.length;
                markdownInput.value = newText;
                markdownInput.setSelectionRange(cursorPos, cursorPos);
                break;
            case 'h1': insertAtLineStart('# ', 'Heading 1'); break;
            case 'h2': insertAtLineStart('## ', 'Heading 2'); break;
            case 'h3': insertAtLineStart('### ', 'Heading 3'); break;
            case 'ul-list': insertAtLineStart('- ', 'List item'); break;
            case 'ol-list': insertOrderedListPrefix('List item'); break;
            case 'blockquote': insertAtLineStart('> ', 'Blockquote'); break;
            case 'hr':
                let hrPrefix = '\n';
                if (textBefore.length > 0 && !textBefore.endsWith('\n\n')) {
                    hrPrefix = textBefore.endsWith('\n') ? '\n' : '\n\n';
                } else if (textBefore.length === 0) {
                    hrPrefix = '';
                }
                let hrSuffix = '\n';


                newText = `${textBefore}${hrPrefix}---\n${textAfter}`;
                cursorPos = start + hrPrefix.length + 4;
                markdownInput.value = newText;
                markdownInput.setSelectionRange(cursorPos, cursorPos);
                break;
        }

        markdownInput.focus();
        updateCounts();
        if (isAutoRenderEnabled) {
            setTimeout(() => {
                markdownInput.dispatchEvent(new Event('input', { bubbles: true }));
            }, 0);
        }
    }

    /**
     * Full-Height Mode Functions
     * Provides an immersive editing experience using the entire viewport
     */

    /**
     * Applies or removes full-height mode styling
     * Full-height mode makes the application use the entire browser viewport
     * 
     * @param {boolean} enabled - Whether to enable full-height mode
     */
    function applyFullHeightMode(enabled) {
        isFullHeightModeEnabled = enabled;
        if (enabled) {
            rootElement.classList.add('full-height-mode');  // CSS handles the viewport styling
        } else {
            rootElement.classList.remove('full-height-mode');
        }
    }

    /**
     * Toggles full-height mode based on switch state
     * Persists preference and ensures header synchronization
     */
    function toggleFullHeightMode() {
        applyFullHeightMode(fullHeightModeSwitch.checked);
        localStorage.setItem('markdownRendererFullHeightMode', fullHeightModeSwitch.checked);
        syncHeaderHeights();  // Re-sync headers after layout change
    }
    async function copyOutputWithStyling() {
        try {
            const outputElement = markdownOutput;
            
            if (!outputElement || !outputElement.innerHTML.trim()) {
                alert('No content to copy!');
                return;
            }

            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = outputElement.innerHTML;
            
            const outputStyles = window.getComputedStyle(outputElement);
            
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        /* Include relevant CSS variables and styles */
        body {
            font-family: ${outputStyles.fontFamily};
            color: ${outputStyles.color};
            background-color: ${outputStyles.backgroundColor};
            line-height: ${outputStyles.lineHeight};
            margin: 0;
            padding: 16px;
        }
        
        /* Preserve table styling */
        table {
            border-collapse: collapse;
            margin: 1em 0;
            width: 100%;
        }
        
        table, th, td {
            border: 1px solid #ddd;
        }
        
        th, td {
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        /* Preserve code styling */
        code {
            background-color: rgba(175, 184, 193, 0.2);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
        }
        
        pre {
            background-color: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
        }
        
        pre code {
            background-color: transparent;
            padding: 0;
        }
        
        /* Preserve heading styles */
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: bold;
        }
        
        /* Preserve list styling */
        ul, ol {
            margin: 1em 0;
            padding-left: 2em;
        }
        
        /* Preserve blockquote styling */
        blockquote {
            margin: 1em 0;
            padding-left: 1em;
            border-left: 4px solid #ddd;
            color: #666;
        }
        
        /* Preserve link styling */
        a {
            color: #0d6efd;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
${tempContainer.innerHTML}
</body>
</html>`;

            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([outputElement.innerText], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipboardItem]);
            
            const originalText = copyOutputBtn.innerHTML;
            copyOutputBtn.innerHTML = '<i class="bi bi-check"></i> Copied!';
            copyOutputBtn.classList.remove('btn-outline-secondary');
            copyOutputBtn.classList.add('btn-success');
            
            setTimeout(() => {
                copyOutputBtn.innerHTML = originalText;
                copyOutputBtn.classList.remove('btn-success');
                copyOutputBtn.classList.add('btn-outline-secondary');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy:', error);
            
            try {
                await navigator.clipboard.writeText(markdownOutput.innerText);
                alert('Content copied as plain text (styled copy not supported in this browser)');
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                alert('Failed to copy content. Please try selecting and copying manually.');
            }
        }
    }


    const debouncedRender = debounce(renderMarkdown, 300);

    const debouncedSaveInput = debounce(() => {
        if (activeFileId && files[activeFileId]) {
            localStorage.setItem('markdownFiles', JSON.stringify(files));
            localStorage.setItem('markdownActiveFileId', activeFileId.toString());
        }
    }, 1000);

    toggleInputSwitch.addEventListener('change', toggleInputArea);
    themeSwitch.addEventListener('change', toggleTheme);
    autoRenderSwitch.addEventListener('change', updateAutoRenderState);
    manualRenderButton.addEventListener('click', renderMarkdown);
    fullHeightModeSwitch.addEventListener('change', toggleFullHeightMode);

    mathOnBtn.addEventListener('click', () => setMathRenderState(true));
    mathOffBtn.addEventListener('click', () => setMathRenderState(false));
    textDirLtrBtn.addEventListener('click', () => setTextDirection('ltr'));
    textDirRtlBtn.addEventListener('click', () => setTextDirection('rtl'));
    inlineCodeDirLtrBtn.addEventListener('click', () => setInlineCodeDirection('ltr'));
    inlineCodeDirRtlBtn.addEventListener('click', () => setInlineCodeDirection('rtl'));
    codeDirLtrBtn.addEventListener('click', () => setCodeDirection('ltr'));
    codeDirRtlBtn.addEventListener('click', () => setCodeDirection('rtl'));

    copyOutputBtn.addEventListener('click', copyOutputWithStyling);


    markdownToolbar.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-syntax]');
        if (button) {
            event.preventDefault();
            applyMarkdownSyntax(button.dataset.syntax);
        }
    });

    markdownInput.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey) {
            let handled = false;
            switch (event.key.toLowerCase()) {
                case 'b':
                    applyMarkdownSyntax('bold');
                    handled = true;
                    break;
                case 'i':
                    applyMarkdownSyntax('italic');
                    handled = true;
                    break;
                case 'k':
                    applyMarkdownSyntax('link');
                    handled = true;
                    break;
            }
            if (handled) {
                event.preventDefault();
            }
        }
    });

    
    addTabBtn.addEventListener('click', (event) => {
        if (event.altKey) {
            const newFileId = createNewFile('Markdown Test', markdownTestContent);
            switchToFile(newFileId);
            setTimeout(scrollTabsToEnd, 50);
        } else {
            const newFileId = createNewFile();
            switchToFile(newFileId);
            setTimeout(scrollTabsToEnd, 50);
        }
    });

    fileTabsList.addEventListener('click', (event) => {
        const tab = event.target.closest('.file-tab');
        if (!tab) return;

        const fileId = parseInt(tab.dataset.fileId);
        
        if (event.target.closest('.file-tab-close')) {
            event.stopPropagation();
            deleteFile(fileId);
            return;
        }
        
        if (fileId === activeFileId) {
            showRenameModal(fileId);
            return;
        }
        
        switchToFile(fileId);
    });

    fileTabsList.addEventListener('dblclick', (event) => {
        const tab = event.target.closest('.file-tab');
        if (!tab || event.target.closest('.file-tab-close')) return;

        const fileId = parseInt(tab.dataset.fileId);
        
        if (fileId === activeFileId) return;
        
        const nameSpan = tab.querySelector('.file-tab-name');
        
        if (!nameSpan || nameSpan.style.display === 'none') return;
        
        const currentName = nameSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'file-tab-name editing';
        input.style.width = Math.max(nameSpan.offsetWidth, 100) + 'px';
        
        nameSpan.style.display = 'none';
        nameSpan.parentNode.insertBefore(input, nameSpan);
        
        input.focus();
        input.select();
        
        const finishEditing = () => {
            const newName = input.value.trim() || currentName;
            renameFile(fileId, newName);
            input.remove();
            nameSpan.style.display = '';
        };
        
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                input.value = currentName;
                finishEditing();
            }
        });
        
        event.stopPropagation();
    });

    confirmRenameBtn.addEventListener('click', handleRenameConfirm);
    
    fileNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenameConfirm();
        }
    });

    markdownInput.addEventListener('input', () => {
        if (activeFileId && files[activeFileId]) {
            files[activeFileId].content = markdownInput.value;
        }
        updateCounts();
        if (isAutoRenderEnabled) {
            debouncedRender();
        }
        debouncedSaveInput();
    });


    initializeFiles();

    const savedTheme = localStorage.getItem('markdownRendererTheme') || 'dark';
    applyTheme(savedTheme);
    themeSwitch.checked = (savedTheme === 'dark');

    const savedAutoRender = localStorage.getItem('markdownRendererAutoRender');
    isAutoRenderEnabled = savedAutoRender !== null ? (savedAutoRender === 'true') : true;
    autoRenderSwitch.checked = isAutoRenderEnabled;
    updateAutoRenderState();

    const savedMathRender = localStorage.getItem('markdownRendererMathRender');
    const isMathInitiallyEnabled = savedMathRender !== null ? (savedMathRender === 'true') : true;
    setMathRenderState(isMathInitiallyEnabled);

    const savedTextDir = localStorage.getItem('markdownRendererTextDir') || 'ltr';
    setTextDirection(savedTextDir);

    const savedInlineCodeDir = localStorage.getItem('markdownRendererInlineCodeDir') || 'ltr';
    setInlineCodeDirection(savedInlineCodeDir);

    const savedCodeDir = localStorage.getItem('markdownRendererCodeDir') || 'ltr';
    setCodeDirection(savedCodeDir);

    const savedFullHeightMode = localStorage.getItem('markdownRendererFullHeightMode');
    isFullHeightModeEnabled = savedFullHeightMode === 'true';
    fullHeightModeSwitch.checked = isFullHeightModeEnabled;
    applyFullHeightMode(isFullHeightModeEnabled);

    const savedInputVisible = localStorage.getItem('markdownRendererInputVisible');
    const isInputInitiallyVisible = savedInputVisible !== null ? (savedInputVisible === 'true') : true;
    toggleInputSwitch.checked = isInputInitiallyVisible;
    toggleInputArea();

    updateCounts();
    syncHeaderHeights();

    const debouncedSyncHeaders = debounce(syncHeaderHeights, 100);
    window.addEventListener('resize', debouncedSyncHeaders);

    function setMathRenderState(enabled) {
        isMathRenderEnabled = enabled;
        localStorage.setItem('markdownRendererMathRender', isMathRenderEnabled);
        mathOnBtn.classList.toggle('active', enabled);
        mathOffBtn.classList.toggle('active', !enabled);
        renderMarkdown();
    }

    window.addEventListener('beforeunload', () => {
        if (activeFileId && files[activeFileId]) {
            files[activeFileId].content = markdownInput.value;
            localStorage.setItem('markdownFiles', JSON.stringify(files));
            localStorage.setItem('markdownActiveFileId', activeFileId.toString());
        }
    });

    // GitHub Integration
    const githubAPI = new GitHubAPI();
    const githubSyncManager = new GitHubSyncManager(githubAPI);

    // Initialize GitHub UI elements
    const setupGitHubUI = () => {
        // Add GitHub sync button to the header
        const githubSyncBtn = document.createElement('button');
        githubSyncBtn.className = 'btn btn-ghost control-button';
        githubSyncBtn.title = 'GitHub Sync';
        githubSyncBtn.innerHTML = '<i class="bi bi-github"></i> <span>Sync</span>';
        githubSyncBtn.id = 'github-sync-btn';

        // Find the header controls container
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            // Insert GitHub sync button - first try to insert before the GitHub link
            const githubLink = headerControls.querySelector('a[href*="github"]');
            if (githubLink) {
                // Make sure githubLink is a child of headerControls before inserting
                if (githubLink.parentNode === headerControls) {
                    headerControls.insertBefore(githubSyncBtn, githubLink);
                } else {
                    // If githubLink is not a direct child, append to the end
                    headerControls.appendChild(githubSyncBtn);
                }
            } else {
                // If no GitHub link found, just append to the end
                headerControls.appendChild(githubSyncBtn);
            }
        } else {
            // If header controls not found, add to the header element
            const header = document.querySelector('.app-header');
            if (header) {
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'header-controls';
                controlsDiv.appendChild(githubSyncBtn);
                header.appendChild(controlsDiv);
            }
        }

        // Add click event for GitHub sync button
        githubSyncBtn.addEventListener('click', showGitHubModal);
    };

    // Show GitHub modal for authentication and configuration
    const showGitHubModal = () => {
        // Create modal if it doesn't exist
        let modal = document.getElementById('githubModal');
        if (!modal) {
            modal = createGitHubModal();
            document.body.appendChild(modal);
        }

        // Initialize modal content
        initializeGitHubModalContent(modal);

        // Show the modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    };

    // Create GitHub modal element
    const createGitHubModal = () => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'githubModal';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">GitHub Sync</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="github-auth-section mb-4">
                            <h6><i class="bi bi-key"></i> GitHub Authentication</h6>
                            <div class="mb-3">
                                <label for="githubToken" class="form-label">Personal Access Token</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="githubToken" placeholder="Enter your GitHub Personal Access Token">
                                    <button class="btn btn-outline-secondary" type="button" id="toggleTokenVisibility">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                                <div class="form-text">
                                    Create a token at <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a> with 'repo' scope.
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-primary" id="saveTokenBtn">Save Token</button>
                                <button class="btn btn-outline-secondary" id="clearTokenBtn">Clear Token</button>
                            </div>
                        </div>

                        <div class="github-repo-section mb-4">
                            <h6><i class="bi bi-folder"></i> Repository Configuration</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="repoOwner" class="form-label">Repository Owner</label>
                                        <input type="text" class="form-control" id="repoOwner" placeholder="e.g., username">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="repoName" class="form-label">Repository Name</label>
                                        <input type="text" class="form-control" id="repoName" placeholder="e.g., my-notes">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="repoBranch" class="form-label">Branch</label>
                                        <input type="text" class="form-control" id="repoBranch" value="main" placeholder="e.g., main">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <div class="form-control-plaintext">
                                            <span id="githubStatus">Not authenticated</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button class="btn btn-primary" id="saveRepoInfoBtn">Save Repository Info</button>
                            </div>
                        </div>

                        <div class="github-sync-section">
                            <h6><i class="bi bi-arrow-repeat"></i> Sync Operations</h6>
                            <div class="d-flex gap-2 mb-3">
                                <button class="btn btn-success" id="syncToGitHubBtn">
                                    <i class="bi bi-upload"></i> Sync to GitHub
                                </button>
                                <button class="btn btn-info" id="loadFromGitHubBtn">
                                    <i class="bi bi-download"></i> Load from GitHub
                                </button>
                            </div>

                            <div class="alert alert-info d-none" id="syncProgressAlert" role="alert">
                                <div class="d-flex align-items-center">
                                    <div class="spinner-border spinner-border-sm me-2" role="status">
                                        <span class="visually-hidden">Syncing...</span>
                                    </div>
                                    <span id="syncProgressText">Sync in progress...</span>
                                </div>
                            </div>

                            <div class="alert alert-success d-none" id="syncSuccessAlert" role="alert">
                                <i class="bi bi-check-circle"></i> <span id="syncSuccessText"></span>
                            </div>

                            <div class="alert alert-danger d-none" id="syncErrorAlert" role="alert">
                                <i class="bi bi-exclamation-triangle"></i> <span id="syncErrorText"></span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    };

    // Initialize GitHub modal content
    const initializeGitHubModalContent = (modal) => {
        // Set up token field with saved value
        const tokenField = modal.querySelector('#githubToken');
        const savedToken = githubAPI.getToken();
        tokenField.value = savedToken ? '••••••••••••••••' : '';
        tokenField.disabled = !!savedToken;

        // Set up repo info fields with saved values
        modal.querySelector('#repoOwner').value = githubAPI.repoOwner;
        modal.querySelector('#repoName').value = githubAPI.repoName;
        modal.querySelector('#repoBranch').value = githubAPI.branch || 'main';

        // Update status
        updateGitHubStatus(modal);

        // Set up event listeners
        setupGitHubModalEvents(modal);
    };

    // Set up event listeners for the GitHub modal
    const setupGitHubModalEvents = (modal) => {
        // Toggle token visibility
        const toggleTokenBtn = modal.querySelector('#toggleTokenVisibility');
        const tokenField = modal.querySelector('#githubToken');
        let tokenVisible = false;

        toggleTokenBtn.addEventListener('click', () => {
            tokenField.type = tokenVisible ? 'password' : 'text';
            toggleTokenBtn.innerHTML = tokenVisible ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
            tokenVisible = !tokenVisible;
        });

        // Save token
        modal.querySelector('#saveTokenBtn').addEventListener('click', async () => {
            const token = tokenField.value.trim();
            if (!token) {
                showAlert(modal, 'Please enter a GitHub token', 'error');
                return;
            }

            try {
                githubAPI.setToken(token);
                tokenField.disabled = true;
                showAlert(modal, 'Token saved successfully!', 'success');
                updateGitHubStatus(modal);
            } catch (error) {
                showAlert(modal, `Error saving token: ${error.message}`, 'error');
            }
        });

        // Clear token
        modal.querySelector('#clearTokenBtn').addEventListener('click', () => {
            githubAPI.clearToken();
            tokenField.disabled = false;
            tokenField.value = '';
            showAlert(modal, 'Token cleared', 'success');
            updateGitHubStatus(modal);
        });

        // Save repository info
        modal.querySelector('#saveRepoInfoBtn').addEventListener('click', () => {
            const owner = modal.querySelector('#repoOwner').value.trim();
            const name = modal.querySelector('#repoName').value.trim();
            const branch = modal.querySelector('#repoBranch').value.trim() || 'main';

            if (!owner || !name) {
                showAlert(modal, 'Please enter both repository owner and name', 'error');
                return;
            }

            try {
                githubAPI.setRepository(owner, name, branch);
                showAlert(modal, 'Repository info saved successfully!', 'success');
                updateGitHubStatus(modal);
            } catch (error) {
                showAlert(modal, `Error saving repository info: ${error.message}`, 'error');
            }
        });

        // Sync to GitHub
        modal.querySelector('#syncToGitHubBtn').addEventListener('click', async () => {
            if (!githubAPI.isAuthenticated() || !githubAPI.isRepositoryConfigured()) {
                showAlert(modal, 'Please authenticate and configure repository first', 'error');
                return;
            }

            try {
                showSyncProgress(modal, 'Syncing files to GitHub...');

                const syncResult = await githubSyncManager.syncToGitHub(files);

                // Process results
                let successCount = syncResult.success.length;
                let failCount = syncResult.failed.length;
                let skipCount = syncResult.skipped.length;

                let message = `Sync completed: ${successCount} success`;
                if (failCount > 0) message += `, ${failCount} failed`;
                if (skipCount > 0) message += `, ${skipCount} skipped`;

                showSyncSuccess(modal, message);
            } catch (error) {
                showSyncError(modal, `Sync failed: ${error.message}`);
            }
        });

        // Load from GitHub
        modal.querySelector('#loadFromGitHubBtn').addEventListener('click', async () => {
            if (!githubAPI.isAuthenticated() || !githubAPI.isRepositoryConfigured()) {
                showAlert(modal, 'Please authenticate and configure repository first', 'error');
                return;
            }

            try {
                showSyncProgress(modal, 'Loading files from GitHub...');

                const loadResult = await githubSyncManager.loadFromGitHub((fileData) => {
                    // Extract filename without the .md extension
                    const fileName = fileData.path.replace(/\.md$/, '');

                    // Create or update the file in our local files
                    let fileId = null;

                    // Check if a file with this name already exists
                    for (const [id, file] of Object.entries(files)) {
                        if (file.name === fileName) {
                            // Update existing file
                            files[id].content = fileData.content;
                            fileId = parseInt(id);
                            break;
                        }
                    }

                    // If no existing file found, create a new one
                    if (fileId === null) {
                        fileId = createNewFile(fileName, fileData.content);
                    }

                    return { id: fileId, name: fileName };
                });

                // Update tabs UI after loading files
                updateTabsUI();

                // If we switched to a new file, update the editor content
                if (activeFileId && files[activeFileId]) {
                    markdownInput.value = files[activeFileId].content;
                    if (isAutoRenderEnabled) {
                        renderMarkdown();
                    }
                }

                // Process results
                let successCount = loadResult.success.length;
                let failCount = loadResult.failed.length;

                let message = `Load completed: ${successCount} files loaded`;
                if (failCount > 0) message += `, ${failCount} failed`;

                showSyncSuccess(modal, message);
            } catch (error) {
                showSyncError(modal, `Load failed: ${error.message}`);
            }
        });
    };

    // Update GitHub status display
    const updateGitHubStatus = (modal) => {
        const statusElement = modal.querySelector('#githubStatus');

        if (githubAPI.isAuthenticated()) {
            if (githubAPI.isRepositoryConfigured()) {
                statusElement.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Authenticated and repository configured';
                statusElement.className = 'form-control-plaintext text-success';
            } else {
                statusElement.innerHTML = '<i class="bi bi-exclamation-circle-fill text-warning"></i> Authenticated but repository not configured';
                statusElement.className = 'form-control-plaintext text-warning';
            }
        } else {
            statusElement.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i> Not authenticated';
            statusElement.className = 'form-control-plaintext text-danger';
        }
    };

    // Show alert in modal
    const showAlert = (modal, message, type) => {
        const alertElement = modal.querySelector('#syncErrorAlert');
        const alertText = modal.querySelector('#syncErrorText');

        // Show appropriate alert based on type
        const successAlert = modal.querySelector('#syncSuccessAlert');
        const successText = modal.querySelector('#syncSuccessText');
        const errorAlert = modal.querySelector('#syncErrorAlert');
        const errorText = modal.querySelector('#syncErrorText');
        const progressAlert = modal.querySelector('#syncProgressAlert');

        // Hide all alerts first
        successAlert.classList.add('d-none');
        errorAlert.classList.add('d-none');
        progressAlert.classList.add('d-none');

        if (type === 'success') {
            successText.textContent = message;
            successAlert.classList.remove('d-none');
        } else if (type === 'error') {
            errorText.textContent = message;
            errorAlert.classList.remove('d-none');
        }
    };

    // Show sync progress
    const showSyncProgress = (modal, message) => {
        const progressAlert = modal.querySelector('#syncProgressAlert');
        const progressText = modal.querySelector('#syncProgressText');

        progressText.textContent = message;
        progressAlert.classList.remove('d-none');

        // Hide other alerts
        modal.querySelector('#syncSuccessAlert').classList.add('d-none');
        modal.querySelector('#syncErrorAlert').classList.add('d-none');
    };

    // Show sync success
    const showSyncSuccess = (modal, message) => {
        const successAlert = modal.querySelector('#syncSuccessAlert');
        const successText = modal.querySelector('#syncSuccessText');

        successText.textContent = message;
        successAlert.classList.remove('d-none');

        // Hide other alerts
        modal.querySelector('#syncProgressAlert').classList.add('d-none');
        modal.querySelector('#syncErrorAlert').classList.add('d-none');
    };

    // Show sync error
    const showSyncError = (modal, message) => {
        const errorAlert = modal.querySelector('#syncErrorAlert');
        const errorText = modal.querySelector('#syncErrorText');

        errorText.textContent = message;
        errorAlert.classList.remove('d-none');

        // Hide other alerts
        modal.querySelector('#syncProgressAlert').classList.add('d-none');
        modal.querySelector('#syncSuccessAlert').classList.add('d-none');
    };

    // Initialize GitHub UI
    setupGitHubUI();

    window.addEventListener('load', () => {
        requestAnimationFrame(() => {
            setTimeout(hidePageLoader, 200);
        });
    });

});
