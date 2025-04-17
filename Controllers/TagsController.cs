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
       
        
        
        [HttpGet("Tags")]
        public async Task<IActionResult> GetAllTags()
        {
            var userId = _userManager.GetUserId(User);
            var tags = await _noteRepo.GetAllTagsAsync(userId);
            if(tags ==null )
            {
                return BadRequest( "tags are not there ");
            }
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
                var tag = await _noteRepo.GetOrCreateTagAsync(tagDto.Tag);
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
    }
}
