/**
 * NoteSmart - Note Editor Implementation
 * Comprehensive implementation for note editing functionality
 */

// Global variables for editor state
let quill; // Quill editor instance
let autoSaveTimer; // Timer for auto-save functionality
let currentNoteId = null;
let currentNotebookId = null;
let isEditorDirty = false;
let lastSavedTime = null;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize Quill or get existing instance safely
    function initializeQuill() {
        // Look for the existing ID in your HTML
        const editorContainer = document.getElementById('quillEditor');

        if (!editorContainer) {
            console.warn('Editor container not found, will try again when loading notes');
            return null;
        }

        try {
            return new Quill(editorContainer, {
                theme: 'snow',
                placeholder: 'Compose your note...',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'indent': '-1' }, { 'indent': '+1' }],
                        ['link', 'image'],
                        ['clean']
                    ]
                }
            });
        } catch (error) {
            console.error('Error initializing Quill:', error);
            return null;
        }
    }


    // Initialize Quill on page load
    quill = initializeQuill();
    if (!quill) {
        console.error('Failed to initialize Quill editor');
    }

    /**
     * Loads notes for a specific notebook
     * @param {number} notebookId - ID of the notebook to load notes for
     * @param {string} notebookTitle - Title of the notebook
     */
    window.loadNotebookNotes = function (notebookId, notebookTitle) {
        console.log(`Loading notes for notebook: ${notebookId} - ${notebookTitle}`);

        try {
            // Update UI to show selected notebook
            document.querySelectorAll('.notebook-item').forEach(item => {
                item.classList.remove('active');
            });

            const notebookElement = document.querySelector(`.notebook-item[data-notebook-id="${notebookId}"]`);
            if (notebookElement) {
                notebookElement.classList.add('active');
            }

            // Set current notebook
            currentNotebookId = notebookId;

            // Update UI fields
            const notebookIdField = document.getElementById('currentNotebookId');
            if (notebookIdField) notebookIdField.value = notebookId;

            const titleElement = document.getElementById('currentNotebookTitle');
            if (titleElement) titleElement.textContent = notebookTitle;

            const newNoteBtn = document.getElementById('newNoteBtn');
            if (newNoteBtn) newNoteBtn.style.display = 'block';

            // Get notes list container
            const notesList = document.getElementById('notesList');
            if (!notesList) {
                console.error("Notes list container not found");
                return;
            }

            // Show loading indicator
            notesList.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading notes...</div>';

            // Fetch notes for this notebook
            fetch(`/api/Notes/ByNotebook/${notebookId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }

                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        return { notes: [] };
                    }

                    return response.json();
                })
                .then(data => {
                    if (!notesList) return;

                    notesList.innerHTML = '';

                    // Handle different response formats
                    let notes = [];
                    if (Array.isArray(data)) {
                        notes = data;
                    } else if (data && Array.isArray(data.notes)) {
                        notes = data.notes;
                    } else if (typeof data === 'object') {
                        notes = Object.values(data).filter(item => typeof item === 'object');
                    }

                    if (notes.length === 0) {
                        notesList.innerHTML = '<div class="text-center p-3 text-muted">No notes in this notebook</div>';
                        return;
                    }

                    // Render each note
                    notes.forEach(note => {
                        if (!note || !note.id) return;

                        const noteElement = document.createElement('div');
                        noteElement.className = 'note-item';
                        noteElement.setAttribute('data-note-id', note.id);
                        noteElement.innerHTML = `
                            <i class="bi bi-sticky me-2"></i>
                            <span class="note-title">${note.title || 'Untitled Note'}</span>
                        `;

                        // FIX: Properly attach event listener instead of inline onclick
                        noteElement.addEventListener('click', function () {
                            // Clear active class from all notes
                            document.querySelectorAll('.note-item').forEach(item => {
                                item.classList.remove('active');
                            });

                            // Add active class to clicked note
                            this.classList.add('active');

                            // Load the note content
                            loadNoteContent(note.id);
                        });

                        notesList.appendChild(noteElement);
                    });
                })
                .catch(error => {
                    console.error('Error loading notes:', error);
                    if (notesList) {
                        notesList.innerHTML = `<div class="text-center p-3 text-danger">Error loading notes: ${error.message}</div>`;
                    }
                });
        } catch (err) {
            console.error('Error in loadNotebookNotes function:', err);
        }
    };

    /**
     * Loads content for a specific note
     * @param {number} noteId - ID of the note to load
     * @param {number} retryCount - Current retry attempt (for internal use)
     */
    function loadNoteContent(noteId, retryCount = 0) {
        const MAX_RETRIES = 3;
        console.log(`Loading note ID: ${noteId}`);

        // Ensure Quill is initialized
        if (!quill) {
            quill = initializeQuill();
            if (!quill) {
                console.error('Quill instance not available, cannot load note');
                return;
            }
        }

        // Find note title field (trying multiple potential IDs)
        const noteTitleField = document.getElementById('note-Title') ||
            document.getElementById('noteTitle') ||
            document.getElementById('noteTitleField');

        // Show loading indicators
        if (noteTitleField) {
            noteTitleField.value = 'Loading...';
        }

        try {
            quill.setText('Loading note content...');
            quill.disable();
        } catch (err) {
            console.error('Error setting Quill text:', err);
        }

        // Fetch note data
        fetch(`/api/Notes/${noteId}`)
            .then(response => {
                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json().then(errorData => {
                            throw new Error(`Failed to load note: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
                        });
                    }
                    throw new Error(`Failed to load note: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(note => {
                console.log(`Successfully loaded note: ${note.id}`);

                // Update title if field exists
                if (noteTitleField) {
                    noteTitleField.value = note.title || 'Untitled';
                }

                // Update editor content safely
                try {
                    quill.setContents([]);
                    quill.clipboard.dangerouslyPasteHTML(0, note.content || '');
                    quill.enable();
                } catch (err) {
                    console.error('Error updating Quill content:', err);
                }

                // Update note ID and reference
                currentNoteId = note.id;
                const currentNoteIdField = document.getElementById('currentNoteId');
                if (currentNoteIdField) {
                    currentNoteIdField.value = note.id;
                }

                // Update timestamp if function exists
                if (note.updatedAt) {
                    updateLastSavedTime(new Date(note.updatedAt));
                }

                // Reset edit tracking
                isEditorDirty = false;
            })
            .catch(error => {
                console.error(`Error loading note ${noteId}:`, error);

                // Implement retry for server errors
                if (retryCount < MAX_RETRIES &&
                    (error.message.includes('500') ||
                        error.message.includes('NetworkError'))) {

                    const delay = Math.pow(2, retryCount) * 1000;
                    console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms`);

                    setTimeout(() => {
                        loadNoteContent(noteId, retryCount + 1);
                    }, delay);
                    return;
                }

                // Show error in UI
                if (noteTitleField) {
                    noteTitleField.value = 'Error loading note';
                }

                // Update editor with error message safely
                try {
                    quill.setText('');
                    quill.clipboard.dangerouslyPasteHTML(0, `
                        <div class="error-message" style="color: #d9534f; padding: 15px; border: 1px solid #d9534f; border-radius: 4px;">
                            <h3>Error Loading Note</h3>
                            <p>${error.message}</p>
                            <p>Please try refreshing the page or contact support if the issue persists.</p>
                            <button class="btn btn-sm btn-danger mt-3 retry-button">Retry</button>
                        </div>
                    `);

                    // Use event delegation for retry button
                    document.querySelector('.ql-editor').addEventListener('click', function (event) {
                        if (event.target.classList.contains('retry-button')) {
                            loadNoteContent(noteId);
                        }
                    });

                    quill.disable();
                } catch (err) {
                    console.error('Error showing error message in editor:', err);
                }
            });
    }

    // Make loadNoteContent globally available
    window.loadNoteContent = loadNoteContent;

    /**
     * Function to toggle notebook expansion
     * FIX: This is likely the source of the HTMLDivElement.onclick error
     */
    window.toggleNotebook = function (notebookId) {
        const notesContainer = document.getElementById(`notes-${notebookId}`);
        const notebookItem = document.querySelector(
            `.notebook-item[data-notebook-id="${notebookId}"]`
        );

        if (!notesContainer || !notebookItem) {
            console.error(`Elements not found for notebook ID: ${notebookId}`);
            return;
        }

            // Toggle expanded class
            notesContainer.classList.toggle('expanded');

            // Toggle icon rotation
            const toggleIcon = notebookItem.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.classList.toggle('rotated');
            }

            // Load notes if expanding
            if (notesContainer.classList.contains('expanded')) {
                const notebookTitle = notebookItem.querySelector('.notebook-title')?.textContent || '';
                loadNotebookNotes(notebookId, notebookTitle);
            }
        } catch (err) {
            console.error('Error toggling notebook:', err);
        }
    };

    /**
     * Creates a new note in the current notebook
     */
    function createNewNote() {
        // Check prerequisites
        if (!currentNotebookId) {
            showToast('Please select a notebook first', 'warning');
            return;
        }

        // Ensure Quill is initialized
        if (!quill) {
            quill = initializeQuill();
            if (!quill) {
                showToast('Could not initialize editor', 'danger');
                return;
            }
        }

        // Get references to DOM elements
        const noteEditorEmpty = document.getElementById('noteEditorEmpty');
        const noteEditor = document.getElementById('noteEditor');
        const noteTitleField = document.getElementById('noteTitleField') ||
            document.getElementById('note-Title') ||
            document.getElementById('noteTitle');
        const lastSavedText = document.getElementById('lastSavedText');

        // Set up UI for new note
        if (noteEditorEmpty) noteEditorEmpty.classList.add('d-none');
        if (noteEditor) noteEditor.classList.remove('d-none');

        if (noteTitleField) {
            noteTitleField.value = 'Untitled Note';
            noteTitleField.focus();
            noteTitleField.select();
        }

        // Clear editor
        try {
            quill.setContents([]);
            quill.enable();
        } catch (err) {
            console.error('Error clearing editor:', err);
        }

        // Reset note state
        currentNoteId = null;
        const currentNoteIdField = document.getElementById('currentNoteId');
        if (currentNoteIdField) currentNoteIdField.value = '';

        // Update saved time indicator
        if (lastSavedText) {
            lastSavedText.textContent = 'Not saved yet';
        }

        // Clear active class from all notes
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });

        isEditorDirty = false;
    }

    // Make createNewNote globally available
    window.createNewNote = createNewNote;

    /**
     * Saves the current note
     */
    function saveNote() {
        if (!isEditorDirty || !quill) return;

        // Get note data
        const noteTitleField = document.getElementById('noteTitleField') ||
            document.getElementById('note-Title') ||
            document.getElementById('noteTitle');

        if (!noteTitleField) {
            console.error('Note title field not found');
            return;
        }

        const noteTitle = noteTitleField.value || 'Untitled Note';
        let noteContent;

        try {
            noteContent = quill.root.innerHTML;
        } catch (err) {
            console.error('Error getting Quill content:', err);
            return;
        }

        // Validate notebook
        if (!currentNotebookId) {
            showToast('Cannot save note: No notebook selected', 'danger');
            return;
        }

        // Prepare form data
        const formData = new FormData();
        formData.append('Title', noteTitle);
        formData.append('Content', noteContent || '<p></p>');
        formData.append('NotebookId', currentNotebookId);

        // Include ID for updates
        if (currentNoteId) {
            formData.append('Id', currentNoteId);
        }

        // Add CSRF token
        const tokenElement = document.querySelector('input[name="__RequestVerificationToken"]');
        if (tokenElement) {
            formData.append('__RequestVerificationToken', tokenElement.value);
        }

        // Choose endpoint based on operation
        const url = currentNoteId
            ? `/api/Notes/update/${currentNoteId}`
            : '/api/Notes/create';

        const method = currentNoteId ? 'PUT' : 'POST';

        // Send request
        fetch(url, {
            method: method,
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errors => {
                        throw new Error(`Save failed: ${JSON.stringify(errors)}`);
                    }).catch(() => {
                        throw new Error(`Save failed with status ${response.status}: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(savedNote => {
                // Update state with saved note info
                currentNoteId = savedNote.id;

                const currentNoteIdField = document.getElementById('currentNoteId');
                if (currentNoteIdField) {
                    currentNoteIdField.value = savedNote.id;
                }

                isEditorDirty = false;
                updateLastSavedTime(new Date());

                // Show success message
                showToast('Note saved successfully', 'success');

                // Refresh notes list if this was a new note
                if (method === 'POST') {
                    const notebookTitle = document.getElementById('currentNotebookTitle')?.textContent || '';
                    loadNotebookNotes(currentNotebookId, notebookTitle);
                }
            })
            .catch(error => {
                console.error('Error saving note:', error);
                showToast('Failed to save note: ' + error.message, 'danger');
            });
    }

    /**
     * Updates the last saved time in the UI
     */
    function updateLastSavedTime(date) {
        lastSavedTime = date;
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const lastSavedText = document.getElementById('lastSavedText');
        if (lastSavedText) {
            lastSavedText.textContent = `Last saved at ${timeString}`;
        }
    }

    /**
     * Resets the auto-save timer
     */
    function resetAutoSaveTimer() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function () {
            saveNote();
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    /**
     * Shows a toast notification
     */
    function showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        // Create toast content
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toastEl);

        // Initialize and show the toast
        try {
            const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
            toast.show();

            // Remove the toast element when hidden
            toastEl.addEventListener('hidden.bs.toast', function () {
                toastEl.remove();
            });
        } catch (err) {
            console.error('Error showing toast:', err);
            // Fallback if Bootstrap's Toast isn't available
            setTimeout(() => {
                toastEl.remove();
            }, 3000);
        }
    }

    // Make showToast globally available
    window.showToast = showToast;

    /**
     * Initialize all event handlers
     */
    function initializeEventHandlers() {
        // Initialize notebook toggle handlers
        document.querySelectorAll('.notebook-header').forEach(header => {
            // FIX: This replaces problematic inline onclick handlers
            header.addEventListener('click', function () {
                const notebookId = this.closest('.notebook-item')?.dataset.notebookId;
                if (notebookId) {
                    toggleNotebook(notebookId);
                }
            });
        });

        // Initialize note click handlers
        document.querySelectorAll('[data-note-id]').forEach(noteLink => {
            noteLink.addEventListener('click', function (e) {
                e.preventDefault();
                const noteId = this.dataset.noteId;
                loadNoteContent(noteId);
            });
        });

        // Initialize new note button
        const newNoteBtn = document.getElementById('newNoteBtn');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', createNewNote);
        }

        // Set up auto-save for title changes
        const noteTitleField = document.getElementById('noteTitleField') ||
            document.getElementById('note-Title') ||
            document.getElementById('noteTitle');
        if (noteTitleField) {
            noteTitleField.addEventListener('input', function () {
                isEditorDirty = true;
                resetAutoSaveTimer();
            });
        }

        // Set up auto-save for content changes
        if (quill) {
            quill.on('text-change', function () {
                isEditorDirty = true;
                resetAutoSaveTimer();
            });
        }
    }

    // Initialize everything
    initializeEventHandlers();

    // Load initially selected note if present
    const initialNoteId = document.querySelector('[data-initial-note]')?.dataset.initialNote;
    if (initialNoteId) {
        loadNoteContent(initialNoteId);
    }

    // Watch for dynamic content changes and reinitialize handlers as needed
    try {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length > 0) {
                    // Reinitialize handlers for new elements
                    initializeEventHandlers();
                }
            });
        });

        // Start observing the document
        observer.observe(document.body, { childList: true, subtree: true });
    } catch (err) {
        console.error('Error setting up mutation observer:', err);
    }
});
