using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TagsController : ControllerBase
    {
        
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<TagsController> _logger;

        public class TagDto
        {
            public int Id { get; set; }
            public string Tag { get; set; }
            

            
           
            
        }

        public TagsController(INoteRepository noteRepo, UserManager<User> userManager, ILogger<TagsController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }
       
        
        
        [HttpGet("gettag")]
        public async Task<IActionResult> GetAllTags()
        {
            var userId = _userManager.GetUserId(User);
            var tags = await _noteRepo.GetAllTagsAsync(userId);
            
            return Ok(tags);
        }
        [HttpPost("{noteId}")]
        public async Task<IActionResult> Associate(int noteId, [FromBody] TagDto tagDto)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (string.IsNullOrEmpty(tagDto?.Tag))
            {
                return BadRequest("Tag is required");
            }

            try
            {
                //var userId = _userManager.GetUserId(User);
                var tag = await _noteRepo.GetOrCreateTagAsync(tagDto.Tag, userId);
                var success = await _noteRepo.AssociateTagToNoteAsync(noteId, tag.Id, userId);

                return Ok(new
                {
                    success = true,
                    message = $"Tag '{tagDto.Tag}' added successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Remove(int noteId, int tagId)
        {
            var userId = _userManager.GetUserId(User);
            await _noteRepo.RemoveTagFromNoteAsync(noteId, tagId);
            return RedirectToAction("Details", "Notes", new { id = noteId });
        }
        [HttpPost("Rename/{tagId}")]
        public async Task<IActionResult> RenameTag(int tagId, [FromBody] RenameTagDto renameDto)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                await _noteRepo.UpdateTagAsync(tagId, renameDto.NewName, userId);
                return Ok(new { success = true, message = $"Tag renamed to '{renameDto.NewName}'" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpDelete("{tagId}")]
        public async Task<IActionResult> DeleteTag(int tagId)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                await _noteRepo.DeleteTagAsync(tagId, userId);
                return Ok(new { success = true, message = "Tag deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        public class RenameTagDto
        {
            [JsonPropertyName("newName")]
            public string NewName { get; set; }
        }


        //create a function that popluate tags on notes creation 
        //create the statics for tags 
        //rework the menu 
        //create a search funtion for tags and notes 

    }
}
