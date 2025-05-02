// This code loads and shows user stats on the dashboard when the page loads

// This function returns the current item ID  
// No input parameters
// Returns: string (the current item ID)
window.getCurrentItemId = function () {
    return; 
    //this looks empty but without this function 
    //it doesn't display the data
};  


// This function gets stats data from the backend and updates the dashboard
// No input parameters
async function fetchNotesData() {
    try {
        // Ask the server for stats data from this URL
        const response = await fetch('/api/Stats/Data');
        // If the server didn't send OK (200), show an error
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        // Get the JSON data from the server's response
        const data = await response.json();
        // Call updateDashboard and give it the data
        updateDashboard(data);
    } catch (error) {
        // If something went wrong, print the error in the browser console
        console.error('Error fetching data:', error);
    }
}

// This function updates the dashboard with the stats data
// notesData: object that has totalNotebooks, totalNotes, totalTags, notesPerNotebook, tagUsageFrequency
function updateDashboard(notesData) {
    // Set the big stats at the top of the dashboard
    document.getElementById('totalNotebooks').textContent = notesData.totalNotebooks;
    document.getElementById('totalNotes').textContent = notesData.totalNotes;
    document.getElementById('totalTags').textContent = notesData.totalTags;

    // Get the current item ID (could be a notebook or tag)
    const currentId = window.getCurrentItemId();

    // Clear out the old lists or loading spinners
    document.getElementById('notesPerNotebook').innerHTML = '';
    document.getElementById('tagUsage').innerHTML = '';

    // Show the number of notes in each notebook
    // notesData.notesPerNotebook is an object like {notebookName: noteCount, ...}
    const notebookList = document.getElementById('notesPerNotebook');
    Object.entries(notesData.notesPerNotebook).forEach(([notebook, count]) => {
        // Make a new list item for this notebook
        const listItem = document.createElement('li');
        listItem.className = 'item';

        // If this notebook is the current one, highlight it
        if (notebook === currentId) {
            listItem.classList.add('current-item');
        }

        // Make a span for the notebook name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = notebook;

        // Make a span for the note count
        const valueSpan = document.createElement('span');
        valueSpan.className = 'item-value';
        valueSpan.textContent = count;

        // Add the name and value to the list item
        listItem.appendChild(nameSpan);
        listItem.appendChild(valueSpan);

        // Add this notebook to the list on the page
        notebookList.appendChild(listItem);
    });

    // Show how many times each tag is used
    // notesData.tagUsageFrequency is an object like {tagName: tagCount, ...}
    const tagList = document.getElementById('tagUsage');
    Object.entries(notesData.tagUsageFrequency).forEach(([tag, count]) => {
        // Make a new list item for this tag
        const listItem = document.createElement('li');
        listItem.className = 'item';

        // If this tag is the current one, highlight it
        if (tag === currentId) {
            listItem.classList.add('current-item');
        }

        // Make a span for the tag name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = tag;

        // Make a span for the tag count
        const valueSpan = document.createElement('span');
        valueSpan.className = 'item-value';
        valueSpan.textContent = count;

        // Add the name and value to the list item
        listItem.appendChild(nameSpan);
        listItem.appendChild(valueSpan);

        // Add this tag to the list on the page
        tagList.appendChild(listItem);
    });
}

// When the page is finished loading, call fetchNotesData to show the stats
document.addEventListener('DOMContentLoaded', fetchNotesData);
