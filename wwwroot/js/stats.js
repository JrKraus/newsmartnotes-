// Load user statistics when the page loads

//await fetch('/api/Stats/Data');


// Main function to load and display user statistics
// Current item ID function

// Fetch data from API
window.getCurrentItemId = function () {
  
    return "cool"; 
};

// Fetch data from API
async function fetchNotesData() {
    try {
        const response = await fetch('/api/Stats/Data');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        
    }
}

// Update the dashboard with data
function updateDashboard(notesData) {
    // Update the stats cards
    document.getElementById('totalNotebooks').textContent = notesData.totalNotebooks;
    document.getElementById('totalNotes').textContent = notesData.totalNotes;
    document.getElementById('totalTags').textContent = notesData.totalTags;

    // Get current item ID
    const currentId = window.getCurrentItemId();

    // Clear loading indicators
    document.getElementById('notesPerNotebook').innerHTML = '';
    document.getElementById('tagUsage').innerHTML = '';

    // Populate the notes per notebook list
    const notebookList = document.getElementById('notesPerNotebook');
    Object.entries(notesData.notesPerNotebook).forEach(([notebook, count]) => {
        const listItem = document.createElement('li');
        listItem.className = 'item';

        // Check if this is the current notebook
        if (notebook === currentId) {
            listItem.classList.add('current-item');
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = notebook;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'item-value';
        valueSpan.textContent = count;

        listItem.appendChild(nameSpan);
        listItem.appendChild(valueSpan);
        notebookList.appendChild(listItem);
    });

    // Populate the tag usage list
    const tagList = document.getElementById('tagUsage');
    Object.entries(notesData.tagUsageFrequency).forEach(([tag, count]) => {
        const listItem = document.createElement('li');
        listItem.className = 'item';

        // Check if this is the current tag
        if (tag === currentId) {
            listItem.classList.add('current-item');
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = tag;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'item-value';
        valueSpan.textContent = count;

        listItem.appendChild(nameSpan);
        listItem.appendChild(valueSpan);
        tagList.appendChild(listItem);
    });
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', fetchNotesData);