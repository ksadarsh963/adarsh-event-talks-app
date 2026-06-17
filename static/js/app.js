// Application State
let releaseNotes = [];
let filteredNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedNote = null;

// DOM Elements
const notesGrid = document.getElementById('notesGrid');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const retryBtn = document.getElementById('retryBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterTabs = document.getElementById('filterTabs');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const themeToggle = document.getElementById('themeToggle');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statLastChecked = document.getElementById('statLastChecked');
const statLatestDate = document.getElementById('statLatestDate');

// Tweet Panel Elements
const tweetPanel = document.getElementById('tweetPanel');
const tweetPreviewText = document.getElementById('tweetPreviewText');
const charCounter = document.getElementById('charCounter');
const closePanelBtn = document.getElementById('closePanelBtn');
const deselectBtn = document.getElementById('deselectBtn');
const sendTweetBtn = document.getElementById('sendTweetBtn');

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    // Restore theme
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.body.classList.add('light-theme');
    }
    
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh buttons
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    retryBtn.addEventListener('click', fetchReleaseNotes);

    // Search bar
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });

    // Filter tabs
    filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        activeFilter = tab.dataset.type;
        applyFiltersAndSearch();
    });

    // Empty state reset button
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        activeFilter = 'all';
        
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.type === 'all') t.classList.add('active');
        });
        
        applyFiltersAndSearch();
    });

    // Close panel actions
    closePanelBtn.addEventListener('click', deselectCurrentNote);
    deselectBtn.addEventListener('click', deselectCurrentNote);

    // Edit tweet event to update char count
    tweetPreviewText.addEventListener('input', () => {
        updateCharCounter();
    });

    // Send tweet
    sendTweetBtn.addEventListener('click', () => {
        if (!selectedNote) return;
        const text = tweetPreviewText.innerText;
        
        // Open X/Twitter Intent
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    });

    // Theme toggle
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Export CSV
    exportCsvBtn.addEventListener('click', exportToCSV);
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
    setLoading(true);
    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();
        
        if (data.success) {
            releaseNotes = data.notes;
            setLoading(false);
            updateStats();
            applyFiltersAndSearch();
        } else {
            showError(data.error || 'Failed to fetch release notes.');
        }
    } catch (err) {
        showError(err.message || 'A network error occurred.');
    }
}

// Set loading UI state
function setLoading(isLoading) {
    if (isLoading) {
        loadingState.style.display = 'flex';
        notesGrid.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        refreshIcon.classList.add('spinner');
        refreshBtn.disabled = true;
    } else {
        loadingState.style.display = 'none';
        notesGrid.style.display = 'grid';
        refreshIcon.classList.remove('spinner');
        refreshBtn.disabled = false;
    }
}

// Show error UI state
function showError(msg) {
    loadingState.style.display = 'none';
    notesGrid.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'flex';
    errorMessage.textContent = msg;
    refreshIcon.classList.remove('spinner');
    refreshBtn.disabled = false;
}

// Update Dashboard Statistics
function updateStats() {
    statTotal.textContent = releaseNotes.length;
    
    const now = new Date();
    statLastChecked.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (releaseNotes.length > 0) {
        // Find latest date (releaseNotes is already chronological/reverse chronological from feed)
        statLatestDate.textContent = releaseNotes[0].date;
    }
    
    // Update count badges on tabs
    updateFilterBadges();
}

function updateFilterBadges() {
    const counts = {
        all: releaseNotes.length,
        feature: 0,
        announcement: 0,
        change: 0,
        issue: 0,
        breaking: 0
    };
    
    releaseNotes.forEach(note => {
        const type = note.type.toLowerCase();
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        }
    });
    
    Object.keys(counts).forEach(type => {
        const badge = document.getElementById(`count-${type}`);
        if (badge) badge.textContent = counts[type];
    });
}

// Filter and Search logic
function applyFiltersAndSearch() {
    filteredNotes = releaseNotes.filter(note => {
        // Type filter
        const matchesType = activeFilter === 'all' || note.type.toLowerCase() === activeFilter;
        
        // Search query filter
        const plainText = stripHtml(note.description).toLowerCase();
        const matchesSearch = !searchQuery || 
                              note.type.toLowerCase().includes(searchQuery) ||
                              note.date.toLowerCase().includes(searchQuery) ||
                              plainText.includes(searchQuery);
                              
        return matchesType && matchesSearch;
    });
    
    renderNotesGrid();
    
    // If the currently selected note is filtered out, deselect it
    if (selectedNote && !filteredNotes.some(n => n.id === selectedNote.id)) {
        deselectCurrentNote();
    }
}

// Render cards list
function renderNotesGrid() {
    if (filteredNotes.length === 0) {
        notesGrid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    notesGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    notesGrid.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const isSelected = selectedNote && selectedNote.id === note.id;
        const card = document.createElement('article');
        card.className = `note-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = note.id;
        card.dataset.type = note.type.toLowerCase();
        
        card.innerHTML = `
            <div class="card-header">
                <span class="type-tag">
                    <span class="tag-dot"></span>
                    ${escapeHtml(note.type)}
                </span>
                <div class="card-meta">
                    <span class="card-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        ${escapeHtml(note.date)}
                    </span>
                    <div class="select-checkbox-wrapper">
                        <input type="checkbox" class="select-checkbox" ${isSelected ? 'checked' : ''} aria-label="Select update">
                    </div>
                </div>
            </div>
            
            <div class="card-body">
                ${note.description}
            </div>
            
            <div class="card-actions">
                <a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="card-docs-link">
                    <span>Documentation</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </a>
                <div class="card-action-buttons">
                    <button class="copy-action-btn" title="Copy update text to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button class="tweet-action-btn" title="Tweet about this update">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add card selection listeners
        card.addEventListener('click', (e) => {
            // Prevent selection trigger if user clicked a link
            if (e.target.closest('a')) return;
            
            // Prevent selection trigger if clicked direct tweet button
            if (e.target.closest('.tweet-action-btn')) {
                directTweet(note);
                return;
            }
            
            // Prevent selection trigger if clicked copy button
            if (e.target.closest('.copy-action-btn')) {
                return;
            }
            
            toggleNoteSelection(note);
        });
        
        // Handle copy button click
        const copyBtn = card.querySelector('.copy-action-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop parent card click
            copyNoteToClipboard(note, copyBtn);
        });
        
        // Handle checkbox click
        const checkbox = card.querySelector('.select-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop parent card click
            toggleNoteSelection(note);
        });
        
        notesGrid.appendChild(card);
    });
}

// Toggle selected card
function toggleNoteSelection(note) {
    if (selectedNote && selectedNote.id === note.id) {
        deselectCurrentNote();
    } else {
        selectNote(note);
    }
}

// Select note and open drawer
function selectNote(note) {
    selectedNote = note;
    
    // Update UI card classes
    document.querySelectorAll('.note-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        const checkbox = card.querySelector('.select-checkbox');
        if (id === note.id) {
            card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });
    
    // Generate initial tweet draft
    const cleanText = stripHtml(note.description).replace(/\s+/g, ' ').trim();
    const intro = `🚀 BigQuery Update (${note.date})\n[${note.type}]: `;
    const hashtag = `\n#BigQuery #GCP`;
    
    // Twitter URLs count as 23 characters
    const maxTextLen = 280 - intro.length - hashtag.length - 24; // 23 for URL, +1 space
    
    let desc = cleanText;
    if (desc.length > maxTextLen) {
        desc = desc.substring(0, maxTextLen - 3) + '...';
    }
    
    const draftText = `${intro}${desc}\n${note.link}${hashtag}`;
    
    // Populate drawer
    tweetPreviewText.innerText = draftText;
    tweetPreviewText.contentEditable = "true";
    
    updateCharCounter();
    
    // Slide panel up
    tweetPanel.classList.add('active');
}

// Deselect current note and close drawer
function deselectCurrentNote() {
    selectedNote = null;
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('selected');
        const checkbox = card.querySelector('.select-checkbox');
        if (checkbox) checkbox.checked = false;
    });
    
    // Slide panel down
    tweetPanel.classList.remove('active');
}

// Direct tweet action bypassing drawer
function directTweet(note) {
    const cleanText = stripHtml(note.description).replace(/\s+/g, ' ').trim();
    const intro = `🚀 BigQuery Update (${note.date})\n[${note.type}]: `;
    const hashtag = `\n#BigQuery #GCP`;
    
    const maxTextLen = 280 - intro.length - hashtag.length - 24;
    
    let desc = cleanText;
    if (desc.length > maxTextLen) {
        desc = desc.substring(0, maxTextLen - 3) + '...';
    }
    
    const draftText = `${intro}${desc}\n${note.link}${hashtag}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(draftText)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
}

// Update character counter in the tweet drawer
function updateCharCounter() {
    if (!selectedNote) return;
    
    const text = tweetPreviewText.innerText;
    
    // Calculate length accounting for Twitter's 23-char link policy
    const link = selectedNote.link || '';
    const hasLink = text.includes(link);
    
    let count = text.length;
    if (hasLink) {
        // Subtract actual link length and add 23
        count = (text.length - link.length) + 23;
    }
    
    const remaining = 280 - count;
    charCounter.textContent = remaining;
    
    // Visual indicators for character limits
    if (remaining < 0) {
        charCounter.className = 'char-counter error';
        sendTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        charCounter.className = 'char-counter warning';
        sendTweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        sendTweetBtn.disabled = false;
    }
}

// Helper: Strip HTML tags
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// Helper: Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Copy update text to clipboard
function copyNoteToClipboard(note, btnElement) {
    const cleanText = stripHtml(note.description).replace(/\s+/g, ' ').trim();
    const textToCopy = `🚀 BigQuery Update (${note.date})\n[${note.type}]: ${cleanText}\nSource: ${note.link}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
        `;
        btnElement.disabled = true;
        
        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Export current filtered notes to CSV
function exportToCSV() {
    if (filteredNotes.length === 0) {
        alert("No release notes to export.");
        return;
    }
    
    const headers = ['ID', 'Date', 'Type', 'Description', 'Link'];
    const rows = filteredNotes.map(note => [
        note.id,
        note.date,
        note.type,
        stripHtml(note.description).replace(/\s+/g, ' ').trim(),
        note.link
    ]);
    
    // Convert to CSV, escaping double quotes
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `bigquery_release_notes_${activeFilter}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
