using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Services
{

    //here we are implementing the INoteRepository interface
    // this class is responsible for all the database operations related to notes, notebooks and tags
    //it also creates the user stats
    public class NoteRepository : INoteRepository
    {
        // Database context is used to interact with the database
        private readonly ApplicationDbContext _context;
        /// UserManager is used to manage user accounts
        private readonly UserManager<User> _userManager;
        // the follow linked help me understand user manager 
        // https://docs.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-7.0

        /// Constructor for NoteRepository 


        /// <param name="context"></param>
        /// <param name="userManager"></param>
        public NoteRepository(ApplicationDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // Note Operations
        /// Creates a new note associated with the specified us 
        /// Creates a new note associated with the specified us
        /// <param name="note"></param>
        /// <param name="userId"></param>
        /// returns the created Note object
        /// <exception cref="InvalidOperationException"></exception>
        public async Task<Note> CreateNoteAsync(Note note, string userId)
        {
            // Validate notebook ownership
            var notebookExists = await _context.Notebooks
                .AnyAsync(n => n.Id == note.NotebookId && n.UserId == userId);

            if (!notebookExists)
            {
                throw new InvalidOperationException("Notebook not found or access denied");
            }

            // Set timestamps
            note.CreatedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            // Add and save
            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            return note;
        }

        /// Retrieves a specific note by ID if it belongs to the user 
        /// <param name="noteId"></param>
        /// <param name="userId"></param>
        /// return Note object or null if not found/unauthorized
        public async Task<Note?> GetNoteByIdAsync(int noteId, string userId)
        {
            return await _context.Notes
                .Include(n => n.Notebook)
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .FirstOrDefaultAsync(n => n.Id == noteId && n.Notebook.UserId == userId);
        }
        /// Retrieves all notes belonging to the user 
        /// <param name="userId"></param>
        /// returns collection of notes (empty if none found)

        public async Task<ICollection<Note>> GetAllUserNotesAsync(string userId)
        {
            return await _context.Notes
                .Include(n => n.Notebook)
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .Where(n => n.Notebook.UserId == userId)
                .ToListAsync();
        }
        /// Updates an existing note if it belongs to the user
        /// <param name="note"></param>
        /// <param name="userId"></param>
        /// returns updated Note object
        public async Task UpdateNoteAsync(Note note, string userId)
        {
            var existingNote = await GetNoteByIdAsync(note.Id, userId);
            if (existingNote != null)
            {
                _context.Entry(existingNote).CurrentValues.SetValues(note);
                existingNote.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
        // Deletes a note if it belongs to the user
        /// <param name="noteId"></param>
        ///<param name="userId"></param>
        public async Task DeleteNoteAsync(int noteId, string userId)
        {
            var note = await GetNoteByIdAsync(noteId, userId);
            if (note != null)
            {
                _context.Notes.Remove(note);
                await _context.SaveChangesAsync();
            }
        }
        //this is used for the auto save feature
        /// <param name="noteId"></param>
        ///  <param name="content"></param> 
        ///  <param name="userId" ></param>  
        public async Task QuickUpdateNoteContentAsync(int noteId, string content, string userId)
        {
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == noteId && n.Notebook.UserId == userId);

            if (note != null)
            {
                note.Content = content;
                note.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        // Notebook Operations

        /// Creates a new notebook associated with the specified user 
        /// Creates a new notebook associated with the specified user    
        /// <param name="notebook"></param>
        /// <param name="userId"></param>
        /// returns created Notebook object
        public async Task<Notebook> CreateNotebookAsync(Notebook notebook, string userId)
        {
            notebook.UserId = userId;
            _context.Notebooks.Add(notebook);
            await _context.SaveChangesAsync();
            return notebook;
        }
        /// Retrieves all notebooks belonging to the user 
        /// Retrieves all notebooks belonging to the user
        /// <param name="userId"></param>
        /// returns collection of notebooks (empty if none found)

        public async Task<ICollection<Notebook>> GetAllUserNotebooksAsync(string userId)
        {
            return await _context.Notebooks
                .Include(n => n.Notes)
                .Where(n => n.UserId == userId)
                .ToListAsync();
        }
        // Retrieves a specific notebook by ID if it belongs to the user 
        /// <param name="notebookId"></param>
        /// <param name="userId"></param>
        /// return Notebook object or null if not found/unauthorized
        public async Task<Notebook?> GetNotebookWithNotesAsync(int notebookId, string userId)
        {
            return await _context.Notebooks
                .Include(n => n.Notes)
                    .ThenInclude(n => n.NoteTags)
                        .ThenInclude(nt => nt.Tag)
                .FirstOrDefaultAsync(n => n.Id == notebookId && n.UserId == userId);
        }
        /// Updates an existing notebook if it belongs to the user  
        /// <param name="notebook"></param>
        /// <param name="userId"></param>
        /// return Notebook object or null if not found/unauthorized

        public async Task UpdateNotebookAsync(Notebook notebook, string userId)
        {
            var existingNotebook = await _context.Notebooks
                .FirstOrDefaultAsync(n => n.Id == notebook.Id && n.UserId == userId);

            if (existingNotebook != null)
            {
                _context.Entry(existingNotebook).CurrentValues.SetValues(notebook);
                await _context.SaveChangesAsync();
            }
        }
        // Deletes a notebook if it belongs to the user
        /// <param name="notebookId"></param>
        /// <param name="userId"></param>
        /// returns nothing
        public async Task DeleteNotebookAsync(int notebookId, string userId)
        {
            var notebook = await _context.Notebooks
                .FirstOrDefaultAsync(n => n.Id == notebookId && n.UserId == userId);

            if (notebook != null)
            {
                _context.Notebooks.Remove(notebook);
                await _context.SaveChangesAsync();
            }
        }

        // Tag Operations
        /// Creates a new tag if it doesn't exist, or retrieves it if it does
        /// <param name="tagName"></param>
        /// returns tag object
        public async Task<Tag> GetOrCreateTagAsync(string tagName)
        {
            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Name == tagName);
            if (tag == null)
            {
                tag = new Tag { Name = tagName };
                _context.Tags.Add(tag);
                await _context.SaveChangesAsync();
            }
            return tag;
        }
        // Retrieves the most popular tags
        /// <param name="count"></param>
        /// returns a collection of Tag objects
        public async Task<ICollection<Tag>> GetPopularTagsAsync(int count)
        {
            return await _context.Tags
                .OrderByDescending(t => t.NoteTags.Count)
                .Take(count)
                .ToListAsync();
        }
        // Associates a tag with a note
        /// <param name="noteId"></param>
        /// <param name="tagId"></param>
        /// returns nothing the tag was associated with the note now
        public async Task AssociateTagToNoteAsync(int noteId, int tagId)
        {
            var noteTag = new NoteTag { NoteId = noteId, TagId = tagId };
            _context.NoteTags.Add(noteTag);
            await _context.SaveChangesAsync();
        }

        // Removes the association between a tag and a note
        /// <param name="noteId"></param>
        /// <param name="tagId"
        /// returns nothing the tag was removed from the note now
        public async Task RemoveTagFromNoteAsync(int noteId, int tagId)
        {
            var noteTag = await _context.NoteTags
                .FirstOrDefaultAsync(nt => nt.NoteId == noteId && nt.TagId == tagId);

            if (noteTag != null)
            {
                _context.NoteTags.Remove(noteTag);
                await _context.SaveChangesAsync();
            }
        }

        // Search Operations
        /// Searches for notes by title or content 
        /// <param name="searchTerm"></param>
        /// <param name="userId"></param>
        /// return collection of Note objects (empty if none found)
        public async Task<ICollection<Note>> SearchNotesAsync(string searchTerm, string userId)
        {
            return await _context.Notes
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .Where(n => n.Notebook.UserId == userId &&
                           (n.Title.Contains(searchTerm) || n.Content.Contains(searchTerm)))
                .ToListAsync();
        }

        // Searches for notes associated with a specific tag
        /// <param name="tagId"></param>
        /// <param name="userId"></param>
        /// return collection of Note objects (empty if none found)
        public async Task<ICollection<Note>> SearchNotesByTagAsync(int tagId, string userId)
        {
            return await _context.Notes
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .Where(n => n.Notebook.UserId == userId &&
                           n.NoteTags.Any(nt => nt.TagId == tagId))
                .ToListAsync();
        }

        // Batch Operations

        // Deletes all notes in a specific notebook
        /// <param name="notebookId"></param>
        /// <param name="userId"></param>
        /// returns nothing
        public async Task<int> DeleteNotesByNotebookAsync(int notebookId, string userId)
        {
            var notes = await _context.Notes
                .Where(n => n.NotebookId == notebookId && n.Notebook.UserId == userId)
                .ToListAsync();

            _context.Notes.RemoveRange(notes);
            return await _context.SaveChangesAsync();
        }
        // Updates the name of an existing tag
        /// <param name="tagId"></param>
        /// <param name="newName"></param>
        /// returns nothing the tag was updated now
        public async Task UpdateTagAsync(int tagId, string newName)
        {
            var tag = await _context.Tags.FindAsync(tagId);
            if (tag == null) throw new KeyNotFoundException();

            if (await _context.Tags.AnyAsync(t => t.Name == newName))
                throw new InvalidOperationException("Tag name already exists");

            tag.Name = newName;
            await _context.SaveChangesAsync();
        }

        // Statistics
        /// Retrieves user statistics including total notes, notebooks, tags, notes per notebook, and tag usage number 
        /// <param name="userId"></param>
        /// return user data about the notes, notebooks and tags count
        public async Task<UserStatistics> GetUserStatisticsAsync(string userId)
        {
            return new UserStatistics
            {
                TotalNotes = await _context.Notes
                    .CountAsync(n => n.Notebook.UserId == userId),

                TotalNotebooks = await _context.Notebooks
                    .CountAsync(n => n.UserId == userId),

                TotalTags = await _context.NoteTags
                    .Where(nt => nt.Note.Notebook.UserId == userId)
                    .Select(nt => nt.TagId)
                    .Distinct()
                    .CountAsync(),

                NotesPerNotebook = await _context.Notebooks
                    .Where(n => n.UserId == userId)
                    .Select(n => new { n.Title, Count = n.Notes.Count })
                    .ToDictionaryAsync(n => n.Title, n => n.Count),

                TagUsageFrequency = await _context.NoteTags
                    .Where(nt => nt.Note.Notebook.UserId == userId)
                    .GroupBy(nt => nt.Tag.Name)
                    .Select(g => new { Name = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(g => g.Name, g => g.Count)
            };
        }
        







    }

}
