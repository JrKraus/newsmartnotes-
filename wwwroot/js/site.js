// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const searchForm = document.getElementById('searchForm');
    const searchTypeDropdown = document.getElementById('searchTypeDropdown');
    const searchInput = document.getElementById('searchInput');
    const tagSuggestions = document.getElementById('tagSuggestions');
    const searchResults = document.getElementById('searchResults');

    // State variables
    let searchType = 'title'; // Default search type
    let availableTags = [];
    let modalQuill;
    // At the top of your search.js file
    //let modalQuill;

    // Update your initializeModalQuill function
    function initializeModalQuill() {
        // Check if Quill is defined globally
        if (typeof Quill === 'undefined') {
            console.error('Quill library is not loaded');
            return null;
        }

        const editorContainer = document.getElementById('modalQuillEditor');
        if (!editorContainer) return null;

        try {
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


    // Load available tags when the page loads
    loadAvailableTags();

    // Handle search type selection
    document.querySelectorAll('.search-type-option').forEach(option => {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            searchType = this.dataset.type;
            searchTypeDropdown.textContent = this.textContent;

            // Update placeholder based on search type
            searchInput.placeholder = searchType === 'title'
                ? 'Search notes by title...'
                : 'Search notes by tag name...';

            // Clear input when switching search types
            searchInput.value = '';

            // Hide tag suggestions
            tagSuggestions.style.display = 'none';
        });
    });

    // Handle input for tag search
    searchInput.addEventListener('input', function () {
        if (searchType === 'tag') {
            const query = this.value.toLowerCase().trim();

            if (query) {
                // Filter tags based on input
                const filteredTags = availableTags.filter(tag =>
                    tag.name.toLowerCase().includes(query)
                );

                // Show tag suggestions
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

    // Handle form submission
    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const searchValue = searchInput.value.trim();

        if (searchValue) {
            if (searchType === 'title') {
                searchNotesByTitle(searchValue);
            } else {
                // For tag search, we'll search by the tag name
                searchNotesByTagName(searchValue);
            }
        }
    });

    // Function to render tag suggestions
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

                // Auto-submit the search
                searchNotesByTagName(this.textContent);
            });

            tagSuggestions.appendChild(item);
        });
    }

    // Function to load available tags
    async function loadAvailableTags() {
        try {
            const response = await fetch('/api/Tags/gettag');
            if (!response.ok) throw new Error('Failed to load tags');

            availableTags = await response.json();
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }

    // Function to search notes by title
    async function searchNotesByTitle(searchTerm) {
        try {
            showLoadingIndicator();

            const response = await fetch(`/api/Notes/Search?term=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Search failed');

            const notes = await response.json();
            displaySearchResults(notes, searchTerm);
        } catch (error) {
            console.error('Error searching notes:', error);
            searchResults.innerHTML = `<div class="alert alert-danger">Error searching notes: ${error.message}</div>`;
        }
    }

    // Function to search notes by tag name
    async function searchNotesByTagName(tagName) {
        try {
            showLoadingIndicator();

            const response = await fetch(`/api/Notes/SearchByTag/${encodeURIComponent(tagName)}`);
            if (!response.ok) throw new Error('Search failed');

            const notes = await response.json();
            displaySearchResults(notes, null, tagName);
        } catch (error) {
            console.error('Error searching notes by tag:', error);
            searchResults.innerHTML = `<div class="alert alert-danger">Error searching notes by tag: ${error.message}</div>`;
        }
    }

    // Function to display search results


    // Helper function to show loading indicator
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
    function displaySearchResults(notes, searchTerm, tagName) {
        if (!notes || notes.length === 0) {
            const searchType = searchTerm ? `"${searchTerm}"` : `tag "${tagName}"`;
            searchResults.innerHTML = `<div class="alert alert-info">No notes found for ${searchType}</div>`;
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

        // Add click handlers for note selection
        document.querySelectorAll('.search-note-item').forEach(item => {
            item.addEventListener('click', function (e) {
                // Only handle clicks on the item itself, not on buttons inside it
                if (e.target.closest('.add-tag-btn')) return;

                const noteId = this.dataset.noteId;
                currentNoteId = noteId; // Set the global currentNoteId
                loadNoteContent(noteId);
            });
        });

        // Add click handlers for tag buttons
        document.querySelectorAll('.add-tag-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent triggering the parent note click
                const noteId = this.dataset.noteId;
                currentNoteId = noteId; // Set the global currentNoteId
                openTagModalForNote(noteId);
            });
        });
    }


    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    // Helper function to get preview text from note content
    function getPreviewText(content) {
        if (!content) return '';
        const plainText = content.replace(/<[^>]*>/g, '');
        return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
    }

    // Helper function to render tag badges
    function renderTagBadges(tags) {
        if (!tags || tags.length === 0) return '';

        let badgesHtml = '<div class="mt-2">';
        tags.forEach(tag => {
            badgesHtml += `<span class="badge bg-secondary me-1">${tag.name}</span>`;
        });
        badgesHtml += '</div>';

        return badgesHtml;
    }

    // Close tag suggestions when clicking outside
    document.addEventListener('click', function (e) {
        if (!tagSuggestions.contains(e.target) && e.target !== searchInput) {
            tagSuggestions.style.display = 'none';
        }
    });
    // Modal Quill editor instance


    // Initialize modal Quill editor
    function initializeModalQuill() {
        if (modalQuill) return modalQuill;

        const editorContainer = document.getElementById('modalQuillEditor');
        if (!editorContainer) return null;

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
            console.error('Error initializing modal Quill:', error);
            return null;
        }
    }

    // Open the note edit modal
    async function openNoteEditModal(noteId) {
        try {
            // Initialize modal Quill if not already done
            if (!modalQuill) {
                modalQuill = initializeModalQuill();
                if (!modalQuill) {
                    showToast('Failed to initialize editor', 'danger');
                    return;
                }
            }

            // Show loading state
            document.getElementById('modalNoteTitleField').value = 'Loading...';
            modalQuill.setText('Loading note content...');
            modalQuill.disable();
            document.getElementById('modalCurrentNoteTags').innerHTML = '';

            // Fetch note data
            const response = await fetch(`/api/Notes/${noteId}`);
            if (!response.ok) {
                throw new Error(`Failed to load note: ${response.status}`);
            }

            const note = await response.json();

            // Update modal with note data
            document.getElementById('modalNoteTitleField').value = note.title || 'Untitled';
            modalQuill.setContents([]);
            modalQuill.clipboard.dangerouslyPasteHTML(0, note.content || '');
            modalQuill.enable();

            // Store the note ID in the modal for later use
            const modal = document.getElementById('noteEditModal');
            modal.dataset.noteId = noteId;

            // Load tags
            loadModalNoteTags(noteId);

            // Show the modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            // Set up event handlers
            document.getElementById('modalSaveNoteBtn').onclick = saveModalNote;
            document.getElementById('modalDeleteNoteBtn').onclick = deleteModalNote;
            document.getElementById('modalTagNoteBtn').onclick = () => openTagModalForNote(noteId);

        } catch (error) {
            console.error('Error opening note edit modal:', error);
            showToast(`Failed to load note: ${error.message}`, 'danger');
        }
    }

    // Load tags for the modal
    async function loadModalNoteTags(noteId) {
        try {
            const response = await fetch(`/api/Notetag/${noteId}`);
            if (!response.ok) {
                throw new Error(`Failed to load tags: ${response.status}`);
            }

            const tags = await response.json();
            displayModalNoteTags(tags);
        } catch (error) {
            console.error('Error loading note tags:', error);
        }
    }

    // Display tags in the modal
    function displayModalNoteTags(tags) {
        const tagsContainer = document.getElementById('modalCurrentNoteTags');
        if (!tagsContainer) return;

        // Clear existing tags
        tagsContainer.innerHTML = '';

        // If no tags, show a placeholder
        if (!tags || tags.length === 0) {
            const noTagsSpan = document.createElement('span');
            noTagsSpan.className = 'text-muted small';
            noTagsSpan.textContent = 'No tags';
            tagsContainer.appendChild(noTagsSpan);
            return;
        }

        // Add each tag as a badge
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

    // Save the note from the modal
    async function saveModalNote() {
        const modal = document.getElementById('noteEditModal');
        const noteId = modal.dataset.noteId;

        if (!noteId) {
            showToast('Note ID not found', 'danger');
            return;
        }

        try {
            const noteTitle = document.getElementById('modalNoteTitleField').value || 'Untitled Note';
            const noteContent = modalQuill.root.innerHTML;

            // Get the notebook ID from the main editor or from the note data
            const notebookId = currentNotebookId; // This should be set when the note was loaded

            const response = await fetch(`/api/Notes/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    id: noteId,
                    title: noteTitle,
                    content: noteContent,
                    notebookId: notebookId
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to save note: ${response.status}`);
            }

            showToast('Note saved successfully', 'success');

            // Close the modal
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();

            // Refresh the search results
            if (document.getElementById('searchTerm').value) {
                searchNotesByTitle(document.getElementById('searchTerm').value);
            } else if (document.getElementById('tagId').value) {
                searchNotesByTag(document.getElementById('tagId').value);
            }

        } catch (error) {
            console.error('Error saving note:', error);
            showToast(`Failed to save note: ${error.message}`, 'danger');
        }
    }

    // Delete the note from the modal
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

            // Close the modal
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();

            // Refresh the search results
            if (document.getElementById('searchTerm').value) {
                searchNotesByTitle(document.getElementById('searchTerm').value);
            } else if (document.getElementById('tagId').value) {
                searchNotesByTag(document.getElementById('tagId').value);
            }

        } catch (error) {
            console.error('Error deleting note:', error);
            showToast(`Failed to delete note: ${error.message}`, 'danger');
        }
    }

    // Remove a tag from a note in the modal
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
                // Reload tags to refresh the UI
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

    // Open tag management modal for a note
    function openTagModalForNote(noteId) {
        // Store the current note ID for the tag modal
        currentNoteId = noteId;

        // Show the tag modal
        showTagModal();

        // Open the Bootstrap modal
        const tagModal = document.getElementById('tagModal');
        const bsTagModal = new bootstrap.Modal(tagModal);
        bsTagModal.show();
    }
    // Add this function to your search.js file
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
    window.showTagModal = async function () {
        try {
            // Log the request URL for debugging
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

            // Get the container for the tags
            const tagContainer = document.getElementById('existingTagsContainer');
            if (!tagContainer) {
                console.error('Could not find the tag container element');
                return false;
            }

            // Clear existing content
            tagContainer.innerHTML = '';

            // Create a tag list with action buttons




            // Add a separator
            const separator = document.createElement('hr');
            tagContainer.appendChild(separator);

            // Add section title for existing tags
            const existingTagsTitle = document.createElement('h5');
            existingTagsTitle.textContent = 'Existing Tags';
            existingTagsTitle.className = 'mb-3';
            tagContainer.appendChild(existingTagsTitle);

            // Create a tag list with action buttons
            tags.forEach((tag, index) => {
                const tagName = typeof tag === 'object' ? (tag.name || tag.Name || '') : tag;
                const tagId = typeof tag === 'object' ? (tag.id || tag.Id || index) : index;

                // Create a div for the tag with buttons
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

                // Apply tag button (new!)
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

                // Append all elements
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

});
