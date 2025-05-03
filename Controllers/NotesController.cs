using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

// This controller lets me manage notes using the API.
// I can create, get, update, delete, and search notes for the logged-in user.
namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")] // All routes start with /api/Notes
    [ApiController]
    public class NotesController : ControllerBase
    {
        // I use this to talk to the database for notes and notebooks
        private readonly INoteRepository _noteRepo;
        // I use this to get info about the logged-in user
        private readonly UserManager<User> _userManager;
        // I use this to log info or errors
        private readonly ILogger<NotesController> _logger;

        // This is the constructor for my controller.
        // noteRepo: lets me access notes and notebooks in the database
        // userManager: lets me get info about the current user
        // logger: lets me log info and errors
        public NotesController(
            INoteRepository noteRepo,
            UserManager<User> userManager,
            ILogger<NotesController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // This class is used to send note data to the client without circular reference problems.
        public class NoteDto
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string Content { get; set; }
            public int NotebookId { get; set; }
            public string NotebookTitle { get; set; } // Just the title, not the whole notebook object
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        // This class is used when I want to create a new note.
        public class NoteCreateDto
        {
            public string Title { get; set; }
            public string Content { get; set; }
            public int NotebookId { get; set; }
        }

        // This class is for sending or receiving a tag for a note.
        public class TagDto
        {
            public string Tag { get; set; }
        }

        // This static class helps me convert Note objects to NoteDto objects.
        public static class NoteMapper
        {
            // Converts a Note object to a NoteDto object.
            public static NoteDto ToDto(Note note)
            {
                if (note == null) return null;

                return new NoteDto
                {
                    Id = note.Id,
                    Title = note.Title,
                    Content = note.Content,
                    NotebookId = note.NotebookId,
                    NotebookTitle = note.Notebook?.Title ?? "Unknown Notebook",
                    CreatedAt = note.CreatedAt,
                    UpdatedAt = note.UpdatedAt
                };
            }

            // Converts a list of Note objects to a list of NoteDto objects.
            public static List<NoteDto> ToDtos(IEnumerable<Note> notes)
            {
                return notes?.Select(ToDto).ToList() ?? new List<NoteDto>();
            }
        }

        // This gets a specific note by its ID for the current user.
        // id: int, the ID of the note I want to get
        // Returns: 200 OK with the note, or 401/404/500 if not found or error
        [HttpGet("{id}")]
        public async Task<IActionResult> GetNote(int id)
        {
            try
            {
                // Get my user ID
                var userId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt to note {NoteId}", id);
                    return Unauthorized();
                }

                // Get the note from the database
                var note = await _noteRepo.GetNoteByIdAsync(id, userId);
                if (note == null)
                {
                    _logger.LogWarning("Note {NoteId} not found for user {UserId}", id, userId);
                    return NotFound();
                }

                // Convert the note to a DTO so I don't get circular reference errors
                var noteDto = NoteMapper.ToDto(note);
                return Ok(noteDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving note {NoteId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "An error occurred while retrieving the note", details = ex.Message });
            }
        }

        // This gets all notes for a specific notebook for the current user.
        // notebookId: int, the ID of the notebook I want notes for
        // Returns: 200 OK with a list of notes, or 401/500 if error
        [HttpGet("ByNotebook/{notebookId}")]
        public async Task<IActionResult> GetNotesByNotebook(int notebookId)
        {
            try
            {
                var userId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                // Get all notes for this notebook and user
                var notes = await _noteRepo.GetNotesByNotebookIdAsync(notebookId, userId);

                // Convert to DTOs for the client
                var noteDtos = NoteMapper.ToDtos(notes ?? new List<Note>());
                return Ok(noteDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notes for notebook {NotebookId}: {Message}", notebookId, ex.Message);
                return StatusCode(500, new { message = "An error occurred while retrieving notes" });
            }
        }

        // This creates a new note for the current user.
        // dto: NoteCreateDto, has the title, content, and notebook ID for the new note
        // Returns: 201 Created with the new note, or error if something goes wrong
        [HttpPost]
        public async Task<IActionResult> CreateNote([FromForm] NoteCreateDto dto)
        {
            // If the model is not valid, return errors
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                // Make a new note object
                var note = new Note
                {
                    Title = dto.Title,
                    Content = dto.Content,
                    NotebookId = dto.NotebookId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Save the note to the database
                await _noteRepo.CreateNoteAsync(note, userId);
                _logger.LogInformation("Note created: {NoteId} for notebook {NotebookId}", note.Id, note.NotebookId);

                // Convert to DTO
                var noteDto = NoteMapper.ToDto(note);
                return CreatedAtAction(nameof(GetNote), new { id = note.Id }, noteDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating note: {Message}", ex.Message);
                return StatusCode(500, new { error = "An error occurred while creating the note" });
            }
        }

        // This updates an existing note for the current user.
        // id: int, the note's ID
        // dto: NoteCreateDto, has the new title, content, and notebook ID
        // Returns: 200 OK with the updated note, or error if not found or failed
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNote(int id, [FromForm] NoteCreateDto dto)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                // Find the note in the database
                var note = await _noteRepo.GetNoteByIdAsync(id, userId);
                if (note == null)
                {
                    return NotFound();
                }

                // Update the note's properties
                note.Title = dto.Title;
                note.Content = dto.Content;
                note.NotebookId = dto.NotebookId;
                note.UpdatedAt = DateTime.UtcNow;

                // Save the changes
                await _noteRepo.UpdateNoteAsync(note, userId);
                _logger.LogInformation("Note updated: {NoteId}", id);

                // Return the updated note as a DTO
                var noteDto = NoteMapper.ToDto(note);
                return Ok(noteDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating note {NoteId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "An error occurred while updating the note" });
            }
        }

        // This deletes a note for the current user.
        // id: int, the ID of the note to delete
        // Returns: 204 No Content if deleted, or error if not found or failed
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(int id)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                // Try to delete the note from the database
                var success = await _noteRepo.DeleteNoteAsync(id, userId);

                // If the note wasn't deleted, return 404 Not Found
                if (!success)
                {
                    return NotFound("note did not get deleted");
                }

                _logger.LogInformation("Note deleted: {NoteId}", id);
                // Return 204 No Content to show it worked
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting note {NoteId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "An error occurred while deleting the note" });
            }
        }

        // This searches notes by a text term for the current user.
        // term: string, what I want to search for in note titles/content
        // Returns: 200 OK with the matching notes
        [HttpGet("Search")]
        public async Task<IActionResult> SearchNotes(string term)
        {
            var userId = _userManager.GetUserId(User);
            var notes = await _noteRepo.SearchNotesAsync(term, userId);
            return Ok(notes);
        }

        // This searches notes by tag name for the current user.
        // tagName: string, the tag to search for
        // Returns: 200 OK with the matching notes, or error if tag is empty
        [HttpGet("SearchByTag/{tagName}")]
        public async Task<IActionResult> SearchNotesByTagName(string tagName)
        {
            // If the tag name is empty, return a bad request
            if (string.IsNullOrWhiteSpace(tagName))
            {
                return BadRequest("Tag name cannot be empty");
            }

            var userId = _userManager.GetUserId(User);
            var notes = await _noteRepo.SearchNotesByTagNameAsync(tagName, userId);

            return Ok(notes);
        }
    }
}
