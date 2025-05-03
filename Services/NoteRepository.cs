using Azure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Services
{
    // This class does all my database work for notes, notebooks, and tags.
    // I also use it to create user statistics.
    public class NoteRepository : INoteRepository
    {
        // I use this to talk to my database
        private readonly ApplicationDbContext _context;
        // I use this to manage user accounts
        private readonly UserManager<User> _userManager;

        // This is my constructor for NoteRepository.
        // context: lets me access the database
        // userManager: lets me manage users
        public NoteRepository(ApplicationDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // Note Operations

        // I create a new note for a user.
        // note: the Note object to create
        // userId: the user's ID
        // Returns: the created Note object
        public async Task<Note> CreateNoteAsync(Note note, string userId)
        {
            // Make sure the notebook belongs to the user
            var notebookExists = await _context.Notebooks
                .AnyAsync(n => n.Id == note.NotebookId && n.UserId == userId);

            if (!notebookExists)
            {
                throw new InvalidOperationException("Notebook not found or access denied");
            }

            // Set time for when the note is created and updated
            note.CreatedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            // Add the note to the database and save it
            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            return note;
        }

        // I get a note by its ID for a user.
        // id: the note's ID
        // userId: the user's ID
        // Returns: the Note object, or null if not found or not owned by the user
        public async Task<Note?> GetNoteByIdAsync(int id, string userId)
        {
            try
            {
                // Make sure the ID and user ID are valid
                if (id <= 0)
                {
                    throw new ArgumentException("Invalid note ID", nameof(id));
                }
                if (string.IsNullOrEmpty(userId))
                {
                    throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
                }

                // Get the note and its notebook, check ownership
                var note = await _context.Notes
                    .Include(n => n.Notebook)
                    .FirstOrDefaultAsync(n => n.Id == id &&
                                              n.Notebook != null &&
                                              n.Notebook.UserId == userId);

                return note;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Database error retrieving note {id} for user {userId}: {ex.Message}");
                throw;
            }
        }

        // I get all notes for a user.
        // userId: the user's ID
        // Returns: a collection of notes for that user
        public async Task<ICollection<Note>> GetAllUserNotesAsync(string userId)
        {
            return await _context.Notes
                .Include(n => n.Notebook)
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .Where(n => n.Notebook.UserId == userId)
                .ToListAsync();
        }

        // I update a note for a user.
        // note: the Note object with updated data
        // userId: the user's ID
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

        // I delete a note for a user.
        // noteId: the note's ID
        // userId: the user's ID
        // Returns: true if deleted, false otherwise
        public async Task<bool> DeleteNoteAsync(int noteId, string userId)
        {
            var note = await GetNoteByIdAsync(noteId, userId);
            if (note != null)
            {
                _context.Notes.Remove(note);
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }

        // I quickly update just the content of a note (for auto-save).
        // noteId: the note's ID
        // content: the new content to save
        // userId: the user's ID
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

        // I create a new notebook for a user.
        // notebook: the Notebook object to create
        // Returns: the created Notebook object
        public async Task<Notebook> CreateNotebookAsync(Notebook notebook)
        {
            _context.Notebooks.Add(notebook);
            await _context.SaveChangesAsync();
            return notebook;
        }

        // I get all notebooks for a user (with notes).
        // userId: the user's ID
        // Returns: a collection of notebooks for that user
        public async Task<ICollection<Notebook>> GetAllUserNotebooksAsync(string userId)
        {
            return await _context.Notebooks
                .Include(n => n.Notes)
                .Where(n => n.UserId == userId)
                .ToListAsync();
        }

        // I get a notebook (with notes) by its ID for a user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        // Returns: the Notebook object, or null if not found or not owned by the user
        public async Task<Notebook?> GetNotebookWithNotesAsync(int notebookId, string userId)
        {
            return await _context.Notebooks
                .Include(n => n.Notes)
                    .ThenInclude(n => n.NoteTags)
                        .ThenInclude(nt => nt.Tag)
                .FirstOrDefaultAsync(n => n.Id == notebookId && n.UserId == userId);
        }

        // I get all notes for a specific notebook and user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        // Returns: a list of notes for that notebook and user
        public async Task<IEnumerable<Note>> GetNotesByNotebookIdAsync(int notebookId, string userId)
        {
            try
            {
                var notes = await _context.Notes
                    .Where(n => n.NotebookId == notebookId && n.Notebook.UserId == userId)
                    .OrderByDescending(n => n.UpdatedAt)
                    .ToListAsync();

                return notes ?? new List<Note>();
            }
            catch (Exception ex)
            {
                // If there is an error, print it and return an empty list
                Console.Error.WriteLine($"Database error: {ex.Message}");
                return new List<Note>();
            }
        }

        // I update a notebook for a user.
        // notebook: the Notebook object with updated data
        // userId: the user's ID
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

        // I delete a notebook for a user.
        // notebookId: the notebook's ID
        // userId: the user's ID
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

        // I get a notebook by its ID for a user.
        // id: the notebook's ID
        // userId: the user's ID
        // Returns: the Notebook object
        public async Task<Notebook> GetNotebookByIdAsync(int id, string userId)
        {
            return await _context.Notebooks
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        }

        // Tag Operations

        // I get or create a tag for a user.
        // tagName: the tag's name
        // userId: the user's ID
        // Returns: the Tag object
        public async Task<Tag> GetOrCreateTagAsync(string tagName, string userId)
        {
            var tag = await _context.Tags
                .FirstOrDefaultAsync(t => t.Name == tagName && t.UserId == userId);

            if (tag == null)
            {
                tag = new Tag
                {
                    Name = tagName,
                    UserId = userId
                };
                _context.Tags.Add(tag);
                await _context.SaveChangesAsync();
            }
            return tag;
        }

        // I get all tags for a user.
        // userId: the user's ID
        // Returns: a collection of Tag objects
        public async Task<ICollection<Tag>> GetAllTagsAsync(string userId)
        {
            var tags = await _context.Tags
                .Where(t => t.UserId == userId)
                .Include(t => t.NoteTags)
                .ThenInclude(nt => nt.Note)
                .ThenInclude(n => n.Notebook)
                .Distinct()
                .ToListAsync();

            return tags ?? new List<Tag>();
        }

        // I get the most popular tags.
        // count: how many tags to return
        // Returns: a collection of Tag objects
        public async Task<ICollection<Tag>> GetPopularTagsAsync(int count)
        {
            return await _context.Tags
                .OrderByDescending(t => t.NoteTags.Count)
                .Take(count)
                .ToListAsync();
        }

        // I associate a tag with a note for a user.
        // noteId: the note's ID
        // tagId: the tag's ID
        // userId: the user's ID
        // Returns: true if successful, false otherwise
        public async Task<bool> AssociateTagToNoteAsync(int noteId, int tagId, string userId)
        {
            var note = await _context.Notes
                .Include(n => n.NoteTags)
                .Include(n => n.Notebook)
                .FirstOrDefaultAsync(n => n.Id == noteId && n.Notebook.UserId == userId);

            if (note == null) return false;

            var tag = await _context.Tags.FindAsync(tagId);
            if (tag == null) return false;

            if (!note.NoteTags.Any(nt => nt.TagId == tagId))
            {
                note.NoteTags.Add(new NoteTag { NoteId = noteId, TagId = tagId });
                await _context.SaveChangesAsync();
            }

            return true;
        }

        // I remove a tag from a note.
        // noteId: the note's ID
        // tagId: the tag's ID
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

        // I get all tags for a specific note.
        // noteId: the note's ID
        // Returns: a collection of Tag objects
        public async Task<ICollection<Tag>> GetTagsByNoteIdAsync(int noteId)
        {
            return await _context.NoteTags
                .Where(nt => nt.NoteId == noteId)
                .Select(nt => nt.Tag)
                .Distinct()
                .ToListAsync();
        }

        // Search Operations

        // I search for notes by a text term for a user.
        // searchTerm: the text to search for
        // userId: the user's ID
        // Returns: a collection of Note objects
        public async Task<ICollection<Note>> SearchNotesAsync(string searchTerm, string userId)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return new List<Note>();

            return await _context.Notes
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .Where(n => n.Notebook.UserId == userId &&
                           (n.Title.Contains(searchTerm) ||
                            n.Content.Contains(searchTerm)))
                .OrderByDescending(n => n.UpdatedAt)
                .ToListAsync();
        }

        // I search for notes by tag name for a user.
        // tagName: the tag's name
        // userId: the user's ID
        // Returns: a collection of Note objects
        public async Task<ICollection<Note>> SearchNotesByTagNameAsync(string tagName, string userId)
        {
            tagName = tagName.Trim().ToLower();

            return await _context.Notes
                .Include(n => n.NoteTags)
                    .ThenInclude(nt => nt.Tag)
                .Include(n => n.Notebook)
                .Where(n => n.Notebook.UserId == userId &&
                           n.NoteTags.Any(nt => nt.Tag.Name.ToLower() == tagName))
                .OrderByDescending(n => n.UpdatedAt)
                .ToListAsync();
        }

        // Batch Operations

        // I delete all notes in a specific notebook for a user.
        // notebookId: the notebook's ID
        // userId: the user's ID
        // Returns: the number of notes deleted
        public async Task<int> DeleteNotesByNotebookAsync(int notebookId, string userId)
        {
            var notes = await _context.Notes
                .Where(n => n.NotebookId == notebookId && n.Notebook.UserId == userId)
                .ToListAsync();

            _context.Notes.RemoveRange(notes);
            return await _context.SaveChangesAsync();
        }

        // I update the name of a tag for a user.
        // tagId: the tag's ID
        // newName: the new name for the tag
        // userId: the user's ID
        // Returns: true if successful, false otherwise
        public async Task<bool> UpdateTagAsync(int tagId, string newName, string userId)
        {
            try
            {
                // Find tag that belongs to the user by checking tag associations with user's notes
                var tag = await _context.Tags
                    .Where(t => t.Id == tagId)
                    .Where(t => t.NoteTags.Any(nt => nt.Note.Notebook.UserId == userId))
                    .FirstOrDefaultAsync();

                if (tag == null) return false;

                // Check if the new name already exists for this user's tags
                if (await _context.Tags
                    .Where(t => t.Name == newName)
                    .Where(t => t.NoteTags.Any(nt => nt.Note.Notebook.UserId == userId))
                    .AnyAsync())
                {
                    return false;
                }

                tag.Name = newName;
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        // I get all notebooks for a user (with notes).
        // userId: the user's ID
        // Returns: a collection of notebooks for that user
        public async Task<ICollection<Notebook>> GetAllUserNotebooksWithNotesAsync(string userId)
        {
            return await _context.Notebooks
                .Where(n => n.UserId == userId)
                .Include(n => n.Notes)
                .OrderBy(n => n.Title)
                .ToListAsync();
        }

        // I delete a tag for a user.
        // tagId: the tag's ID
        // userId: the user's ID
        // Returns: true if deleted, false otherwise
        public async Task<bool> DeleteTagAsync(int tagId, string userId)
        {
            try
            {
                // Find the tag that belongs to this user
                var tag = await _context.Tags
                    .Include(t => t.NoteTags)
                    .FirstOrDefaultAsync(t => t.Id == tagId && t.UserId == userId);

                if (tag == null)
                    return false;

                // Remove all note-tag associations
                foreach (var noteTag in tag.NoteTags.ToList())
                {
                    _context.NoteTags.Remove(noteTag);
                }

                // Delete the tag itself
                _context.Tags.Remove(tag);

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                // Could log the error here if needed
                return false;
            }
        }

        // Statistics

        // I get statistics for a user (note, notebook, and tag counts).
        // userId: the user's ID
        // Returns: a UserStatistics object
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

