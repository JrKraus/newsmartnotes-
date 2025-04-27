using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotesController : ControllerBase
    {
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<NotesController> _logger;

        public NotesController(
            INoteRepository noteRepo,
            UserManager<User> userManager,
            ILogger<NotesController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // Define NoteDto to avoid circular references
        public class NoteDto
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string Content { get; set; }
            public int NotebookId { get; set; }
            public string NotebookTitle { get; set; } // Include notebook title instead of the whole object
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        // Define a create DTO for notes
        public class NoteCreateDto
        {
            public string Title { get; set; }
            public string Content { get; set; }
            public int NotebookId { get; set; }
        }
        public class TagDto
        {
            public string Tag { get; set; }
        }

        // Note mapper to convert between entities and DTOs
        public static class NoteMapper
        {
            public static NoteDto ToDto(Note note)
            {
                if (note == null) return null;

                return new NoteDto
                {
                    Id = note.Id,
                    Title = note.Title,
                    Content = note.Content,
                    NotebookId = note.NotebookId,
                    NotebookTitle = note.Notebook?.Title ?? "Unknown Notebook", // Only include the title
                    CreatedAt = note.CreatedAt,
                    UpdatedAt = note.UpdatedAt
                };
            }

            public static List<NoteDto> ToDtos(IEnumerable<Note> notes)
            {
                return notes?.Select(ToDto).ToList() ?? new List<NoteDto>();
            }
        }

        // GET api/Notes/{id} - Get a specific note
        [HttpGet("{id}")]
        public async Task<IActionResult> GetNote(int id)
        {
            try
            {
                // Get current user ID
                var userId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized access attempt to note {NoteId}", id);
                    return Unauthorized();
                }

                // Fetch note with proper error handling
                var note = await _noteRepo.GetNoteByIdAsync(id, userId);
                if (note == null)
                {
                    _logger.LogWarning("Note {NoteId} not found for user {UserId}", id, userId);
                    return NotFound();
                }

                // Convert to DTO to avoid circular references
                var noteDto = NoteMapper.ToDto(note);
                return Ok(noteDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving note {NoteId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "An error occurred while retrieving the note", details = ex.Message });
            }
        }

        // GET api/Notes/ByNotebook/{notebookId} - Get notes by notebook ID
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

                // Get notes for this notebook
                var notes = await _noteRepo.GetNotesByNotebookIdAsync(notebookId, userId);

                // Convert to DTOs to avoid circular references
                var noteDtos = NoteMapper.ToDtos(notes ?? new List<Note>());
                return Ok(noteDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notes for notebook {NotebookId}: {Message}", notebookId, ex.Message);
                return StatusCode(500, new { message = "An error occurred while retrieving notes" });
            }
        }

        // POST api/Notes - Create a new note
        [HttpPost]
        public async Task<IActionResult> CreateNote([FromForm] NoteCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                // Create a new note entity
                var note = new Note
                {
                    Title = dto.Title,
                    Content = dto.Content,
                    NotebookId = dto.NotebookId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Save to database
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

        // PUT api/Notes/{id} - Update a note
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNote(int id, [FromForm] NoteCreateDto dto)
        {
            var userId = _userManager.GetUserId(User);
            
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                // Get existing note
                var note = await _noteRepo.GetNoteByIdAsync(id, userId);
                if (note == null)
                {
                    return NotFound();
                }

                // Update properties
                note.Title = dto.Title;
                note.Content = dto.Content;
                note.NotebookId = dto.NotebookId;
                note.UpdatedAt = DateTime.UtcNow;

                // Save changes
                await _noteRepo.UpdateNoteAsync(note, userId);
                _logger.LogInformation("Note updated: {NoteId}", id);

                // Return updated note as DTO
                var noteDto = NoteMapper.ToDto(note);
                
                return Ok(noteDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating note {NoteId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "An error occurred while updating the note" });
            }
        }

        // DELETE api/Notes/{id} - Delete a note
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(int id)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            try
            {
                var success = await _noteRepo.DeleteNoteAsync(id, userId);

                if (!success)
                {
                    return NotFound("note did not get deleted");
                }

                _logger.LogInformation("Note deleted: {NoteId}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting note {NoteId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "An error occurred while deleting the note" });
            }
        }
        [HttpGet("Search")]
        public async Task<IActionResult> SearchNotes(string term)
        {
            var userId = _userManager.GetUserId(User);
            var notes = await _noteRepo.SearchNotesAsync(term, userId);
            return Ok(notes);
        }
        [HttpGet("SearchByTag/{tagName}")]
        public async Task<IActionResult> SearchNotesByTagName(string tagName)
        {
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
