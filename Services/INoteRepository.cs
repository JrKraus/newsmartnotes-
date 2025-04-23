using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models.Entities;   

namespace termprojectJksmartnote.Services
{
    //this interface defines the methods that will be used to interact with the database


    public interface INoteRepository
    {
        // Note Operations
        Task<IEnumerable<Note>> GetNotesByNotebookIdAsync(int notebookId, string userId);

        /// <summary>
        /// Retrieves all notes associated with a specific notebook for the user
        /// </summary>
        /// <param name="note"></param>
        /// <param name="userId"></param>
        /// <returns></returns>


        Task<Note> CreateNoteAsync(Note note, string userId);
            /// Creates a new note associated with the specified user 
            /// <param name="noteId"></param>  the note to be created
            /// <param name="userId"></param> the ID of the user creating the note
            /// returns the created Note object
        Task<Note?> GetNoteByIdAsync(int noteId, string userId);
            /// Retrieves a specific note by ID if it belongs to the user
            /// <param name="noteId">ID of the note to get</param>
            /// <param name="userId">ID of the requesting user</param>
            /// returns Note object or null if not found/unauthorized
        Task<ICollection<Note>> GetAllUserNotesAsync(string userId);
            /// Gets all notes belonging to a user
            /// </summary>
            /// <param name="userId">ID of the user</param>
            /// returns collection of notes (empty if none found)
        Task UpdateNoteAsync(Note note, string userId);
        /// Updates an existing note if it belongs to the user
        /// <param name="note">Note object with updated data</param>
        /// <param name="userId">ID of the user updating the note</param>
        /// returns updated Note object
        Task<bool> DeleteNoteAsync(int noteId, string userId);
            /// Deletes a note if it belongs to the user   
            /// <param name="noteId"></param>
            /// <param name="content"></param>
            /// <param name="userId"></param>
            /// returns nothing accepted a message saying the note was deleted
        Task QuickUpdateNoteContentAsync(int noteId, string content, string userId); // For auto-save
            /// Quickly updates the content of a note for auto-save functionality
            /// <param name="notebook"></param>
            /// <param name="userId"></param>
            /// returns nothing accepted a message saying the note was updated 

        // Notebook Operations
        
        Task<Notebook> CreateNotebookAsync(Notebook notebook);

        /// Creates a new notebook associated with the specified user
        /// <param name="userId"></param>
        /// returns the created Notebook object
        Task<ICollection<Notebook>> GetAllUserNotebooksWithNotesAsync(string userId);
        // Retrieves all notebooks belonging to the user with their notes
        /// <param name="userId"></param>
        /// returns collection of notebooks and notes (empty if none found)
        Task<ICollection<Notebook>> GetAllUserNotebooksAsync(string userId);
        /// Retrieves all notebooks belonging to the user 
        /// <param name="notebookId"></param>
        /// <param name="userId"></param>
        /// returns collection of notebooks (empty if none found)
        Task<Notebook?> GetNotebookWithNotesAsync(int notebookId, string userId);
        /// Retrieves a specific notebook by ID if it belongs to the user 
        /// <param name="notebook"></param>
        /// <param name="userId"></param>
        /// return Notebook object or null if not found/unauthorized
        Task UpdateNotebookAsync(Notebook notebook, string userId);
        /// Updates an existing notebook if it belongs to the user 
        /// <param name="notebookId"></param>
        /// <param name="userId"></param>
        /// returns updated Notebook object
        Task DeleteNotebookAsync(int notebookId, string userId);
        // Deletes a notebook if it belongs to the user 
        // <param name="notebookId"></param>
        // <param name="userId"></param>
        // returns nothing accepted a message saying the notebook was deleted

        Task<Notebook> GetNotebookByIdAsync(int id, string userId);

        // Tag Operations
        Task<ICollection<Tag>> GetAllTagsAsync(string userId);
        Task<Tag> GetOrCreateTagAsync(string tagName);
        // Retrieves an existing tag or creates a new one if it doesn't exist
        // <param name="tagName"></param>
        // returns the Tag object
        Task<ICollection<Tag>> GetPopularTagsAsync(int count);
        // Retrieves the most popular tags
        // <param name="count"></param>
        // returns a collection of Tag objects

        Task<bool> AssociateTagToNoteAsync(int noteId, int tagId, string userId);
        // Associates a tag with a note
        // <param name="noteId"></param>
        // <param name="tagId"></param>
        // returns nothing the tag was associated with the note now
        Task RemoveTagFromNoteAsync(int noteId, int tagId);
        // Removes the association between a tag and a note
        // <param name="noteId"></param>
        // <param name="tagId"></param>
        // returns nothing the tag was removed from the note now
        Task<bool> UpdateTagAsync(int tagId, string newName, string userId);
        // Updates the name of an existing tag
        // <param name="tagId"></param>
        // <param name="newName"></param>
        // returns nothing the tag was updated now

        Task<bool> DeleteTagAsync(int tagId, string userId);

        Task<ICollection<Tag>> GetTagsByNoteIdAsync(int noteId);


        // Search Operations
        Task<ICollection<Note>> SearchNotesAsync(string searchTerm, string userId);
        // Searches for notes containing the specified term
        // <param name="searchTerm"></param>
        // <param name="userId"></param>
        // returns a collection of Note objects (empty if none found)
        Task<ICollection<Note>> SearchNotesByTagAsync(int tagId, string userId);
        // Searches for notes associated with a specific tag
        // <param name="tagId"></param> 
        // <param name="userId"></param>
        // returns a collection of Note objects (empty if none found)

        // Batch Operations

        Task<int> DeleteNotesByNotebookAsync(int notebookId, string userId);
        // Deletes all notes in a specific notebook
        // <param name="notebookId"></param>
        // <param name="userId"></param>
        // returns the number of notes deleted


        // Statistics
        Task<UserStatistics> GetUserStatisticsAsync(string userId);
        // Retrieves user statistics including note, notebook, and tag counts
        // <param name="userId"></param>
        // returns a UserStatistics object containing the statistics


      

    }

    public class UserStatistics
    {
        //this keep track of the user statistics 
        //this class is used to return the user statistics
      
        public int TotalNotes { get; set; } // Total number of notes
        public int TotalNotebooks { get; set; } // Total number of notebooks
        public int TotalTags { get; set; }  //  Total number of tags
        public Dictionary<string, int> NotesPerNotebook { get; set; } = new(); 
                                                                            
        /// Dictionary to store the number of notes per notebook                                                                   
        
        public Dictionary<string, int> TagUsageFrequency { get; set; } = new();
        /// Dictionary to store the frequency of tag usage
    }


}

