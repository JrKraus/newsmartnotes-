using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

// This controller lets me manage tags for notes using the API.
// I can get tags for a note and remove a tag from a note.
namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")] // All routes start with /api/Notetag
    [ApiController]
    public class NotetagController : ControllerBase
    {
        // I use this to talk to the database for notes and tags
        private readonly INoteRepository _noteRepo;
        // I use this to get info about the logged-in user
        private readonly UserManager<User> _userManager;
        // I use this to log info or errors
        private readonly ILogger<TagsController> _logger;

        // This is the constructor for my controller.
        // noteRepo: lets me access notes and tags in the database
        // userManager: lets me get info about the current user
        // logger: lets me log info and errors
        public NotetagController(
            INoteRepository noteRepo,
            UserManager<User> userManager,
            ILogger<TagsController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // This class is used for sending tag info for a note.
        public class noteTagDTo
        {
            public int Id { get; set; }           // The tag's ID
            public string TagId { get; set; }     // The tag's name (string, not int)
            public int NoteId { get; set; }       // The note's ID
        }

        // This class is used for sending tag info (just the tag itself)
        public class TagDto
        {
            public int Id { get; set; }           // The tag's ID
            public string Name { get; set; }      // The tag's name
        }

        // This method gets all tags for a specific note.
        // noteId: int, the ID of the note I want tags for
        // Returns: 200 OK with a list of tags for the note
        [HttpGet("{noteId}")]
        public async Task<ActionResult<IEnumerable<noteTagDTo>>> GetTagsByNoteId(int noteId)
        {
            // Get my user ID (not used for validation here, but could be)
            var userId = _userManager.GetUserId(User);

            // Get tags for the note from the repository
            var tags = await _noteRepo.GetTagsByNoteIdAsync(noteId);

            // Map the tag objects to my DTO class
            var tagDtos = tags.Select(t => new noteTagDTo
            {
                Id = t.Id,
                TagId = t.Name,   // Store the tag's name in TagId (string)
                NoteId = noteId   // Set the noteId for each tag
            });

            // Return the tags as JSON
            return Ok(tagDtos);
        }

        // This method removes a tag from a note for the current user.
        // noteId: int, the note's ID
        // tagId: int, the tag's ID to remove
        // Returns: 200 OK if removed, 401/404/500 if error
        [HttpDelete("Notes/{noteId}/Tags/{tagId}")]
        public async Task<IActionResult> RemoveTagFromNote(int noteId, int tagId)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                // Check if this note belongs to me
                var note = await _noteRepo.GetNoteByIdAsync(noteId, userId);
                if (note == null)
                {
                    // If I don't own the note, return 404 Not Found
                    return NotFound("Note not found or you don't have permission to access it");
                }

                // Remove the tag from the note in the database
                await _noteRepo.RemoveTagFromNoteAsync(noteId, tagId);

                // Return 200 OK and a success message
                return Ok(new
                {
                    success = true,
                    message = "Tag removed from note successfully"
                });
            }
            catch (Exception ex)
            {
                // Log the error if something went wrong
                _logger.LogError(ex, "Error removing tag {TagId} from note {NoteId}", tagId, noteId);
                // Return 500 Internal Server Error and the error message
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }
    }
}

