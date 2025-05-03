using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Services
{
    // This interface lists all the methods I use to interact with the database for notes, notebooks, and tags.
    public interface INoteRepository
    {
        // Note Operations

        // I get all notes for a specific notebook and user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        // Returns: a list of notes for that notebook and user
        Task<IEnumerable<Note>> GetNotesByNotebookIdAsync(int notebookId, string userId);

        // I create a new note for a user.
        // note: the Note object to create
        // userId: the user's ID
        // Returns: the created Note object
        Task<Note> CreateNoteAsync(Note note, string userId);

        // I get a specific note by its ID for a user.
        // noteId: the note's ID
        // userId: the user's ID
        // Returns: the Note object, or null if not found or not owned by the user
        Task<Note?> GetNoteByIdAsync(int noteId, string userId);

        // I get all notes for a user.
        // userId: the user's ID
        // Returns: a collection of all notes for that user
        Task<ICollection<Note>> GetAllUserNotesAsync(string userId);

        // I update a note for a user.
        // note: the Note object with updated data
        // userId: the user's ID
        Task UpdateNoteAsync(Note note, string userId);

        // I delete a note for a user.
        // noteId: the note's ID
        // userId: the user's ID
        // Returns: true if deleted, false otherwise
        Task<bool> DeleteNoteAsync(int noteId, string userId);

        // I quickly update just the content of a note (for auto-save).
        // noteId: the note's ID
        // content: the new content to save
        // userId: the user's ID
        Task QuickUpdateNoteContentAsync(int noteId, string content, string userId);

        // Notebook Operations

        // I create a new notebook for a user.
        // notebook: the Notebook object to create
        // Returns: the created Notebook object
        Task<Notebook> CreateNotebookAsync(Notebook notebook);

        // I get all notebooks (with notes) for a user.
        // userId: the user's ID
        // Returns: a collection of notebooks (with notes) for that user
        Task<ICollection<Notebook>> GetAllUserNotebooksWithNotesAsync(string userId);

        // I get all notebooks for a user (without notes).
        // userId: the user's ID
        // Returns: a collection of notebooks for that user
        Task<ICollection<Notebook>> GetAllUserNotebooksAsync(string userId);

        // I get a specific notebook (with notes) by its ID for a user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        // Returns: the Notebook object, or null if not found or not owned by the user
        Task<Notebook?> GetNotebookWithNotesAsync(int notebookId, string userId);

        // I update a notebook for a user.
        // notebook: the Notebook object with updated data
        // userId: the user's ID
        Task UpdateNotebookAsync(Notebook notebook, string userId);

        // I delete a notebook for a user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        Task DeleteNotebookAsync(int notebookId, string userId);

        // I get a notebook by its ID for a user.
        // id: the notebook's ID
        // userId: the user's ID
        // Returns: the Notebook object
        Task<Notebook> GetNotebookByIdAsync(int id, string userId);

        // Tag Operations

        // I get all tags for a user.
        // userId: the user's ID
        // Returns: a collection of Tag objects
        Task<ICollection<Tag>> GetAllTagsAsync(string userId);

        // I get a tag by name, or create it if it doesn't exist, for a user.
        // tagName: the tag's name
        // userId: the user's ID
        // Returns: the Tag object
        Task<Tag> GetOrCreateTagAsync(string tagName, string userId);

        // I get the most popular tags.
        // count: how many tags to return
        // Returns: a collection of Tag objects
        Task<ICollection<Tag>> GetPopularTagsAsync(int count);

        // I associate a tag with a note for a user.
        // noteId: the note's ID
        // tagId: the tag's ID
        // userId: the user's ID
        // Returns: true if successful, false otherwise
        Task<bool> AssociateTagToNoteAsync(int noteId, int tagId, string userId);

        // I remove a tag from a note.
        // noteId: the note's ID
        // tagId: the tag's ID
        Task RemoveTagFromNoteAsync(int noteId, int tagId);

        // I update the name of a tag for a user.
        // tagId: the tag's ID
        // newName: the new name for the tag
        // userId: the user's ID
        // Returns: true if successful, false otherwise
        Task<bool> UpdateTagAsync(int tagId, string newName, string userId);

        // I delete a tag for a user.
        // tagId: the tag's ID
        // userId: the user's ID
        // Returns: true if deleted, false otherwise
        Task<bool> DeleteTagAsync(int tagId, string userId);

        // I get all tags for a specific note.
        // noteId: the note's ID
        // Returns: a collection of Tag objects
        Task<ICollection<Tag>> GetTagsByNoteIdAsync(int noteId);

        // Search Operations

        // I search for notes by a text term for a user.
        // searchTerm: the text to search for
        // userId: the user's ID
        // Returns: a collection of Note objects
        Task<ICollection<Note>> SearchNotesAsync(string searchTerm, string userId);

        // I search for notes by tag name for a user.
        // tagName: the tag's name
        // userId: the user's ID
        // Returns: a collection of Note objects
        Task<ICollection<Note>> SearchNotesByTagNameAsync(string tagName, string userId);

        // Batch Operations

        // I delete all notes in a specific notebook for a user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        // Returns: the number of notes deleted
        Task<int> DeleteNotesByNotebookAsync(int notebookId, string userId);

        // Statistics

        // I get statistics for a user (note, notebook, and tag counts).
        // userId: the user's ID
        // Returns: a UserStatistics object
        Task<UserStatistics> GetUserStatisticsAsync(string userId);
    }

    // This class keeps track of statistics for a user.
    // I use it to return the user's stats (like total notes, notebooks, tags, etc).
    public class UserStatistics
    {
        public int TotalNotes { get; set; } // How many notes I have
        public int TotalNotebooks { get; set; } // How many notebooks I have
        public int TotalTags { get; set; }  // How many tags I have

        // This dictionary tells me how many notes are in each notebook.
        // Key: notebook name, Value: number of notes in that notebook
        public Dictionary<string, int> NotesPerNotebook { get; set; } = new();

        // This dictionary tells me how many times each tag is used.
        // Key: tag name, Value: how many notes use that tag
        public Dictionary<string, int> TagUsageFrequency { get; set; } = new();
    }
}
