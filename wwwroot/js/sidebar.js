function toggleNotebook(notebookId) {
    const notebook = document.querySelector(`[data-notebook-id="${notebookId}"]`);
    notebook.classList.toggle('active');
}


window.refreshSidebar = async function () {
    
};
// Ensure the active notebook is expanded when the page loads
document.addEventListener('DOMContentLoaded', function () {
    const activeNotebook = document.querySelector('.notebook-item.active');
    if (activeNotebook) {
        // Ensure the parent notebooks are also expanded
        let parent = activeNotebook.parentElement;
        while (parent && parent.classList.contains('notes-container')) {
            const parentNotebook = parent.closest('.notebook-item');
            if (parentNotebook) {
                parentNotebook.classList.add('active');
            }
            parent = parentNotebook ? parentNotebook.parentElement : null;
        }
    }
});
