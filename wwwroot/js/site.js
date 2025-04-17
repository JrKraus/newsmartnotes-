// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

window.loadNotebookNotes = (notebookId, notebookTitle) => {
    console.log(`Loading notes for notebook: ${notebookId} - ${notebookTitle}`);

    // FIX: Prevent loading the same notebook repeatedly
    if (currentNotebookId === notebookId) {
        console.log(`Notebook ${notebookId} already active, skipping reload`);
        return;
    }

    try {
        // FIX: Cancel any ongoing notebook and note requests
        cancelActiveRequest("notebook");
        cancelActiveRequest("note");

        // Create new abort controller for this request
        activeRequests.loadingNotebook = new AbortController();
        const signal = activeRequests.loadingNotebook.signal;

        // Update UI to show selected notebook
        document.querySelectorAll('.notebook-item').forEach(item => {
            item.classList.remove('active');
        });

        const notebookElement = document.querySelector(`.notebook-item[data-notebook-id="${notebookId}"]`);
        if (notebookElement) {
            notebookElement.classList.add('active');

            // Toggle icon rotation (added this part)
            const toggleIcon = notebookElement.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.classList.toggle('rotated');
            }
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
        fetch(`/api/Notes/ByNotebook/${notebookId}`, { signal })
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
            })
            .then(data => {
                if (signal.aborted) {
                    throw new Error('Request aborted');
                }

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
        <div class="note-item" data-note-id="${note.id}">
            <i class="bi bi-sticky me-2"></i>
            <span class="note-title">${note.title || 'Untitled Note'}</span>
            <div class="tags-container ms-2">
                ${(note.tags || []).map(tag => `
                    <span class="badge bg-secondary me-1">${tag}</span>
                `).join('')}
            </div>
        </div>`;

                    // Properly attach event listener instead of inline onclick
                    noteElement.addEventListener('click', function (e) {
                        e.preventDefault();

                        // FIX: Prevent rapid clicking
                        if (activeRequests.loadingNote) {
                            console.log('Already loading a note, ignoring click');
                            return;
                        }

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

                // Request completed successfully
                activeRequests.loadingNotebook = null;
            })
            .catch(error => {
                if (error.name === 'AbortError' || error.message === 'Request aborted') {
                    console.log('Loading notes request was aborted');
                    return;
                }

                console.error('Error loading notes:', error);
                if (notesList && !signal.aborted) {
                    notesList.innerHTML = `<div class="text-center p-3 text-danger">Error loading notes: ${error.message}</div>`;
                }

                // Clear the request object on error
                activeRequests.loadingNotebook = null;
            });
        document.getElementById('deleteNotebookBtn').style.display = 'inline-block';

    } catch (err) {
        console.error('Error in loadNotebookNotes function:', err);
        activeRequests.loadingNotebook = null;
    }
};