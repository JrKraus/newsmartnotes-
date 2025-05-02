// This function opens or closes a notebook in the sidebar
// notebookId: string, the ID of the notebook to toggle
function toggleNotebook(notebookId) {
    // Find the notebook element using its data attribute
    const notebook = document.querySelector(`[data-notebook-id="${notebookId}"]`);
    // Toggle the 'active' class to expand/collapse the notebook
    notebook.classList.toggle('active');
}



// This code runs when the page finishes loading
document.addEventListener('DOMContentLoaded', function () {
    // Find the notebook that is marked as active (selected)
    const activeNotebook = document.querySelector('.notebook-item.active');
    // If there is an active notebook
    if (activeNotebook) {
        // Go up the DOM tree to make sure all parent notebooks are also expanded
        let parent = activeNotebook.parentElement;
        // Keep going up as long as the parent is a notes-container
        while (parent && parent.classList.contains('notes-container')) {
            // Find the parent notebook item
            const parentNotebook = parent.closest('.notebook-item');
            if (parentNotebook) {
                // Add 'active' class to expand the parent notebook
                parentNotebook.classList.add('active');
            }
            // Move up to the next parent in the tree
            parent = parentNotebook ? parentNotebook.parentElement : null;
        }
    }
});

