using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

// This controller lets me manage tags for my notes using the API.
// I can get all tags, add tags to notes, rename tags, and delete tags.
namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")] // All routes start with /api/Tags
    [ApiController]
    public class TagsController : ControllerBase
    {
        // I use this to talk to the database for notes and tags
        private readonly INoteRepository _noteRepo;
        // I use this to get info about the logged-in user
        private readonly UserManager<User> _userManager;
        // I use this to log info or errors
        private readonly ILogger<TagsController> _logger;

        // This class is for sending or receiving a tag from the client
        public class TagDto
        {
            public int Id { get; set; }      // The tag's ID
            public string Tag { get; set; }  // The tag's name
        }

        // This is my controller's constructor.
        // noteRepo: lets me access notes and tags in the database
        // userManager: lets me get info about the current user
        // logger: lets me log info and errors
        public TagsController(INoteRepository noteRepo, UserManager<User> userManager, ILogger<TagsController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // This gets all tags for the current user.
        // No parameters.
        // Returns: 200 OK with a list of tags
        [HttpGet("gettag")]
        public async Task<IActionResult> GetAllTags()
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            // Get all tags for this user from the repository
            var tags = await _noteRepo.GetAllTagsAsync(userId);
            // Return the tags as JSON
            return Ok(tags);
        }

        // This adds a tag to a note for the current user.
        // noteId: int, the note's ID
        // tagDto: TagDto, has the tag's name
        // Returns: 200 OK if successful, or error if something goes wrong
        [HttpPost("{noteId}")]
        public async Task<IActionResult> Associate(int noteId, [FromBody] TagDto tagDto)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Make sure the tag is not empty
            if (string.IsNullOrEmpty(tagDto?.Tag))
            {
                return BadRequest("Tag is required");
            }

            try
            {
                // Find or create the tag in the database
                var tag = await _noteRepo.GetOrCreateTagAsync(tagDto.Tag, userId);
                // Link the tag to the note in the database
                var success = await _noteRepo.AssociateTagToNoteAsync(noteId, tag.Id, userId);

                // Return OK and a success message
                return Ok(new
                {
                    success = true,
                    message = $"Tag '{tagDto.Tag}' added successfully"
                });
            }
            catch (Exception ex)
            {
                // If something goes wrong, return 500 Internal Server Error
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        // This removes a tag from a note.
        // noteId: int, the note's ID
        // tagId: int, the tag's ID to remove
        // Returns: redirects to the note details page after removing the tag
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Remove(int noteId, int tagId)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            // Remove the tag from the note in the database
            await _noteRepo.RemoveTagFromNoteAsync(noteId, tagId);
            // Redirect to the note details page
            return RedirectToAction("Details", "Notes", new { id = noteId });
        }

        // This renames a tag for the current user.
        // tagId: int, the tag's ID to rename
        // renameDto: RenameTagDto, has the new tag name
        // Returns: 200 OK if successful, or error if something goes wrong
        [HttpPost("Rename/{tagId}")]
        public async Task<IActionResult> RenameTag(int tagId, [FromBody] RenameTagDto renameDto)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                // Update the tag's name in the database
                await _noteRepo.UpdateTagAsync(tagId, renameDto.NewName, userId);
                // Return OK and a success message
                return Ok(new { success = true, message = $"Tag renamed to '{renameDto.NewName}'" });
            }
            catch (Exception ex)
            {
                // If something goes wrong, return 500 Internal Server Error
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // This deletes a tag for the current user.
        // tagId: int, the tag's ID to delete
        // Returns: 200 OK if successful, or error if something goes wrong
        [HttpDelete("{tagId}")]
        public async Task<IActionResult> DeleteTag(int tagId)
        {
            // Get my user ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                // Delete the tag from the database
                await _noteRepo.DeleteTagAsync(tagId, userId);
                // Return OK and a success message
                return Ok(new { success = true, message = "Tag deleted successfully" });
            }
            catch (Exception ex)
            {
                // If something goes wrong, return 500 Internal Server Error
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // This class is for renaming a tag (used in the RenameTag method)
        public class RenameTagDto
        {
            [JsonPropertyName("newName")]
            public string NewName { get; set; } // The new name for the tag
        }

        
    }
}
