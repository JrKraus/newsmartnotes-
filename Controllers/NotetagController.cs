using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotetagController : ControllerBase
    {
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<TagsController> _logger;

        public NotetagController(INoteRepository noteRepo, UserManager<User> userManager, ILogger<TagsController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        public class noteTagDTo
        {
            public int Id { get; set; }
            public string TagId { get; set; }
            public int NoteId { get; set; }
        }

        public class TagDto
        {
            public int Id { get; set; }
            public string Name { get; set; } 
        }

        [HttpGet("{noteId}")]
        public async Task<ActionResult<IEnumerable<noteTagDTo>>> GetTagsByNoteId(int noteId)
        {
            // Get current user ID  
            var userId = _userManager.GetUserId(User);

            // Directly call repository method without validation  
            var tags = await _noteRepo.GetTagsByNoteIdAsync(noteId);

            // Map to DTOs - correctly map Tag objects to noteTagDTo objects
            var tagDtos = tags.Select(t => new noteTagDTo
            {
                Id = t.Id,
                TagId = t.Name,
                NoteId = noteId // Include the noteId since it's part of your DTO
            });

            return Ok(tagDtos);
        }
        [HttpDelete("Notes/{noteId}/Tags/{tagId}")]
        public async Task<IActionResult> RemoveTagFromNote(int noteId, int tagId)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                // First check if the note belongs to the current user
                var note = await _noteRepo.GetNoteByIdAsync(noteId, userId);
                if (note == null)
                {
                    return NotFound("Note not found or you don't have permission to access it");
                }

                // Remove the tag association
                await _noteRepo.RemoveTagFromNoteAsync(noteId, tagId);

                return Ok(new
                {
                    success = true,
                    message = "Tag removed from note successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing tag {TagId} from note {NoteId}", tagId, noteId);
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

    }
}

