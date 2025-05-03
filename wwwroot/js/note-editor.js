
// Variables to keep track of the note editor state
let quill; // The rich text editor
let autoSaveTimer; // Timer for auto-saving notes
let currentNoteId = null; // ID of the note being edited
let currentNotebookId = null; // ID of the current notebook
let isEditorDirty = false; // Tracks if changes need to be saved
let lastSavedTime = null; // When the note was last saved

// Keeps track of active server requests to prevent conflicts
let activeRequests = {
    loadingNotebook: null, // For notebook loading requests
    loadingNote: null      // For note loading requests
};

// Cancels an in-progress request to prevent conflicts
// type: the request type to cancel ("loadingNotebook" or "loadingNote")
const cancelActiveRequests = (type) => {
    if (activeRequests[type] && activeRequests[type].abort) {
        console.log(`Aborting active ${type} request`);
        activeRequests[type].abort();
        activeRequests[type] = null;
    }
};

// Reloads the list of notes for the current notebook
function refreshNotesList() {
    if (!currentNotebookId) {
        console.warn('No active notebook to refresh');
        return;
    }
    // Create a way to cancel this request if needed
    activeRequests.loadingNotebook = new AbortController();
    const signal = activeRequests.loadingNotebook.signal;

    // Show loading spinner
    showNotesLoadingIndicator();

    // Get notes from server and update the UI
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

// Cancels an active request by type
// requestType: either "notebook" or "note"
function cancelActiveRequest(requestType) {
    const requestKey = `loading${requestType.charAt(0).toUpperCase() + requestType.slice(1)}`;
    if (activeRequests[requestKey] && activeRequests[requestKey].abort) {
        console.log(`Canceling active ${requestType} request`);
        activeRequests[requestKey].abort();
        activeRequests[requestKey] = null;
    }
}

// Updates the UI to show which notebook is selected
// notebookId: the ID of the selected notebook
function updateNotebookSelectionUI(notebookId) {
    // Remove active class from all notebooks
    document.querySelectorAll('.notebook-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to the selected notebook
    const notebookElement = document.querySelector(`.notebook-item[data-notebook-id="${notebookId}"]`);
    if (notebookElement) {
        notebookElement.classList.add('active');
        // Rotate the arrow icon
        const toggleIcon = notebookElement.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.classList.toggle('rotated');
        }
    }
}

// Updates the UI with the current notebook info
// notebookId: ID of the current notebook
// notebookTitle: title of the current notebook
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

// Shows a loading spinner in the notes list
function showNotesLoadingIndicator() {
    const notesList = document.getElementById('notesList');
    if (notesList) {
        notesList.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading notes...</div>';
    }
}

// Shows an error message in the notes list
// errorMessage: the error message to display
function showNotesError(errorMessage) {
    const notesList = document.getElementById('notesList');
    if (notesList) {
        notesList.innerHTML = `<div class="text-center p-3 text-danger">Error loading notes: ${errorMessage}</div>`;
    }
}

// Creates a note element for the notes list
// note: the note data object
// returns: HTML element for the note
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

    // When note is clicked, load its content
    noteElement.addEventListener('click', function (e) {
        e.preventDefault();

        // Prevent clicking if already loading a note
        if (activeRequests.loadingNote) {
            console.log('Already loading a note, ignoring click');
            return;
        }

        // Update UI to show which note is selected
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        this.classList.add('active');

        // Load the note content
        loadNoteContent(note.id);
    });

    return noteElement;
}

// Renders the list of notes in the UI
// data: the notes data from the server
// signal: abort signal to cancel the operation
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

    // Add each note to the list
    notes.forEach(note => {
        if (!note || !note.id) return;
        const noteElement = createNoteElement(note);
        notesList.appendChild(noteElement);
        isNoteDeleted = false;
    });
}

// Gets notes for a notebook from the server
// notebookId: ID of the notebook
// signal: abort signal to cancel the request
// returns: Promise with the notes data
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

// Loads notes for a notebook (called from HTML)
// notebookId: ID of the notebook to load
// notebookTitle: title of the notebook
window.loadNotebookNotes = (notebookId, notebookTitle) => {
    console.log(`Loading notes for notebook: ${notebookId} - ${notebookTitle}`);

    // Don't reload if it's already the current notebook
    if (currentNotebookId === notebookId) {
        console.log(`Notebook ${notebookId} already active, skipping reload`);
        return;
    }

    try {
        // Cancel any ongoing requests
        cancelActiveRequest("notebook");
        cancelActiveRequest("note");

        // Create new abort controller
        activeRequests.loadingNotebook = new AbortController();
        const signal = activeRequests.loadingNotebook.signal;

        // Update UI
        updateNotebookSelectionUI(notebookId);
        currentNotebookId = notebookId;
        updateNotebookInfoUI(notebookId, notebookTitle);

        // Show loading state
        showNotesLoadingIndicator();

        // Get and display notes
        fetchNotebookNotes(notebookId, signal)
            .then(data => {
                renderNotesList(data, signal);
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

                activeRequests.loadingNotebook = null;
            });
    } catch (err) {
        console.error('Error in loadNotebookNotes function:', err);
        activeRequests.loadingNotebook = null;
    }
};

// Creates HTML for a list of notes
// notes: array of note objects
// returns: HTML string
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

    // Sets up the Quill rich text editor
    function initializeQuill() {
        // Find the editor container
        const editorContainer = document.getElementById('quillEditor');

        if (!editorContainer) {
            console.warn('Editor container not found, will try again when loading notes');
            return null;
        }

        try {
            // Create Quill editor with toolbar options
            return new Quill(editorContainer, {
                theme: 'snow',
                placeholder: 'Compose your note...',
                modules: {
                    toolbar: [   //all the tools that is in the editbar 
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

    // Set up notebook click handlers
    const notebookItems = document.querySelectorAll('.notebook-item');
    notebookItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const notebookId = item.getAttribute('data-notebook-id');
            const notebookTitle = item.textContent.trim();
            window.loadNotebookNotes(notebookId, notebookTitle);
        });
    });

    // Loads a note's content into the editor
    // noteId: ID of the note to load
    // retryCount: number of retry attempts (for error handling)
    function loadNoteContent(noteId, retryCount = 0) {
        try {
            // Show editor and hide empty state
            document.getElementById('noteEditorEmpty').classList.add('d-none');
            document.getElementById('noteEditor').classList.remove('d-none');
            const MAX_RETRIES = 3;
            console.log(`Loading note ID: ${noteId}`);

            // Don't reload if it's already the current note
            if (currentNoteId === noteId && !retryCount) {
                console.log(`Note ${noteId} already loaded, skipping reload`);
                return;
            }

            // Cancel any ongoing note requests
            cancelActiveRequest("note");

            // Create new abort controller
            activeRequests.loadingNote = new AbortController();
            const signal = activeRequests.loadingNote.signal;

            // Make sure Quill is ready
            if (!quill) {
                quill = initializeQuill();
                if (!quill) {
                    console.error('Quill instance not available, cannot load note');
                    activeRequests.loadingNote = null;
                    return;
                }
            }

            // Find the title field (trying different possible IDs)
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

            // Set timeout to abort if taking too long
            let loadingTimeoutId = setTimeout(() => {
                if (activeRequests.loadingNote) {
                    activeRequests.loadingNote.abort();
                    showToast('Note loading timeout. Please try again.', 'warning');
                }
            }, 15000); // 15 seconds

            // Get note data from server
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

                    // Update title
                    if (noteTitleField) {
                        noteTitleField.value = note.title || 'Untitled';
                    }

                    // Update editor content
                    try {
                        quill.setContents([]);
                        quill.clipboard.dangerouslyPasteHTML(0, note.content || '');
                        quill.enable();
                    } catch (err) {
                        console.error('Error updating Quill content:', err);
                    }

                    // Update note ID
                    currentNoteId = note.id;
                    const currentNoteIdField = document.getElementById('currentNoteId');
                    if (currentNoteIdField) {
                        currentNoteIdField.value = note.id;
                    }

                    // Update last saved time
                    if (note.updatedAt) {
                        updateLastSavedTime(new Date(note.updatedAt));
                    }

                    // Reset tracking
                    isEditorDirty = false;
                    loadNoteTags(noteId)
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

                    // Retry for server errors
                    if (retryCount < MAX_RETRIES &&
                        (error.message.includes('500') ||
                            error.message.includes('NetworkError'))) {

                        const delay = Math.pow(2, retryCount) * 1000;
                        console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms`);

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

                    // Show error in editor
                    try {
                        quill.clipboard.dangerouslyPasteHTML(0, `
                            <div class="error-message" style="color: #d9534f; padding: 15px; border: 1px solid #d9534f; border-radius: 4px;">
                                <h3>Error Loading Note</h3>
                                <p>${error.message}</p>
                                <p>Please try refreshing the page or contact support if the issue persists.</p>
                                <button class="btn btn-sm btn-danger mt-3 retry-button">Retry</button>
                            </div>
                        `);

                        // Add retry button handler
                        document.querySelector('.ql-editor').addEventListener('click', function (event) {
                            if (event.target.classList.contains('retry-button')) {
                                loadNoteContent(noteId);
                            }
                        });

                        quill.disable();
                    } catch (err) {
                        console.error('Error showing error message in editor:', err);
                    }

                    activeRequests.loadingNote = null;
                });
        } catch (error) {
            console.error('Error loading note:', error);
            // Show empty state if error
            document.getElementById('noteEditorEmpty').classList.remove('d-none');
            document.getElementById('noteEditor').classList.add('d-none');
        }
    }

    // Make loadNoteContent available globally
    window.loadNoteContent = loadNoteContent;

    // Toggles a notebook's expanded/collapsed state
    // notebookId: ID of the notebook to toggle
    window.toggleNotebook = function (notebookId) {
        try {
            // Find the notebook element
            const notebookItem = document.querySelector(
                `.notebook-item[data-notebook-id="${notebookId}"]`
            );

            if (!notebookItem) {
                console.error(`Notebook item not found for ID: ${notebookId}`);
                return;
            }

            // Find or create notes container
            let notesContainer = document.getElementById(`notes-${notebookId}`);

            if (!notesContainer) {
                console.log(`Creating notes container for notebook ID: ${notebookId}`);
                notesContainer = document.createElement('div');
                notesContainer.id = `notes-${notebookId}`;
                notesContainer.className = 'notes-container';
                notebookItem.after(notesContainer);
            }

            // Toggle expanded class
            notesContainer.classList.toggle('expanded');

            // Toggle arrow icon rotation
            const toggleIcon = notebookItem.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.classList.toggle('rotated');
            }

            // Load notes
            const notebookTitle = notebookItem.querySelector('.notebook-title')?.textContent || '';
            loadNotebookNotes(notebookId, notebookTitle);

        } catch (err) {
            console.error('Error toggling notebook:', err);
        }
    };

    // Creates a new empty note in the current notebook
    function createNewNote() {
        // Make sure a notebook is selected
        if (!currentNotebookId) {
            showToast('Please select a notebook first', 'warning');
            return;
        }

        // Cancel any ongoing note requests
        cancelActiveRequest("note");

        // Make sure Quill is ready
        if (!quill) {
            quill = initializeQuill();
            if (!quill) {
                showToast('Could not initialize editor', 'danger');
                return;
            }
        }

        // Get UI elements
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

    // Make createNewNote available globally
    window.createNewNote = createNewNote;

    // Saves the current note to the server
    function saveNote() {
        if (!isEditorDirty || !quill) return;

        // Don't save if note was deleted
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

        // Make sure a notebook is selected
        if (!currentNotebookId) {
            showToast('Cannot save note: No notebook selected', 'danger');
            return;
        }

        // Create abort controller for timeout
        const saveController = new AbortController();
        const signal = saveController.signal;

        // Set timeout to abort if taking too long
        const saveTimeoutId = setTimeout(() => {
            saveController.abort();
            showToast('Save operation timed out. Please try again.', 'warning');
        }, 10000); // 10 seconds

        // Prepare form data
        const formData = new FormData();
        formData.append('Title', noteTitle);
        formData.append('Content', noteContent || '<p></p>');
        formData.append('NotebookId', currentNotebookId);

        // Include ID for updates
        if (currentNoteId) {
            formData.append('Id', currentNoteId);
        }

        // Choose endpoint based on operation (create or update)
        const url = currentNoteId
            ? `/api/Notes/${currentNoteId}` // Update existing note
            : '/api/Notes'; // Create new note

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

                        // Try alternative API pattern if 405 error
                        const altUrl = currentNoteId ? '/api/Notes/update' : '/api/Notes/create';

                        // Retry with alternative URL
                        return fetch(altUrl, {
                            method: 'POST', // Always use POST for alternative format
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
                // Check if this is from alternative approach
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

                // Handle 405 errors with more specific guidance
                if (error.message.includes('405') || error.message.includes('Method Not Allowed')) {
                    showToast('API endpoint issue. Please check server logs.', 'danger');
                } else {
                    showToast('Failed to save note: ' + error.message, 'danger');
                }
            });
    }

    // Updates the last saved time display
    // date: Date object of when the note was saved
    function updateLastSavedTime(date) {
        lastSavedTime = date;
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const lastSavedText = document.getElementById('lastSavedText');
        if (lastSavedText) {
            lastSavedText.textContent = `Last saved at ${timeString}`;
        }
    }

    // Resets the auto-save timer
    function resetAutoSaveTimer() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function () {
            if (isEditorDirty) {
                saveNote();
            }
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    // Shows a toast notification
    // message: text to display
    // type: bootstrap color type (success, danger, warning, info)
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

        // Show the toast
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

    // Make showToast available globally
    window.showToast = showToast;

    // Sets up all event handlers
    function initializeEventHandlers() {
        // Set up notebook toggle handlers
        document.querySelectorAll('.notebook-header').forEach(header => {
            // Use a single event handler with debounce to prevent multiple clicks
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

        // Set up note click handlers with debounce
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

        // Set up new note button
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

        // Set up auto-save for content changes
        if (quill && !quill.hasChangeListener) {
            quill.hasChangeListener = true;
            quill.on('text-change', function () {
                isEditorDirty = true;
                resetAutoSaveTimer();
            });
        }
    }

    // Prevents multiple rapid calls to a function
    // func: the function to debounce
    // wait: milliseconds to wait between calls
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

    // Deletes the current notebook
    window.deleteNotebook = async function () {
        const notebookId = currentNotebookId;

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
            location.reload();
        } catch (error) {
            console.error('Error deleting notebook:', error);
            showToast('Failed to delete notebook: ' + error.message, 'danger');
        }
    };

    // Deletes the current note
    window.deleteNote = async function () {
        const noteId = currentNoteId;

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
            else {
                showToast('Note deleted successfully', 'success');

                // Clear the editor and reset state
                document.getElementById('noteTitleField').value = '';
                quill.setContents([]);
                document.getElementById('noteEditorEmpty').classList.remove('d-none');
                document.getElementById('noteEditor').classList.add('d-none');

                // Refresh notes list
                isNoteDeleted = false;
                refreshNotesList();
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            showToast('Failed to delete note: ' + error.message, 'danger');
        }
    };

    // Adds a tag to the current note
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

    // Set up tag modal
    const tagModal = document.getElementById('tagModal');
    const tagNoteBtn = document.getElementById('tagNoteBtn');

    document.addEventListener('DOMContentLoaded', () => {
        // Only set up listeners if tagModal exists
        if (tagModal) {
            // Add event listener for when the modal is about to be shown
            tagNoteBtn.addEventListener('show.bs.modal', function (event) {
                // Check if a note is selected
                if (!currentNoteId) {
                    // Prevent the modal from showing
                    event.preventDefault();
                    showToast('No note selected', 'warning');
                    return;
                }

                // Load tags before showing modal
                showTagModal();
                refreshCurrentNote()
            });

            // Handle button click
            tagNoteBtn.addEventListener('click', function (event) {
                if (!currentNoteId) {
                    // Prevent bootstrap from showing the modal
                    event.preventDefault();
                    event.stopPropagation();
                    showTagModal();
                    showToast('No note selected', 'warning');
                }
            });
        }
    });

    // Shows the tag management modal
    window.showTagModal = async function () {
        try {
            // Get all tags from server
            console.log('Fetching tags from:', '/api/Tags/gettag');

            const response = await fetch('/api/Tags/gettag');
            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                throw new Error(`Failed to fetch tags: ${response.status}`);
            }

            const tags = await response.json();
            console.log('Tags received:', tags);

            // Get container for tags
            const tagContainer = document.getElementById('existingTagsContainer');
            if (!tagContainer) {
                console.error('Could not find the tag container element');
                return false;
            }

            // Clear existing content
            tagContainer.innerHTML = '';

            // Add separator
            const separator = document.createElement('hr');
            tagContainer.appendChild(separator);

            // Add section title
            const existingTagsTitle = document.createElement('h5');
            existingTagsTitle.textContent = 'Existing Tags';
            existingTagsTitle.className = 'mb-3';
            tagContainer.appendChild(existingTagsTitle);

            // Create tag list with buttons
            tags.forEach((tag, index) => {
                const tagName = typeof tag === 'object' ? (tag.name || tag.Name || '') : tag;
                const tagId = typeof tag === 'object' ? (tag.id || tag.Id || index) : index;

                // Create a div for the tag
                const tagDiv = document.createElement('div');
                tagDiv.className = 'tag-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded';
                tagDiv.dataset.tagId = tagId;
                tagDiv.dataset.tagName = tagName;

                // Tag name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = tagName;
                nameSpan.className = 'tag-name';

                // Buttons container
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'tag-actions';

                // Apply tag button
                const applyBtn = document.createElement('button');
                applyBtn.className = 'btn btn-sm btn-success me-1';
                applyBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Apply';
                applyBtn.onclick = function () { applyTagToCurrentItem(tagId, tagName); };

                // Edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-outline-primary me-1';
                editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                editBtn.onclick = function () { editTag(tagId, tagName); };

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.onclick = function () { deleteTag(tagId, tagName); };

                // Add all elements to the container
                buttonsDiv.appendChild(applyBtn);
                buttonsDiv.appendChild(editBtn);
                buttonsDiv.appendChild(deleteBtn);
                tagDiv.appendChild(nameSpan);
                tagDiv.appendChild(buttonsDiv);
                tagContainer.appendChild(tagDiv);
            });

            // Clear new tag input
            document.getElementById('newTag').value = '';
            return true;
        } catch (error) {
            console.error('Error loading tags:', error);
            showToast('Failed to load tags: ' + error.message, 'danger');
            return false;
        }
    };

    // Gets the ID of the current item (note)
    window.getCurrentItemId = function () {
        // First check if currentNoteId is available
        if (currentNoteId) {
            return currentNoteId;
        }

        // Fallback to looking for the element
        const itemIdElement = document.getElementById('currentItemId') ||
            document.getElementById('currentNoteId');

        return itemIdElement ? itemIdElement.value : null;
    };

    // Applies a tag to the current note
    // tagId: ID of the tag
    // tagName: name of the tag
    window.applyTagToCurrentItem = async function (tagId, tagName) {
        const tagContainer = document.getElementById('existingTagsContainer');

        try {
            if (!currentNoteId) {
                showToast('No note selected to tag', 'warning');
                return;
            }

            const response = await fetch(`/api/Tags/${currentNoteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ tag: tagName })
            });

            if (!response.ok) {
                throw new Error(`Failed to apply tag: ${response.status}`);
            }

            const data = await response.json();
            showToast(data.message || `Tag "${tagName}" applied successfully`, 'success');
            loadNoteTags();
        } catch (error) {
            console.error('Error applying tag:', error);
            showToast(`Failed to apply tag: ${error.message}`, 'danger');
            if (tagContainer) {
                tagContainer.innerHTML = '<p class="text-danger">Error applying tag.</p>';
            }
        }
    };

    // Edits a tag's name
    // tagId: ID of the tag
    // currentName: current name of the tag
    window.editTag = async function (tagId, currentName) {
        const newName = prompt('Enter new name for the tag:', currentName);

        if (!newName || newName === currentName) {
            return; // User cancelled or didn't change the name
        }

        try {
            const response = await fetch(`/api/Tags/Rename/${tagId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    id: tagId,
                    newName: newName
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to rename tag: ${response.status}`);
            }

            showToast(`Tag renamed to "${newName}"`, 'success');
            showTagModal(); // Refresh the tag list
            refreshNotesList();
        } catch (error) {
            console.error('Error renaming tag:', error);
            showToast(`Failed to rename tag: ${error.message}`, 'danger');
        }
    };

    // Deletes a tag
    // tagId: ID of the tag
    // tagName: name of the tag
    window.deleteTag = async function (tagId, tagName) {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
            return; // User cancelled
        }

        try {
            const response = await fetch(`/api/Tags/${tagId}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete tag: ${response.status}`);
            }
            showToast(`Tag "${tagName}" deleted`, 'success');
            showTagModal(); // Refresh the tag list
        } catch (error) {
            console.error('Error deleting tag:', error);
            showToast(`Failed to delete tag: ${error.message}`, 'danger');
        }
    };

    // Applies a new tag from the input field
    window.applyTag = async function () {
        const newTag = document.getElementById('newTag').value.trim();
        if (!newTag) {
            showToast('Please enter a tag name', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/Tags/${currentNoteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ tag: newTag })
            });

            if (response.status === 204) {
                showToast(`Tag "${newTag}" added successfully`, 'success');

                document.getElementById('newTag').value = ''; // Clear the input
                showTagModal(); // Refresh the tag list
                refreshNotesList();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            showToast(data.message, 'success');
            document.getElementById('newTag').value = ''; // Clear the input
            showTagModal(); // Refresh the tag list
        } catch (error) {
            console.error('Error applying tag:', error);
            showToast(`Failed to apply tag: ${error.message}`, 'danger');
        }
    };

    // Shows the edit notebook modal
    window.showEditNotebookModal = function () {
        const notebookTitle = document.getElementById('currentNotebookTitle').textContent;
        document.getElementById('editNotebookNameInput').value = notebookTitle;
        const warningMessage = document.getElementById('noNotebookSelectedWarning');
        const saveButton = document.getElementById('saveNotebookButton');
        saveButton.disabled = false;
        
        warningMessage.style.display = 'none';
        $('#editNotebookModal').modal('show');
    };

    // Loads tags for a note
    // noteId: ID of the note
    window.loadNoteTags = async function (noteId) {
        if (!noteId) return;
        try {
            const response = await fetch(`/api/Notetag/${noteId}`);
            if (!response.ok) {
                throw new Error(`Failed to load tags: ${response.status}`);
            }
            const tags = await response.json();
            displayNoteTags(tags);
            showTagModal()
        } catch (error) {
            console.error('Error loading note tags:', error);
        }
    };

    // Displays tags for a note
    // tags: array of tag objects
    window.displayNoteTags = async function (tags) {
        const tagsContainer = document.getElementById('currentNoteTags');
        if (!tagsContainer) return;

        // Clear existing tags
        tagsContainer.innerHTML = '';

        // If no tags, show placeholder
        if (!tags || tags.length === 0) {
            const noTagsSpan = document.createElement('span');
            noTagsSpan.className = 'text-muted small';
            noTagsSpan.textContent = 'No tags';
            tagsContainer.appendChild(noTagsSpan);
            return;
        }

        // Add each tag as a badge
        tags.forEach(tag => {
            // Get tag name and ID
            const tagName = typeof tag === 'object' ? (tag.tagId || tag.TagId || '') : tag;
            const tagId = typeof tag === 'object' ? (tag.id || tag.Id || '') : '';

            const tagBadge = document.createElement('span');
            tagBadge.className = 'badge bg-primary me-1 mb-1';
            tagBadge.textContent = tagName;
            tagBadge.dataset.tagId = tagId;

            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-close btn-close-white ms-1';
            removeBtn.style.fontSize = '0.5rem';
            removeBtn.setAttribute('aria-label', 'Remove tag');
            removeBtn.onclick = function (e) {
                e.stopPropagation();
                removeNoteTag(currentNoteId, tagId, tagName);
                refreshCurrentNote()
            };

            tagBadge.appendChild(removeBtn);
            tagsContainer.appendChild(tagBadge);
        });
    };

    // Refreshes the notebook title in the UI
    // notebookId: ID of the notebook
    window.refreshNotebookTitle = async function (notebookId) {
        try {
            // Get notebook data
            const response = await fetch(`/api/Notebooks/${notebookId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (!response.ok) throw new Error('Failed to fetch notebook details');

            const notebook = await response.json();

            // Update title in UI
            document.getElementById('currentNotebookTitle').textContent = notebook.title;

            // Update page title
            if (document.title.includes('Notebook:')) {
                document.title = `Notebook: ${notebook.title}`;
            }

            // Update sidebar title
            const sidebarNotebookTitles = document.querySelectorAll(`.notebook-item[data-notebook-id="${notebookId}"] .notebook-title`);
            sidebarNotebookTitles.forEach(titleElement => {
                titleElement.textContent = notebook.title;
            });

            // Update any other title elements
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

    // Updates a notebook's name
    window.updateNotebookName = async function () {
        const newName = document.getElementById('editNotebookNameInput').value.trim();
        const saveButton = document.getElementById('saveNotebookButton');
        const warningMessage = document.getElementById('noNotebookSelectedWarning');
        saveButton.disabled = false;
        if (!newName) {
            showToast('Please enter a valid notebook name', 'warning');
            return;
        }
        if (!currentNotebookId) {
            saveButton.disabled = true;
            warningMessage.style.display = 'block';
        }
        else {
            saveButton.disable = false;
            warningMessage.style.display = 'none';
        }
        try {
            const response = await fetch(`/api/Notebooks/${currentNotebookId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ Title: newName }) // Match backend DTO
            });
            if (!response.ok) throw new Error('Failed to update notebook name');

            // Get updated name from response
            const result = await response.json();
            showToast(`Notebook name updated to "${result.name}"`, 'success');

            // Update UI
            document.getElementById('currentNotebookTitle').textContent = newName;
            await refreshNotebookTitle(currentNotebookId);
           
            location.reload(); //loads new notebook name

            // Close modal
            $('#editNotebookModal').modal('hide');
          
        } catch (error) {
            console.error('Error updating notebook name:', error);
            showToast(`Failed to update notebook name: ${error.message}`, 'danger');
        }
    };

    // Refreshes the current note data
    window.refreshCurrentNote = async function () {
        try {
            // Make sure a note is loaded
            if (!currentNoteId) {
                console.log('No note is currently loaded to refresh');
                return;
            }

            console.log(`Refreshing current note ID: ${currentNoteId}`);

            // Cancel any ongoing note requests
            cancelActiveRequest("note");

            // Create new abort controller
            activeRequests.loadingNote = new AbortController();
            const signal = activeRequests.loadingNote.signal;

            // Set timeout
            let loadingTimeoutId = setTimeout(() => {
                if (activeRequests.loadingNote) {
                    activeRequests.loadingNote.abort();
                    showToast('Note refresh timeout. Please try again.', 'warning');
                }
            }, 15000); // 15 seconds

            // Get note data
            fetch(`/api/Notes/${currentNoteId}`, { signal })
                .then(response => {
                    if (signal.aborted) {
                        throw new Error('Request aborted');
                    }

                    if (!response.ok) {
                        throw new Error(`Failed to refresh note: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(note => {
                    if (signal.aborted) {
                        throw new Error('Request aborted');
                    }

                    clearTimeout(loadingTimeoutId);
                    console.log(`Successfully refreshed note: ${note.id}`);

                    // Load tags
                    loadNoteTags(currentNoteId);
                    loadNoteTags();

                    // Update timestamp
                    if (note.updatedAt) {
                        updateLastSavedTime(new Date(note.updatedAt));
                    }

                    activeRequests.loadingNote = null;
                    showToast('Note refreshed successfully', 'success');
                })
                .catch(error => {
                    clearTimeout(loadingTimeoutId);

                    if (error.name === 'AbortError' || error.message === 'Request aborted') {
                        console.log('Refreshing note request was aborted');
                        activeRequests.loadingNote = null;
                        return;
                    }

                    console.error(`Error refreshing note ${currentNoteId}:`, error);
                    showToast('Failed to refresh note', 'danger');
                    activeRequests.loadingNote = null;
                });
        } catch (error) {
            console.error('Error in refreshCurrentNote:', error);
        }
    }

    // Removes a tag from a note
    // noteId: ID of the note
    // tagId: ID of the tag
    // tagName: name of the tag
    window.removeNoteTag = async function (noteId, tagId, tagName) {
        // Show loading state
        const tagElement = document.querySelector(`.tag[data-tag-id="${tagId}"]`);
        if (tagElement) {
            tagElement.classList.add('removing');
        }

        // Remove the tag
        fetch(`/api/Notetag/Notes/${noteId}/Tags/${tagId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Remove tag from UI
                    if (tagElement) {
                        tagElement.parentNode.removeChild(tagElement);
                        refreshCurrentNote()
                    }
                    showToast(`Tag "${tagName}" removed successfully`, 'success');
                } else {
                    throw new Error(data.error || 'Failed to remove tag');
                }
            })
            .catch(error => {
                console.error('Error removing tag:', error);
                // Remove loading state
                if (tagElement) {
                    tagElement.classList.remove('removing');
                }
                showToast(`Failed to remove tag: ${error.message}`, 'error');
            });
    }
});
