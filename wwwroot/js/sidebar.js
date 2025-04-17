function toggleNotebook(notebookId) {
    const notebook = document.querySelector(`[data-notebook-id="${notebookId}"]`);
    notebook.classList.toggle('active');
}

function createNote(notebookId) {
    window.location.href = '/Notes/Create?notebookId=' + notebookId;
}
window.refreshSidebar = async function () {
    //try {
        
    //    const response = await fetch('/api/Notebooks/GetNotebooksSidebar', {
    //        method: 'GET',
    //        headers: {
    //            'X-Requested-With': 'XMLHttpRequest'
    //        }
    //    });

    //    if (!response.ok) throw new Error('Failed to refresh sidebar');

    //    const html = await response.text();
    //    document.querySelector('.notebooks-container').innerHTML = html;

    //    // Re-attach any event listeners
    //    initializeNotebookEvents();
    //} catch (error) {
    //    console.error('Error refreshing sidebar:', error);
    //}
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
