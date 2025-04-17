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

// FIX: Add request tracking to prevent race conditions
let activeRequests = {
    loadingNotebook: null, // AbortController for loading notebooks
    loadingNote: null      // AbortController for loading notes
};
//let currentNotebookId = null;
const cancelActiveRequests = (type) => {
    if (activeRequests[type] && activeRequests[type].abort) {
        console.log(`Aborting active ${type} request`);
        activeRequests[type].abort();
        activeRequests[type] = null;
    }
};
function refreshNotesList() {
    if (!currentNotebookId) {
        console.warn('No active notebook to refresh');
        return;
    }

    // Create new abort controller for this refresh request
    activeRequests.loadingNotebook = new AbortController();
    const signal = activeRequests.loadingNotebook.signal;

    // Show loading indicator
    showNotesLoadingIndicator();

    // Fetch and render the updated notes
    fetchNotebookNotes(currentNotebookId, signal)
        .then(data => {
            renderNotesList(data, signal);
            activeRequests.loadingNotebook = null;
            isNoteDeleted = false;
        })
        .catch(error => {
            if (error.name !== 'AbortError' && error.message !== 'Request aborted') {
                console.error('Error refreshing notes:', error);
                showNotesError(error.message);
            }
            activeRequests.loadingNotebook = null;
        });
}
// Global tracking variables (assuming these are defined elsewhere in the codebase)
// let currentNotebookId;
// let activeRequests = { loadingNotebook: null, loadingNote: null };

/**
 * Cancels an active request of the specified type
 * @param {string} requestType - Type of request to cancel ('notebook' or 'note')
 */
function cancelActiveRequest(requestType) {
    const requestKey = `loading${requestType.charAt(0).toUpperCase() + requestType.slice(1)}`;
    if (activeRequests[requestKey] && activeRequests[requestKey].abort) {
        console.log(`Canceling active ${requestType} request`);
        activeRequests[requestKey].abort();
        activeRequests[requestKey] = null;
    }
}

/**
 * Updates UI to show the selected notebook as active
 * @param {string} notebookId - ID of the selected notebook
 */
function updateNotebookSelectionUI(notebookId) {
    // Reset active state on all notebooks
    document.querySelectorAll('.notebook-item').forEach(item => {
        item.classList.remove('active');
    });

    // Set active state on selected notebook
    const notebookElement = document.querySelector(`.notebook-item[data-notebook-id="${notebookId}"]`);
    if (notebookElement) {
        notebookElement.classList.add('active');

        // Toggle icon rotation
        const toggleIcon = notebookElement.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.classList.toggle('rotated');
        }
    }
}

/**
 * Updates the UI fields with current notebook information
 * @param {string} notebookId - ID of the current notebook
 * @param {string} notebookTitle - Title of the current notebook
 */
function updateNotebookInfoUI(notebookId, notebookTitle) {
    // Update hidden field with notebook ID
    const notebookIdField = document.getElementById('currentNotebookId');
    if (notebookIdField) notebookIdField.value = notebookId;

    // Update title display
    const titleElement = document.getElementById('currentNotebookTitle');
    if (titleElement) titleElement.textContent = notebookTitle;

    // Show new note button
    const newNoteBtn = document.getElementById('newNoteBtn');
    if (newNoteBtn) newNoteBtn.style.display = 'block';

    // Show delete notebook button
    const deleteNotebookBtn = document.getElementById('deleteNotebookBtn');
    if (deleteNotebookBtn) deleteNotebookBtn.style.display = 'inline-block';
}

/**
 * Shows a loading indicator in the notes list
 */
function showNotesLoadingIndicator() {
    const notesList = document.getElementById('notesList');
    if (notesList) {
        notesList.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading notes...</div>';
    }
}

/**
 * Shows an error message in the notes list
 * @param {string} errorMessage - Error message to display
 */
function showNotesError(errorMessage) {
    const notesList = document.getElementById('notesList');
    if (notesList) {
        notesList.innerHTML = `<div class="text-center p-3 text-danger">Error loading notes: ${errorMessage}</div>`;
    }
}

/**
 * Creates a note element for display in the notes list
 * @param {Object} note - Note data object
 * @returns {HTMLElement} - Created note element
 */
function createNoteElement(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    noteElement.setAttribute('data-note-id', note.id);
    noteElement.innerHTML = `
    <div class="note-item" data-note-id="${note.id}">
      <i class="bi bi-sticky me-2"></i>
      <span class="note-title">${note.title || 'Untitled Note'}</span>
      <div class="tags-container ms-2">
        ${(note.tags || []).map(tag => `
          <span class="badge bg-secondary me-1">${tag}</span>
        `).join('')}
      </div>
    </div>`;

    // Attach event listener for note selection
    noteElement.addEventListener('click', function (e) {
        e.preventDefault();

        // Prevent rapid clicking
        if (activeRequests.loadingNote) {
            console.log('Already loading a note, ignoring click');
            return;
        }

        // Update UI
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');

        // Load the note content
        loadNoteContent(note.id);
    });

    return noteElement;
}

/**
 * Processes the notes data and renders notes in the notes list
 * @param {Object|Array} data - Response data from the API
 * @param {AbortSignal} signal - Abort signal for the request
 */
function renderNotesList(data, signal) {
    if (signal.aborted) {
        throw new Error('Request aborted');
    }

    const notesList = document.getElementById('notesList');
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
        const noteElement = createNoteElement(note);
        notesList.appendChild(noteElement);
        isNoteDeleted = false;
    });
}

/**
 * Fetches notes for a specific notebook from the API
 * @param {string} notebookId - ID of the notebook to fetch notes for
 * @param {AbortSignal} signal - Abort signal for the request
 * @returns {Promise} - Promise resolving to the API response
 */
function fetchNotebookNotes(notebookId, signal) {
    return fetch(`/api/Notes/ByNotebook/${notebookId}`, { signal })
        .then(response => {
            if (signal.aborted) {
                throw new Error('Request aborted');
            }

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return { notes: [] };
            }

            return response.json();
        });
}

/**
 * Main function to load notes for a specific notebook
 * @param {string} notebookId - ID of the notebook to load
 * @param {string} notebookTitle - Title of the notebook to load
 */
window.loadNotebookNotes = (notebookId, notebookTitle) => {
    console.log(`Loading notes for notebook: ${notebookId} - ${notebookTitle}`);

    // Prevent loading the same notebook repeatedly
    if (currentNotebookId === notebookId) {
        console.log(`Notebook ${notebookId} already active, skipping reload`);
        return;
    }

    try {
        // Cancel any ongoing notebook and note requests
        cancelActiveRequest("notebook");
        cancelActiveRequest("note");

        // Create new abort controller for this request
        activeRequests.loadingNotebook = new AbortController();
        const signal = activeRequests.loadingNotebook.signal;

        // Update UI elements
        updateNotebookSelectionUI(notebookId);
        currentNotebookId = notebookId;
        updateNotebookInfoUI(notebookId, notebookTitle);

        // Show loading state
        showNotesLoadingIndicator();

        // Fetch and render notes
        fetchNotebookNotes(notebookId, signal)
            .then(data => {
                renderNotesList(data, signal);
                // Request completed successfully
                activeRequests.loadingNotebook = null;
            })
            .catch(error => {
                if (error.name === 'AbortError' || error.message === 'Request aborted') {
                    console.log('Loading notes request was aborted');
                    return;
                   
                }

                console.error('Error loading notes:', error);
                if (!signal.aborted) {
                    showNotesError(error.message);
                }

                // Clear the request object on error
                activeRequests.loadingNotebook = null;
            });
    } catch (err) {
        console.error('Error in loadNotebookNotes function:', err);
        activeRequests.loadingNotebook = null;
    }
};

function generateNotesHTML(notes) {
    return notes.map(note => `
        <div class="note-item" data-note-id="${note.id}">
            <i class="bi bi-sticky me-2"></i>
            <span class="note-title">${note.title || 'Untitled Note'}</span>
            <div class="tags-container ms-2">
                ${(note.tags || []).map(tag => `
                    <span class="badge bg-secondary me-1">${tag}</span>
                `).join('')}
            </div>
        </div>`
    ).join('');
}
document.addEventListener('DOMContentLoaded', function () {

   
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
    const notebookItems = document.querySelectorAll('.notebook-item');
    notebookItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const notebookId = item.getAttribute('data-notebook-id');
            const notebookTitle = item.textContent.trim(); // Or however you get the title
            window.loadNotebookNotes(notebookId, notebookTitle); // Call the function
            
        });
    });// Initialize Quill or get existing instance safely
    /**
     * Cancels any ongoing requests of the specified type
     * @param {string} requestType - Type of request to cancel ("notebook" or "note")
     */
    //function cancelActiveRequest(requestType) {
    //    if (requestType === "notebook" && activeRequests.loadingNotebook) {
    //        console.log("Canceling active notebook request");
    //        activeRequests.loadingNotebook.abort();
    //        activeRequests.loadingNotebook = null;
    //    } else if (requestType === "note" && activeRequests.loadingNote) {
    //        console.log("Canceling active note request");
    //        activeRequests.loadingNote.abort();
    //        activeRequests.loadingNote = null;
    //    }
    //}

    /**
     * Loads notes for a specific notebook
     * @param {number} notebookId - ID of the notebook to load notes for
     * @param {string} notebookTitle - Title of the notebook
     */
    

    /**
     * Loads content for a specific note
     * @param {number} noteId - ID of the note to load
     * @param {number} retryCount - Current retry attempt (for internal use)
     */
    function loadNoteContent(noteId, retryCount = 0) {
        //quill = initializeQuill();
        try {
            // Hide empty state and show editor using Bootstrap classes
            document.getElementById('noteEditorEmpty').classList.add('d-none');
            document.getElementById('noteEditor').classList.remove('d-none');
            const MAX_RETRIES = 3;
            console.log(`Loading note ID: ${noteId}`);

            // FIX: Prevent loading the same note repeatedly
            if (currentNoteId === noteId && !retryCount) {
                console.log(`Note ${noteId} already loaded, skipping reload`);
                return;
            }

            // FIX: Cancel any ongoing note requests
            cancelActiveRequest("note");

            // Create new abort controller for this request
            activeRequests.loadingNote = new AbortController();
            const signal = activeRequests.loadingNote.signal;

            // Ensure Quill is initialized
            if (!quill) {
                quill = initializeQuill();
                if (!quill) {
                    console.error('Quill instance not available, cannot load note');
                    activeRequests.loadingNote = null;
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

            // FIX: Set loading state variable
            let loadingTimeoutId = setTimeout(() => {
                // If the request takes too long, abort it
                if (activeRequests.loadingNote) {
                    activeRequests.loadingNote.abort();
                    showToast('Note loading timeout. Please try again.', 'warning');
                }
            }, 15000); // 15 second timeout

            // Fetch note data
            fetch(`/api/Notes/${noteId}`, { signal })
                .then(response => {
                    if (signal.aborted) {
                        throw new Error('Request aborted');
                    }

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
                    if (signal.aborted) {
                        throw new Error('Request aborted');
                    }

                    clearTimeout(loadingTimeoutId);
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

                    // Clear the request object on success
                    activeRequests.loadingNote = null;
                })
                .catch(error => {
                    clearTimeout(loadingTimeoutId);

                    if (error.name === 'AbortError' || error.message === 'Request aborted') {
                        console.log('Loading note request was aborted');
                        activeRequests.loadingNote = null;
                        return;
                    }

                    console.error(`Error loading note ${noteId}:`, error);

                    // Implement retry for server errors
                    if (retryCount < MAX_RETRIES &&
                        (error.message.includes('500') ||
                            error.message.includes('NetworkError'))) {

                        const delay = Math.pow(2, retryCount) * 1000;
                        console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms`);

                        // Clear the current request before retrying
                        activeRequests.loadingNote = null;

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
                        //quill.setText('');
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

                    // Clear the request object on error
                    activeRequests.loadingNote = null;
                });
        } catch (error) {
            console.error('Error loading note:', error);
            // Show empty state if error occurs
            document.getElementById('noteEditorEmpty').classList.remove('d-none');
            document.getElementById('noteEditor').classList.add('d-none');
        }
    }

    // Make loadNoteContent globally available
    window.loadNoteContent = loadNoteContent;

    /**
     * Function to toggle notebook expansion
     */
    window.toggleNotebook = function (notebookId) {
        try {
            // First find the notebook item
            const notebookItem = document.querySelector(
                `.notebook-item[data-notebook-id="${notebookId}"]`
            );

            if (!notebookItem) {
                console.error(`Notebook item not found for ID: ${notebookId}`);
                return;
            }

            // Check if notes container exists
            let notesContainer = document.getElementById(`notes-${notebookId}`);

            // If the container doesn't exist, create one
            if (!notesContainer) {
                console.log(`Creating notes container for notebook ID: ${notebookId}`);
                notesContainer = document.createElement('div');
                notesContainer.id = `notes-${notebookId}`;
                notesContainer.className = 'notes-container';

                // Insert after the notebook item
                notebookItem.after(notesContainer);
            }

            // Toggle expanded class
            notesContainer.classList.toggle('expanded');

            // Toggle icon rotation
            const toggleIcon = notebookItem.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.classList.toggle('rotated');
            }

            // Always load notes because in your HTML they're displayed in the main notes panel
            const notebookTitle = notebookItem.querySelector('.notebook-title')?.textContent || '';
            loadNotebookNotes(notebookId, notebookTitle);

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

        // FIX: Cancel any ongoing note request
        cancelActiveRequest("note");

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
        isNoteDeleted = false;
       
    }

    // Make createNewNote globally available
    window.createNewNote = createNewNote;

    /**
     * Saves the current note
     */
    function saveNote() {
        if (!isEditorDirty || !quill) return;

        // Check if the note has been deleted
        if (isNoteDeleted) {
            console.log('Note has been deleted, save operation aborted');
            return;
        }

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

        // Create an AbortController for the save request
        const saveController = new AbortController();
        const signal = saveController.signal;

        // Set a timeout to abort the request if it takes too long
        const saveTimeoutId = setTimeout(() => {
            saveController.abort();
            showToast('Save operation timed out. Please try again.', 'warning');
        }, 10000); // 10 second timeout

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

        // Use the right API endpoint format based on your backend API
        // Choose endpoint based on operation
        const url = currentNoteId
            ? `/api/Notes/${currentNoteId}` // RESTful approach
            : '/api/Notes';

        const method = currentNoteId ? 'PUT' : 'POST';

        console.log(`Saving note using ${method} ${url}`);

        // Send request
        fetch(url, {
            method: method,
            body: formData,
            signal: signal
        })
            .then(response => {
                clearTimeout(saveTimeoutId);

                if (signal.aborted) {
                    throw new Error('Request aborted');
                }

                if (!response.ok) {
                    if (response.status === 405) {
                        console.warn('Method Not Allowed error. Trying alternative API endpoint format...');

                        // If we get a 405, try an alternative API pattern
                        const altUrl = currentNoteId ? '/api/Notes/update' : '/api/Notes/create';

                        // Retry with the alternative URL
                        return fetch(altUrl, {
                            method: 'POST', // Always use POST for the alternative format
                            body: formData
                        });
                    }

                    return response.json().then(errors => {
                        throw new Error(`Save failed: ${JSON.stringify(errors)}`);
                    }).catch(() => {
                        throw new Error(`Save failed with status ${response.status}: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(response => {
                // Check if this is from our alternative approach
                if (!response.ok && response.status === 405) {
                    throw new Error('Both API endpoint formats failed. Please check your API documentation.');
                }

                return response.ok ? response.json() : response;
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
                loadNotebookNotes(currentNotebookId, document.getElementById('currentNotebookTitle').textContent);

                // Refresh notes list if this was a new note
                if (method === 'POST') {
                    const notebookTitle = document.getElementById('currentNotebookTitle')?.textContent || '';
                    refreshNotesList();
                }
            })
            .catch(error => {
                clearTimeout(saveTimeoutId);

                if (error.name === 'AbortError' || error.message === 'Request aborted') {
                    console.log('Save request was aborted');
                    return;
                }

                console.error('Error saving note:', error);

                // FIX: Handle 405 errors with more specific guidance
                if (error.message.includes('405') || error.message.includes('Method Not Allowed')) {
                    showToast('API endpoint issue. Please check server logs.', 'danger');
                } else {
                    showToast('Failed to save note: ' + error.message, 'danger');
                }
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
            if (isEditorDirty) {
                saveNote();
            }
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
            // FIX: Use a single event handler with debounce
            if (!header.hasEventListener) {
                header.hasEventListener = true;
                header.addEventListener('click', debounce(function (e) {
                    e.preventDefault();
                    const notebookId = this.closest('.notebook-item')?.dataset.notebookId;
                    if (notebookId) {
                        toggleNotebook(notebookId);
                    }
                }, 300));
            }
        });

        // Initialize note click handlers with debounce to prevent double-clicks
        document.querySelectorAll('[data-note-id]').forEach(noteLink => {
            if (!noteLink.hasEventListener) {
                noteLink.hasEventListener = true;
                noteLink.addEventListener('click', debounce(function (e) {                                                                  
                    e.preventDefault();
                    const noteId = this.dataset.noteId;
                    loadNoteContent(noteId);
                }, 300));
            }
        });

        // Initialize new note button
        const newNoteBtn = document.getElementById('newNoteBtn');
        if (newNoteBtn && !newNoteBtn.hasEventListener) {
            newNoteBtn.hasEventListener = true;
            newNoteBtn.addEventListener('click', debounce(createNewNote, 300));
        }

        // Set up auto-save for title changes
        const noteTitleField = document.getElementById('noteTitleField') ||
            document.getElementById('note-Title') ||
            document.getElementById('noteTitle');
        if (noteTitleField && !noteTitleField.hasEventListener) {
            noteTitleField.hasEventListener = true;
            noteTitleField.addEventListener('input', function () {
                isEditorDirty = true;
                resetAutoSaveTimer();
            });
        }

        // Set up auto-save for content changes only once
        if (quill && !quill.hasChangeListener) {
            quill.hasChangeListener = true;
            quill.on('text-change', function () {
                isEditorDirty = true;
                resetAutoSaveTimer();
            });
        }
    }

    /**
     * Simple debounce function to prevent rapid repeated clicks
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
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
    window.deleteNotebook = async function () {
        const notebookId = currentNotebookId; // Ensure `currentNotebookId` is set when selecting a notebook

        if (!notebookId) {
            showToast('No notebook selected', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to delete this notebook? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/Notebooks/${notebookId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete notebook: ${response.status}`);
            }

            showToast('Notebook deleted successfully', 'success');

            // Refresh the notebook list
            location.reload(); // Reload the page or re-fetch notebooks dynamically
        } catch (error) {
            console.error('Error deleting notebook:', error);
            showToast('Failed to delete notebook: ' + error.message, 'danger');
        }
    };
    window.deleteNote = async function () {
        const noteId = currentNoteId; // Ensure `currentNoteId` is set when selecting a note

        if (!noteId) {
            showToast('No note selected', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/Notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete note: ${response.status}`);
            }
            else
            {

                showToast('Note deleted successfully', 'success');

                // Clear the editor and reset state
                document.getElementById('noteTitleField').value = '';
                quill.setContents([]);
                document.getElementById('noteEditorEmpty').classList.remove('d-none');
                document.getElementById('noteEditor').classList.add('d-none');

                // Optionally reload notes list
                isNoteDeleted = false;
                refreshNotesList();
               
                

            }

           

        } catch (error) {
            console.error('Error deleting note:', error);
            showToast('Failed to delete note: ' + error.message, 'danger');
        }
    };
    window.tagNote = async function () {
        const noteId = currentNoteId;
        if (!noteId) {
            showToast('No note selected', 'warning');
            return;
        }
        const tag = prompt('Enter a tag for this note:');
        if (!tag) {
            showToast('Tagging canceled', 'info');
            return;
        }
        try {
            // Fixed endpoint to match the controller route structure
            const response = await fetch(`/api/Tags/${noteId}`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ tag: tag })
            });
            if (!response.ok) {
                throw new Error(`Failed to tag note: ${response.status}`);
            }

            const data = await response.json();
            showToast(data.message || `Tag "${tag}" added successfully`, 'success');
            refreshNotesList();
        } catch (error) {
            console.error('Error tagging note:', error);
            showToast('Failed to tag note: ' + error.message, 'danger');
        }
    };
    // Set up an event listener to load tags when the modal is about to be shown
    // Set up an event listener to load tags when the modal is about to be shown
   
        // Get a reference to the tag modal - FIXED: using the correct modal ID
       const tagModal = document.getElementById('tagModal');

        // Add event listener for when the modal is about to be shown
        // FIXED: using the correct Bootstrap event 'show.bs.modal'
        tagModal.addEventListener('show.bs.modal', function (event) {
            // Check if a note is selected
            if (!currentNoteId) {
                // Prevent the modal from showing
                event.preventDefault();
                showToast('No note selected', 'warning');
                return;
            }

            // Load tags
            showTagModal();
        });
   

    // Updated to handle tag objects properly
    window.showTagModal = async function () {
        try {
            // Log the request URL for debugging
            console.log('Fetching tags from:', '/api/Tags/Tags');

            const response = await fetch('/api/Tags');
            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                throw new Error(`Failed to fetch tags: ${response.status}`);
            }

            const tags = await response.json();
            console.log('Tags received:', tags); // Log the actual data

            const tagSelect = document.getElementById('existingTags');
            console.log('Tag select element found:', !!tagSelect);

            if (!tagSelect) {
                console.error('Could not find the tag select element');
                return false;
            }

            tagSelect.innerHTML = '<option value="">Select a tag</option>';

            // Check if tags is an array and has items
            if (!Array.isArray(tags)) {
                console.warn('Tags is not an array:', tags);
                // Try to handle it if it's an object
                if (typeof tags === 'object' && tags !== null) {
                    // Maybe it's an object with a property that contains the array
                    const possibleArrays = Object.values(tags).filter(val => Array.isArray(val));
                    if (possibleArrays.length > 0) {
                        console.log('Found possible tag array:', possibleArrays[0]);
                        populateTagOptions(possibleArrays[0], tagSelect);
                    }
                }
            } else {
                console.log('Processing tag array with', tags.length, 'items');
                populateTagOptions(tags, tagSelect);
            }

            // Clear new tag input
            document.getElementById('newTag').value = '';
            return true;
        } catch (error) {
            console.error('Error loading tags:', error);
            showToast('Failed to load tags: ' + error.message, 'danger');
            return false;
        }
    };

    // Helper function to populate tag options
    function populateTagOptions(tags, selectElement) {
        tags.forEach((tag, index) => {
            console.log(`Processing tag ${index}:`, tag);
            const option = document.createElement('option');

            // Handle different tag formats
            if (typeof tag === 'object' && tag !== null) {
                // Log the properties to see what's available
                console.log('Tag properties:', Object.keys(tag));

                // Try different possible property names
                const tagValue = tag.name || tag.Name || tag.tag || tag.Tag || tag.id || tag.Id;
                const tagText = tag.name || tag.Name || tag.tag || tag.Tag || tag.id || tag.Id;

                option.value = tagValue;
                option.textContent = tagText;
            } else {
                option.value = tag;
                option.textContent = tag;
            }

            selectElement.appendChild(option);
            console.log('Added option:', option.value);
        });
    }

    // No changes needed to applyTag function since it works correctly
    window.applyTag = async function () {
        const existingTag = document.getElementById('existingTags').value;
        const newTag = document.getElementById('newTag').value.trim();
        if (!existingTag && !newTag) {
            showToast('Please select or create a tag', 'warning');
            return;
        }
        const tagToApply = newTag || existingTag;
        try {
            const response = await fetch(`/api/Tags/${currentNoteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ tag: tagToApply })
            });

            // Handle empty responses first
            if (response.status === 204) { // No Content
                showToast(`Tag "${tagToApply}" added successfully`, 'success');
                refreshNotesList();

                // Use Bootstrap 5 syntax to hide modal
                const modalElement = document.getElementById('tagModal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal.hide();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            showToast(data.message, 'success');
            refreshNotesList();

            // Use Bootstrap 5 syntax to hide modal
            const modalElement = document.getElementById('tagModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
        } catch (error) {
            console.error('Error applying tag:', error);
            showToast(`Failed to apply tag: ${error.message}`, 'danger');
        }
    };
    window.showEditNotebookModal = function () {
        const notebookTitle = document.getElementById('currentNotebookTitle').textContent;
        document.getElementById('editNotebookNameInput').value = notebookTitle;
        $('#editNotebookModal').modal('show');
    };

    window.refreshNotebookTitle = async function (notebookId) {
        try {
            // Fetch the current notebook data
            const response = await fetch(`/api/Notebooks/${notebookId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch notebook details');

            const notebook = await response.json();

            // Update the title in the UI
            document.getElementById('currentNotebookTitle').textContent = notebook.title;

            // Also update page title if applicable
            if (document.title.includes('Notebook:')) {
                document.title = `Notebook: ${notebook.title}`;
            }

            // Update the notebook title in the sidebar - being more specific with the selector
            const sidebarNotebookTitles = document.querySelectorAll(`.notebook-item[data-notebook-id="${notebookId}"] .notebook-title`);
            sidebarNotebookTitles.forEach(titleElement => {
                titleElement.textContent = notebook.title;
            });

            // Update any other places where the notebook title is displayed
            const notebookTitleElements = document.querySelectorAll('.notebook-title-display');
            notebookTitleElements.forEach(element => {
                element.textContent = notebook.title;
            });

            return notebook.title;
        } catch (error) {
            console.error('Error refreshing notebook title:', error);
            showToast('Failed to refresh notebook title', 'warning');
            return null;
        }
    };
   



    window.updateNotebookName = async function ()
    {
        const newName = document.getElementById('editNotebookNameInput').value.trim();
        if (!newName) {
            showToast('Please enter a valid notebook name', 'warning');
            return;
        }
        try {
            const response = await fetch(`/api/Notebooks/${currentNotebookId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ Title: newName }) // Changed from 'name' to 'Title' to match backend DTO
            });
            if (!response.ok) throw new Error('Failed to update notebook name');

            // Parse the response to get the updated name
            const result = await response.json();
            showToast(`Notebook name updated to "${result.name}"`, 'success');

            

            // Update UI with the new name
            document.getElementById('currentNotebookTitle').textContent = newName;
            await refreshNotebookTitle(currentNotebookId);
            await refreshSidebar();
            // Close modal
            $('#editNotebookModal').modal('hide');
        } catch (error) {
            console.error('Error updating notebook name:', error);
            showToast(`Failed to update notebook name: ${error.message}`, 'danger');                                     
        }
    };


    

    



});