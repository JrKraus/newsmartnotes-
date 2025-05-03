// This code lets you search notes by title or tag, and edit notes in a modal.
//https://learn.microsoft.com/en-us/aspnet/core/client-side/bundling-and-minification?view=aspnetcore-9.0
document.addEventListener('DOMContentLoaded', function () {
    // Get main elements from the page
    const searchForm = document.getElementById('searchForm'); // The main search form
    const searchTypeDropdown = document.getElementById('searchTypeDropdown'); // Dropdown for search type
    const searchInput = document.getElementById('searchInput'); // Input box for search
    const tagSuggestions = document.getElementById('tagSuggestions'); // Shows tag suggestions
    const searchResults = document.getElementById('searchResults'); // Where results are shown

    // Keep track of which note and notebook are selected
    let currentNoteId = null; // ID of the note being edited
    let currentNotebookId = null; // ID of the notebook being viewed

    // State for searching and modal
    let searchType = 'title'; // Can be 'title' or 'tag'
    let availableTags = []; // List of tags for suggestions
    let modalQuill; // Quill editor for modal

    // Sets up the Quill editor in the modal for editing notes
    // No parameters, returns a Quill instance or null
    function initializeModalQuill() {
        // Make sure Quill is loaded
        if (typeof Quill === 'undefined') {
            console.error('Quill library is not loaded');
            return null;
        }
        const editorContainer = document.getElementById('modalQuillEditor');
        if (!editorContainer) return null;
        try {
            // Create and return a Quill editor in the modal
            return new Quill(editorContainer, {
                theme: 'snow',
                placeholder: 'Compose your note...',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                    ]
                }
            });
        } catch (error) {
            console.error('Error initializing modal Quill:', error);
            return null;
        }
    }

    // Loads tags from the server for tag suggestions
    // No parameters
    async function loadAvailableTags() {
        try {
            const response = await fetch('/api/Tags/gettag');
            if (!response.ok) throw new Error('Failed to load tags');
            availableTags = await response.json();
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }
    // Load tags right away on page load
    loadAvailableTags();

    // When user picks a search type, update the UI and state
    document.querySelectorAll('.search-type-option').forEach(option => {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            searchType = this.dataset.type; // Set search type to 'title' or 'tag'
            searchTypeDropdown.textContent = this.textContent;
            // Update placeholder based on search type
            searchInput.placeholder = searchType === 'title'
                ? 'Search notes by title...'
                : 'Search notes by tag name...';
            // Clear input and hide tag suggestions
            searchInput.value = '';
            tagSuggestions.style.display = 'none';
        });
    });

    // When user types in search box and search type is tag, show tag suggestions
    searchInput.addEventListener('input', function () {
        if (searchType === 'tag') {
            const query = this.value.toLowerCase().trim();
            if (query) {
                // Only show tags that match the input
                const filteredTags = availableTags.filter(tag =>
                    tag.name.toLowerCase().includes(query)
                );
                if (filteredTags.length > 0) {
                    renderTagSuggestions(filteredTags);
                    tagSuggestions.style.display = 'block';
                } else {
                    tagSuggestions.style.display = 'none';
                }
            } else {
                tagSuggestions.style.display = 'none';
            }
        }
    });

    // When the search form is submitted, do the search
    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const searchValue = searchInput.value.trim();
        if (searchValue) {
            if (searchType === 'title') {
                searchNotesByTitle(searchValue);
            } else {
                searchNotesByTagName(searchValue);
            }
        }
    });

    // Shows tag suggestions under the search box
    // tags: array of tag objects
    function renderTagSuggestions(tags) {
        tagSuggestions.innerHTML = '';
        tags.forEach(tag => {
            const item = document.createElement('a');
            item.className = 'dropdown-item';
            item.href = '#';
            item.textContent = tag.name;
            item.addEventListener('click', function (e) {
                e.preventDefault();
                searchInput.value = this.textContent;
                tagSuggestions.style.display = 'none';
                // Search for notes with this tag
                searchNotesByTagName(this.textContent);
            });
            tagSuggestions.appendChild(item);
        });
    }

    // Searches notes by title
    // searchTerm: string, what to search for
    async function searchNotesByTitle(searchTerm) {
        try {
            showLoadingIndicator(); // Show spinner
            const response = await fetch(`/api/Notes/Search?term=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Search failed');
            const notes = await response.json();
            displaySearchResults(notes, searchTerm);
        } catch (error) {
            console.error('Error searching notes:', error);
            searchResults.innerHTML = `<div class="alert alert-danger">Error searching notes: ${error.message}</div>`;
        }
    }

    // Searches notes by tag name
    // tagName: string, the tag to search for
    async function searchNotesByTagName(tagName) {
        try {
            showLoadingIndicator(); // Show spinner
            const response = await fetch(`/api/Notes/SearchByTag/${encodeURIComponent(tagName)}`);
            if (!response.ok) throw new Error('Search failed');
            const notes = await response.json();
            displaySearchResults(notes, null, tagName);
        } catch (error) {
            console.error('Error searching notes by tag:', error);
            searchResults.innerHTML = `<div class="alert alert-danger">Error searching notes by tag: ${error.message}</div>`;
        }
    }

    // Shows a spinner while loading results
    // No parameters
    function showLoadingIndicator() {
        searchResults.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Searching...</p>
            </div>
        `;
    }

    // Shows the results of a search
    // notes: array of note objects
    // searchTerm: string, what was searched for (optional)
    // tagName: string, tag searched for (optional)
    function displaySearchResults(notes, searchTerm, tagName) {
        if (!notes || notes.length === 0) {
            const searchTypeText = searchTerm ? `"${searchTerm}"` : `tag "${tagName}"`;
            searchResults.innerHTML = `<div class="alert alert-info">No notes found for ${searchTypeText}</div>`;
            return;
        }
        let resultsHtml = '';
        if (searchTerm) {
            resultsHtml += `<h4>Search results for "${searchTerm}"</h4>`;
        } else if (tagName) {
            resultsHtml += `<h4>Notes with tag "${tagName}"</h4>`;
        }
        resultsHtml += '<div class="list-group">';
        notes.forEach(note => {
            resultsHtml += `
            <div class="list-group-item list-group-item-action search-note-item" data-note-id="${note.id}">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${note.title || 'Untitled Note'}</h5>
                    <small>${formatDate(note.updatedAt || note.createdAt)}</small>
                </div>
                <p class="mb-1">${getPreviewText(note.content)}</p>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="tags-container">
                        ${renderTagBadges(note.tags)}
                    </div>
                </div>
            </div>
            `;
        });
        resultsHtml += '</div>';
        searchResults.innerHTML = resultsHtml;

        // When you click a note in results, open it in the modal
        document.querySelectorAll('.search-note-item').forEach(item => {
            item.addEventListener('click', function (e) {
                // Don't open modal if clicking a tag button
                if (e.target.closest('.add-tag-btn')) return;
                const noteId = this.dataset.noteId;
                currentNoteId = noteId;
                openNoteEditModal(noteId);
            });
        });

        // When you click a tag's button, open tag modal for that note
        document.querySelectorAll('.add-tag-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const noteId = this.dataset.noteId;
                currentNoteId = noteId;
                openTagModalForNote(noteId);
            });
        });
    }

    // Makes a date string readable
    // dateString: string, the date to format
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    // Gets a short preview of note content (strips HTML)
    // content: string, HTML content of the note
    function getPreviewText(content) {
        if (!content) return '';
        const plainText = content.replace(/<[^>]*>/g, '');
        return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
    }

    // Makes HTML for tag badges
    // tags: array of tag objects
    function renderTagBadges(tags) {
        if (!tags || tags.length === 0) return '';
        let badgesHtml = '<div class="mt-2">';
        tags.forEach(tag => {
            badgesHtml += `<span class="badge bg-secondary me-1">${tag.name}</span>`;
        });
        badgesHtml += '</div>';
        return badgesHtml;
    }

    // Hide tag suggestions if you click outside
    document.addEventListener('click', function (e) {
        if (!tagSuggestions.contains(e.target) && e.target !== searchInput) {
            tagSuggestions.style.display = 'none';
        }
    });

    // Opens the note editing modal for a note
    // noteId: string, the note to open
    async function openNoteEditModal(noteId) {
        try {
            // Set up the modal's Quill editor if it isn't already
            if (!modalQuill) {
                modalQuill = initializeModalQuill();
                if (!modalQuill) {
                    showToast('Failed to initialize editor', 'danger');
                    return;
                }
            }
            // Show loading state in modal
            document.getElementById('modalNoteTitleField').value = 'Loading...';
            modalQuill.setText('Loading note content...');
            modalQuill.disable();
            document.getElementById('modalCurrentNoteTags').innerHTML = '';
            // Get note data from server
            const response = await fetch(`/api/Notes/${noteId}`);
            if (!response.ok) throw new Error(`Failed to load note: ${response.status}`);
            const note = await response.json();
            // Fill modal with note data
            document.getElementById('modalNoteTitleField').value = note.title || 'Untitled';
            modalQuill.setContents([]);
            modalQuill.clipboard.dangerouslyPasteHTML(0, note.content || '');
            modalQuill.enable();
            // Store note id in modal
            const modal = document.getElementById('noteEditModal');
            modal.dataset.noteId = noteId;
            // Load tags for this note
            loadModalNoteTags(noteId);
            currentNotebookId = note.notebookId;
            // Show the modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            // Set up save, delete, tag button actions
            document.getElementById('modalSaveNoteBtn').onclick = saveModalNote;
            document.getElementById('modalDeleteNoteBtn').onclick = deleteModalNote;
            document.getElementById('modalTagNoteBtn').onclick = () => openTagModalForNote(noteId);
        } catch (error) {
            console.error('Error opening note edit modal:', error);
            showToast(`Failed to load note: ${error.message}`, 'danger');
        }
    }

    // Loads tags for a note in the modal
    // noteId: string, note to load tags for
    async function loadModalNoteTags(noteId) {
        try {
            const response = await fetch(`/api/Notetag/${noteId}`);
            if (!response.ok) throw new Error(`Failed to load tags: ${response.status}`);
            const tags = await response.json();
            displayModalNoteTags(tags);
        } catch (error) {
            console.error('Error loading note tags:', error);
        }
    }

    // Shows tags in the modal
    // tags: array of tag objects
    function displayModalNoteTags(tags) {
        const tagsContainer = document.getElementById('modalCurrentNoteTags');
        if (!tagsContainer) return;
        tagsContainer.innerHTML = '';
        if (!tags || tags.length === 0) {
            const noTagsSpan = document.createElement('span');
            noTagsSpan.className = 'text-muted small';
            noTagsSpan.textContent = 'No tags';
            tagsContainer.appendChild(noTagsSpan);
            return;
        }
        tags.forEach(tag => {
            const tagName = typeof tag === 'object' ? (tag.tagId || tag.TagId || '') : tag;
            const tagId = typeof tag === 'object' ? (tag.id || tag.Id || '') : '';
            const tagBadge = document.createElement('span');
            tagBadge.className = 'badge bg-primary me-1 mb-1';
            tagBadge.textContent = tagName;
            tagBadge.dataset.tagId = tagId;
            // Add a remove button to each tag
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-close btn-close-white ms-1';
            removeBtn.style.fontSize = '0.5rem';
            removeBtn.setAttribute('aria-label', 'Remove tag');
            removeBtn.onclick = function (e) {
                e.stopPropagation();
                removeModalNoteTag(document.getElementById('noteEditModal').dataset.noteId, tagId, tagName);
            };
            tagBadge.appendChild(removeBtn);
            tagsContainer.appendChild(tagBadge);
        });
    }

    // Checks if the Quill editor is empty
    // quill: Quill instance
    function isQuillEmpty(quill) {
        if (!quill || !quill.getContents) return true;
        const contents = quill.getContents();
        if (contents.ops.length === 1 &&
            (contents.ops[0].insert === '\n' || !contents.ops[0].insert || contents.ops[0].insert.trim() === '')) {
            return true;
        }
        const text = quill.getText().trim();
        return text === '' || text === '\n';
    }

    // Saves the note from the modal
    async function saveModalNote() {
        const modal = document.getElementById('noteEditModal');
        const noteId = modal.dataset.noteId;
        const noteTitle = document.getElementById('modalNoteTitleField').value.trim();
        if (!noteTitle) {
            showToast('Title is required', 'warning');
            return;
        }
        const noteContent = modalQuill.root.innerHTML;
        const plainTextContent = modalQuill.getText().trim();
        if (!plainTextContent || plainTextContent === '\n' || isQuillEmpty(modalQuill)) {
            showToast('Content is required', 'warning');
            return;
        }
        const notebookId = currentNotebookId;
        if (!notebookId) {
            showToast('Notebook ID is missing', 'danger');
            return;
        }
        if (!noteId) {
            showToast('Note ID not found', 'danger');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('Title', noteTitle);
            formData.append('Content', noteContent);
            formData.append('NotebookId', notebookId);
            const response = await fetch(`/api/Notes/${noteId}`, {
                method: 'PUT',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('input[name="__RequestVerificationToken"]')?.value,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            if (!response.ok) {
                let errorMessage = `Failed to save note: ${response.statusText}`;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        if (errorData && errorData.errors) {
                            const errorDetails = Object.entries(errorData.errors)
                                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                                .join('\n');
                            errorMessage = `Validation error:\n${errorDetails}`;
                            if (errorData.errors.Title) {
                                document.getElementById('modalNoteTitleField').classList.add('is-invalid');
                            }
                            if (errorData.errors.Content) {
                                modalQuill.root.classList.add('is-invalid');
                            }
                        } else if (errorData && errorData.title) {
                            errorMessage = errorData.title;
                        } else if (errorData && errorData.error) {
                            errorMessage = errorData.error;
                        }
                    }
                } catch (jsonError) { }
                throw new Error(errorMessage);
            }
            showToast('Note saved successfully', 'success');
            document.getElementById('modalNoteTitleField').classList.remove('is-invalid');
            modalQuill.root.classList.remove('is-invalid');
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            } else {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
            }
            refreshAfterSave();
        } catch (error) {
            console.error('Error saving note:', error);
            showToast(`Failed to save note: ${error.message}`, 'danger');
        }
    }

    // Refreshes the view after saving a note
    function refreshAfterSave() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            setTimeout(() => {
                if (typeof searchType !== 'undefined' && searchType === 'title') {
                    if (typeof searchNotesByTitle === 'function') {
                        searchNotesByTitle(searchInput.value);
                    } else {
                        refreshCurrentView();
                    }
                } else {
                    if (typeof searchNotesByTagName === 'function') {
                        searchNotesByTagName(searchInput.value);
                    } else {
                        refreshCurrentView();
                    }
                }
            }, 300);
        } else {
            if (typeof refreshCurrentView === 'function') {
                refreshCurrentView();
            } else if (typeof loadNotebookNotes === 'function' && typeof currentNotebookId !== 'undefined') {
                loadNotebookNotes(currentNotebookId);
            }
        }
    }

    // Deletes the note from the modal
    async function deleteModalNote() {
        const modal = document.getElementById('noteEditModal');
        const noteId = modal.dataset.noteId;
        if (!noteId) {
            showToast('Note ID not found', 'danger');
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
            showToast('Note deleted successfully', 'success');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();
            if (document.getElementById('searchInput').value) {
                if (searchType === 'title') {
                    searchNotesByTitle(document.getElementById('searchInput').value);
                } else {
                    searchNotesByTagName(document.getElementById('searchInput').value);
                }
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            showToast(`Failed to delete note: ${error.message}`, 'danger');
        }
    }

    // Removes a tag from a note in the modal
    async function removeModalNoteTag(noteId, tagId, tagName) {
        try {
            const response = await fetch(`/api/Notetag/Notes/${noteId}/Tags/${tagId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                loadModalNoteTags(noteId);
                showToast(`Tag "${tagName}" removed successfully`, 'success');
            } else {
                throw new Error(data.error || 'Failed to remove tag');
            }
        } catch (error) {
            console.error('Error removing tag:', error);
            showToast(`Failed to remove tag: ${error.message}`, 'danger');
        }
    }

    // Opens tag management modal for a note
    function openTagModalForNote(noteId) {
        currentNoteId = noteId;
        showTagModal();
        const tagModal = document.getElementById('tagModal');
        const bsTagModal = new bootstrap.Modal(tagModal);
        bsTagModal.show();
    }

    // Shows a toast notification in the bottom right of the page
    // message: string to show, type: Bootstrap color type (success, danger, etc.)
    function showToast(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        `;
        toastContainer.appendChild(toastEl);
        try {
            const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
            toast.show();
            toastEl.addEventListener('hidden.bs.toast', function () {
                toastEl.remove();
            });
        } catch (err) {
            setTimeout(() => {
                toastEl.remove();
            }, 3000);
        }
    }

    // Shows the tag management modal and loads tags
    window.showTagModal = async function () {
        try {
            const response = await fetch('/api/Tags/gettag');
            if (!response.ok) throw new Error(`Failed to fetch tags: ${response.status}`);
            const tags = await response.json();
            const tagContainer = document.getElementById('existingTagsContainer');
            if (!tagContainer) return false;
            tagContainer.innerHTML = '';
            const separator = document.createElement('hr');
            tagContainer.appendChild(separator);
            const existingTagsTitle = document.createElement('h5');
            existingTagsTitle.textContent = 'Existing Tags';
            existingTagsTitle.className = 'mb-3';
            tagContainer.appendChild(existingTagsTitle);
            tags.forEach((tag, index) => {
                const tagName = typeof tag === 'object' ? (tag.name || tag.Name || '') : tag;
                const tagId = typeof tag === 'object' ? (tag.id || tag.Id || index) : index;
                const tagDiv = document.createElement('div');
                tagDiv.className = 'tag-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded';
                tagDiv.dataset.tagId = tagId;
                tagDiv.dataset.tagName = tagName;
                const nameSpan = document.createElement('span');
                nameSpan.textContent = tagName;
                nameSpan.className = 'tag-name';
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'tag-actions';
                const applyBtn = document.createElement('button');
                applyBtn.className = 'btn btn-sm btn-success me-1';
                applyBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Apply';
                applyBtn.onclick = function () { applyTagToCurrentItem(tagId, tagName); };
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-outline-primary me-1';
                editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                editBtn.onclick = function () { editTag(tagId, tagName); };
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.onclick = function () { deleteTag(tagId, tagName); };
                buttonsDiv.appendChild(applyBtn);
                buttonsDiv.appendChild(editBtn);
                buttonsDiv.appendChild(deleteBtn);
                tagDiv.appendChild(nameSpan);
                tagDiv.appendChild(buttonsDiv);
                tagContainer.appendChild(tagDiv);
            });
            document.getElementById('newTag').value = '';
            return true;
        } catch (error) {
            console.error('Error loading tags:', error);
            showToast('Failed to load tags: ' + error.message, 'danger');
            return false;
        }
    };

    // Refreshes the tag list in the tag modal and tag suggestions
    function refreshTagsList() {
        if (document.getElementById('tagModal') &&
            document.getElementById('tagModal').classList.contains('show')) {
            window.showTagModal();
        }
        loadAvailableTags();
    }

    // Adds a tag to the current note from the tag modal input
    window.applyTag = async function () {
        const newTag = document.getElementById('newTag').value.trim();
        if (!newTag) {
            showToast('Please enter a tag name', 'warning');
            return;
        }
        if (!currentNoteId) {
            showToast('No note selected', 'warning');
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
                document.getElementById('newTag').value = '';
                loadModalNoteTags(currentNoteId);
                refreshTagsList();
                return;
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            showToast(data.message, 'success');
            document.getElementById('newTag').value = '';
            loadModalNoteTags(currentNoteId);
            refreshTagsList();
        } catch (error) {
            console.error('Error applying tag:', error);
            showToast(`Failed to apply tag: ${error.message}`, 'danger');
        }
    };

    // Applies a tag to the current note by clicking "Apply" in tag modal
    async function applyTagToCurrentItem(tagId, tagName) {
        if (!currentNoteId) {
            showToast('No note selected', 'warning');
            return;
        }
        await fetch(`/api/Tags/${currentNoteId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ tag: tagName })
        })
            .then(response => {
                if (response.status === 204 || response.ok) {
                    showToast(`Tag "${tagName}" added successfully`, 'success');
                    refreshTagsList();
                    loadModalNoteTags(currentNoteId);
                    const tagModal = document.getElementById('tagModal');
                    const bsModal = bootstrap.Modal.getInstance(tagModal);
                    if (bsModal) bsModal.hide();
                    return;
                }
                throw new Error('Failed to apply tag');
            })
            .catch(error => {
                console.error('Error applying tag:', error);
                showToast(`Failed to apply tag: ${error.message}`, 'danger');
            });
    }

    // Edits a tag's name
    async function editTag(tagId, tagName) {
        const newName = prompt('Enter new tag name:', tagName);
        if (!newName || newName === tagName) return;
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
                let errorMessage = 'Failed to update tag';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (jsonError) {
                    errorMessage = `Failed to update tag: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            const result = await response.json();
            loadModalNoteTags(currentNoteId);
            refreshTagsList();
            showToast(result.message || `Tag renamed to "${newName}"`, 'success');
        } catch (error) {
            console.error('Error updating tag:', error);
            showToast(`Failed to update tag: ${error.message}`, 'danger');
        }
    }

    // Deletes a tag
    async function deleteTag(tagId, tagName) {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) return;
        await fetch(`/api/Tags/${tagId}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => {
                if (!response.ok) throw new Error('Failed to delete tag');
                showToast(`Tag "${tagName}" deleted`, 'success');
                loadModalNoteTags(currentNoteId);
                refreshTagsList();
            })
            .catch(error => {
                console.error('Error deleting tag:', error);
                showToast(`Failed to delete tag: ${error.message}`, 'danger');
            });
    }

    // Handles dropdown toggle for search type
    searchTypeDropdown.addEventListener('click', function () {
        const expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
    });
});
