/**
 * GitHub Integration Module
 *
 * This module provides GitHub integration for the NotesHubBidi application,
 * allowing users to save and load markdown notes from a private GitHub repository.
 *
 * Features:
 * - GitHub OAuth authentication
 * - File operations (create, update, delete) in a specified repository
 * - Error handling and user feedback
 * - Local storage caching for offline access
 *
 * @module github-integration
 * @author Matin KG
 * @version 1.0.0
 */

/**
 * GitHub API utility class for managing GitHub operations
 */
export class GitHubAPI {
    constructor() {
        this.token = this.getToken();
        this.repoOwner = localStorage.getItem('githubRepoOwner') || '';
        this.repoName = localStorage.getItem('githubRepoName') || '';
        this.branch = localStorage.getItem('githubBranch') || 'main';
        this.apiBase = 'https://api.github.com';
    }

    /**
     * Get stored GitHub token from localStorage
     * @returns {string|null} GitHub token or null if not available
     */
    getToken() {
        return localStorage.getItem('githubToken') || null;
    }

    /**
     * Set GitHub token and save to localStorage
     * @param {string} token - GitHub personal access token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('githubToken', token);
    }

    /**
     * Remove GitHub token and clear authentication
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('githubToken');
    }

    /**
     * Set repository information
     * @param {string} owner - Repository owner
     * @param {string} name - Repository name
     * @param {string} [branch='main'] - Branch name
     */
    setRepository(owner, name, branch = 'main') {
        this.repoOwner = owner;
        this.repoName = name;
        this.branch = branch;
        
        localStorage.setItem('githubRepoOwner', owner);
        localStorage.setItem('githubRepoName', name);
        localStorage.setItem('githubBranch', branch);
    }

    /**
     * Check if user is authenticated with GitHub
     * @returns {boolean} True if authenticated, false otherwise
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Check if repository is configured
     * @returns {boolean} True if repository is configured, false otherwise
     */
    isRepositoryConfigured() {
        return !!(this.repoOwner && this.repoName);
    }

    /**
     * Make a request to the GitHub API
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {object} body - Request body (optional)
     * @param {object} headers - Additional headers (optional)
     * @returns {Promise} Promise resolving to the API response
     */
    async makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
        if (!this.token) {
            throw new Error('GitHub token not set. Please authenticate first.');
        }

        const url = `${this.apiBase}${endpoint}`;
        const config = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...headers
            }
        };

        if (body) {
            config.body = typeof body === 'string' ? body : JSON.stringify(body);
            config.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('GitHub API error:', error);
            throw error;
        }
    }

    /**
     * Get repository information to verify access
     * @returns {Promise} Promise resolving to repository information
     */
    async getRepositoryInfo() {
        if (!this.isRepositoryConfigured()) {
            throw new Error('Repository not configured. Please set repository owner and name.');
        }

        const endpoint = `/repos/${this.repoOwner}/${this.repoName}`;
        return await this.makeRequest(endpoint, 'GET');
    }

    /**
     * List files in the repository
     * @param {string} path - Directory path in the repository (default: root)
     * @returns {Promise} Promise resolving to list of files
     */
    async listFiles(path = '') {
        if (!this.isRepositoryConfigured()) {
            throw new Error('Repository not configured. Please set repository owner and name.');
        }

        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}?ref=${this.branch}`;
        return await this.makeRequest(endpoint, 'GET');
    }

    /**
     * Read a file from the repository
     * @param {string} path - File path in the repository
     * @returns {Promise} Promise resolving to file content
     */
    async readFile(path) {
        if (!this.isRepositoryConfigured()) {
            throw new Error('Repository not configured. Please set repository owner and name.');
        }

        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}?ref=${this.branch}`;
        const data = await this.makeRequest(endpoint, 'GET');

        if (data.content) {
            // GitHub API returns content as base64 encoded string
            const content = atob(data.content);
            return {
                content: content,
                sha: data.sha,
                path: data.path
            };
        }

        throw new Error('Invalid response format');
    }

    /**
     * Write a file to the repository
     * @param {string} path - File path in the repository
     * @param {string} content - File content
     * @param {string} message - Commit message
     * @param {string} [sha] - SHA of existing file for updates (optional)
     * @returns {Promise} Promise resolving to commit information
     */
    async writeFile(path, content, message, sha = null) {
        if (!this.isRepositoryConfigured()) {
            throw new Error('Repository not configured. Please set repository owner and name.');
        }

        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        
        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(content))), // Encode content as base64
            branch: this.branch
        };

        if (sha) {
            body.sha = sha; // Include SHA for updates
        }

        return await this.makeRequest(endpoint, 'PUT', body);
    }

    /**
     * Delete a file from the repository
     * @param {string} path - File path in the repository
     * @param {string} message - Commit message
     * @param {string} sha - SHA of the file to delete
     * @returns {Promise} Promise resolving to commit information
     */
    async deleteFile(path, message, sha) {
        if (!this.isRepositoryConfigured()) {
            throw new Error('Repository not configured. Please set repository owner and name.');
        }

        const endpoint = `/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        
        const body = {
            message: message,
            sha: sha,
            branch: this.branch
        };

        return await this.makeRequest(endpoint, 'DELETE', body);
    }

    /**
     * Get all markdown files from the repository
     * @returns {Promise} Promise resolving to array of markdown file objects
     */
    async getMarkdownFiles() {
        const files = await this.listFiles('');
        return files.filter(file => file.type === 'file' && file.name.endsWith('.md'));
    }
}

/**
 * GitHub Synchronization Manager
 */
export class GitHubSyncManager {
    constructor(githubAPI) {
        this.githubAPI = githubAPI;
    }

    /**
     * Sync local files to GitHub repository
     * @param {Object} localFiles - Local files object {id: {id, name, content}}
     * @param {boolean} [overwrite=false] - Whether to overwrite existing files
     * @returns {Promise} Promise resolving to sync results
     */
    async syncToGitHub(localFiles, overwrite = false) {
        const results = {
            success: [],
            failed: [],
            skipped: []
        };

        for (const [id, file] of Object.entries(localFiles)) {
            try {
                const fileName = this.sanitizeFileName(file.name) + '.md';
                let sha = null;
                
                // Check if file already exists in the repository
                try {
                    const existingFile = await this.githubAPI.readFile(fileName);
                    sha = existingFile.sha;
                    
                    if (!overwrite) {
                        results.skipped.push({
                            id: file.id,
                            name: file.name,
                            reason: 'exists'
                        });
                        continue;
                    }
                } catch (error) {
                    // File doesn't exist, that's okay for new files
                    sha = null;
                }

                const commitMessage = sha 
                    ? `Update ${fileName} via NotesHubBidi`
                    : `Add ${fileName} via NotesHubBidi`;

                await this.githubAPI.writeFile(
                    fileName,
                    file.content,
                    commitMessage,
                    sha
                );

                results.success.push({
                    id: file.id,
                    name: file.name,
                    path: fileName
                });
            } catch (error) {
                results.failed.push({
                    id: file.id,
                    name: file.name,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Load files from GitHub repository
     * @param {Function} fileProcessor - Function to process each loaded file
     * @returns {Promise} Promise resolving to load results
     */
    async loadFromGitHub(fileProcessor) {
        const results = {
            success: [],
            failed: []
        };

        try {
            const markdownFiles = await this.githubAPI.getMarkdownFiles();
            
            for (const file of markdownFiles) {
                try {
                    const fileData = await this.githubAPI.readFile(file.path);
                    
                    // Process the file content
                    const processedFile = fileProcessor(fileData);
                    
                    results.success.push({
                        name: file.name,
                        path: file.path,
                        processed: !!processedFile
                    });
                } catch (error) {
                    results.failed.push({
                        name: file.name,
                        path: file.path,
                        error: error.message
                    });
                }
            }
        } catch (error) {
            console.error('Error loading files from GitHub:', error);
            throw error;
        }

        return results;
    }

    /**
     * Sanitize file name to be GitHub-compatible
     * @param {string} name - Original file name
     * @returns {string} Sanitized file name
     */
    sanitizeFileName(name) {
        // Replace special characters and spaces with hyphens
        return name
            .trim()
            .replace(/[^a-zA-Z0-9\s._-]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100) // Limit length
            .toLowerCase() || 'untitled-file';
    }
}