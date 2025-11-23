# NotesHubBidi - GitHub-Powered Markdown Note-Taking App

## Project Overview

NotesHubBidi is a sophisticated, client-side web application for writing and previewing Markdown text with live rendering, enhanced code blocks, and customizable features. The application is specifically designed to support bidirectional text (RTL/LTR), making it particularly suitable for Persian and Arabic content while maintaining full functionality for general markdown usage.

## Core Features

### 1. Real-time Markdown Rendering
- Live preview of markdown as you type using `marked.js`
- Manual rendering option with toggle
- Debounced rendering for performance

### 2. Multi-file Tab System
- Manage multiple markdown documents simultaneously
- Create, rename, and delete documents
- Local storage persistence for all files
- Tabbed interface for easy navigation

### 3. Theme Management
- Light/dark mode toggle
- Smooth transitions between themes
- Custom CSS variables for consistent theming
- Persistent theme preferences

### 4. Advanced Text Direction Controls
- General text direction (LTR/RTL)
- Inline code direction control
- Code block direction control
- Essential for multilingual support (Persian/Arabic)

### 5. Enhanced Code Blocks
- Language detection and display
- Copy-to-clipboard functionality
- Collapsible code blocks with smooth animations
- Syntax highlighting using highlight.js

### 6. Mathematical Expression Support
- LaTeX math rendering using KaTeX
- Support for inline ($...$) and display ($$...$$) math
- Math toggle (on/off) for performance control

### 7. Rich Markdown Toolbar
- Quick access buttons for common markdown syntax
- Keyboard shortcuts (Ctrl/Cmd+B, I, K)
- Support for headings, lists, links, images, and more

### 8. Additional Features
- Character and word count
- Copy output with styling preservation
- Full-height mode for immersive editing
- Input panel toggle for focus mode
- Responsive design for all devices
- PWA with offline capabilities

## Technical Architecture

### Technologies Used
- **HTML5**: Structure of the web page
- **CSS3**: Styling, layout, and theming with CSS variables
- **JavaScript (ES6+)**: Core logic, DOM manipulation, event handling
- **[Marked.js](https://marked.js.org/)**: Markdown parsing library
- **[Highlight.js](https://highlightjs.org/)**: Syntax highlighting for code blocks
- **[KaTeX](https://katex.org/)**: LaTeX math rendering
- **[Bootstrap 5.3](https://getbootstrap.com/)**: UI framework for styling and grid system
- **[Bootstrap Icons](https://icons.getbootstrap.com/)**: Icon library
- **[Vazirmatn Font](https://fonts.google.com/specimen/Vazirmatn)**: Custom font for RTL language support
- **[Poppins Font](https://fonts.google.com/specimen/Poppins)**: Modern UI font

### File Structure
```
├── index.html           # Main HTML structure with comprehensive comments
├── script.js           # Main application logic (fully documented)
├── src/markdown/renderer.js # Markdown rendering module
├── style.css           # Comprehensive styling with CSS variables
├── package.json        # Dependencies and build scripts
├── vite.config.js      # Build configuration
├── CONTEXT.md          # This file
├── CONTRIBUTING.md     # Contribution guidelines
├── README.md           # Main documentation
├── markdown-test.md    # Test content for validation
├── public/             # Static assets and PWA files
│   ├── manifest.json   # PWA manifest
│   ├── sw.js          # Service worker
│   ├── logo.png       # App icons
│   └── favicon.ico    # Favicon
└── styles/             # Additional style files (if any)
```

### Core Application Flow

1. **Initialization**: DOM content loaded, elements cached, state initialized
2. **File System**: Initialize multi-file system from local storage
3. **UI Setup**: Apply saved preferences (theme, directions, etc.)
4. **Event Binding**: Set up all event listeners
5. **Rendering**: Process markdown content and display

### Rendering Pipeline

1. Extract math expressions to protect from markdown processing
2. Parse markdown to HTML using marked.js
3. Restore and render math expressions using KaTeX
4. Apply syntax highlighting to code blocks using highlight.js
5. Enhance code blocks with interactive features
6. Apply directional styling as specified

### Storage System

- **Local Storage Keys**:
  - `markdownFiles`: All user documents
  - `markdownActiveFileId`: Currently active file
  - `markdownRendererTheme`: Current theme preference
  - `markdownRendererInputVisible`: Input panel visibility
  - `markdownRendererAutoRender`: Auto-render setting
  - `markdownRendererTextDir`: General text direction
  - `markdownRendererInlineCodeDir`: Inline code direction
  - `markdownRendererCodeDir`: Code block direction
  - `markdownRendererMathRender`: Math rendering preference
  - `markdownRendererFullHeightMode`: Full height mode setting

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Key Code Patterns

### Debounced Functions
Performance optimization using debounce for rendering and saving:
```javascript
const debouncedRender = debounce(renderMarkdown, 300);
const debouncedSaveInput = debounce(saveToFile, 1000);
```

### Theme Management
CSS custom properties with Bootstrap 5 theme attributes:
```css
:root {
  --body-bg: #ffffff;
  --output-bg: #f8f9fa;
  /* ... */
}

html[data-bs-theme="dark"] {
  --body-bg: #212529;
  --body-color: #dee2e6;
  /* ... */
}
```

### Direction Control System
Separate controls for different content types:
- General text direction
- Inline code direction
- Code block direction
- Each stored separately in localStorage

### PWA Implementation
Service worker for offline functionality and app-like experience.

## Special Considerations

### RTL/LTR Support
The application handles bidirectional text with separate controls for:
- General document direction
- Inline code direction (using `<code>` tags)
- Code block direction (using fenced code blocks)

### Math Expression Handling
Special care is taken to preserve math expressions during markdown parsing by temporarily replacing them with placeholders, processing markdown, then restoring and rendering math with KaTeX.

### Performance Optimization
- Debounced rendering to prevent excessive processing during typing
- Efficient DOM updates
- Selective processing to avoid re-processing already enhanced elements

## Contributing

This project is open-source and welcomes contributions. The codebase is thoroughly documented to help contributors understand the architecture and make meaningful contributions. Refer to CONTRIBUTING.md for detailed guidelines.

## Deployment

The application is configured for GitHub Pages deployment with Vite's base path configuration. The project is designed to run entirely in the browser with no server requirements after initial page load (excluding CDN dependencies).

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.