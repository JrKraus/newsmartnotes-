using System.Security.Claims;
using Humanizer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

using Microsoft.Build.Framework;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;
using Microsoft.AspNetCore.Http;
using AspNetCoreGeneratedDocument;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace termprojectJksmartnote.Controllers
{


   
    [Route("api/[controller]")]
    [ApiController]
    public class NotebooksController : ControllerBase
    {
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<NotebooksController> _logger;

        public NotebooksController(
            INoteRepository noteRepo,
            UserManager<User> userManager,
            ILogger<NotebooksController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }
        public class NotebookCreateDto
        {
            [Required]
            public string Title { get; set; }
        }
        public class NotebookDto
        {
            public string Title { get; set; }
        
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromForm] NotebookCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                // Return only validation errors for the fields that were actually submitted
                var relevantErrors = ModelState
                    .Where(m => m.Key == "Title")
                    .ToDictionary(m => m.Key, m => m.Value.Errors);

                if (relevantErrors.Count > 0)
                    return BadRequest(relevantErrors);
            }

            // Get the current user's ID from the authenticated user
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }
            _logger.LogInformation("User authenticated: {IsAuthenticated}, UserId: {UserId}",
            User.Identity.IsAuthenticated, _userManager.GetUserId(User));
            try
            {

                var notebook = new Notebook
                {
                    Title = dto.Title,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                // Save to database
                var createdNotebook = await _noteRepo.CreateNotebookAsync(notebook);
                _logger.LogInformation("Received notebook creation request. Title: {Title}", notebook.Title);
                return CreatedAtAction(nameof(GetNotebook), new { id = createdNotebook.Id }, createdNotebook);
            }
            catch (Exception ex)
            {
                // Log the error
                _logger.LogError(ex, "Error creating notebook");
                return StatusCode(500, "An error occurred while creating the notebook");
            }
        }




        [HttpGet("{id}")]
        public async Task<IActionResult> GetNotebook(int id)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var notebook = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);
            if (notebook == null)
            {
                return NotFound();
            }

            return Ok(notebook);
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotebook(int id)
        {
            var userId = _userManager.GetUserId(User);

            await _noteRepo.DeleteNotebookAsync(id, userId);

            

            return NoContent();
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNotebook(int id, [FromBody] NotebookDto notebookDto)
        {
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var existingNotebook = await _noteRepo.GetNotebookByIdAsync(id, userId);
            if (existingNotebook == null) return NotFound();

            existingNotebook.Title = notebookDto.Title;
            await _noteRepo.UpdateNotebookAsync(existingNotebook, userId);

            return Ok(new { message = "Notebook updated successfully", name = existingNotebook.Title });
        }
       

        [HttpGet("GetNotebooksSidebar")]
        public async Task<IActionResult> GetNotebooksSidebar()
        {
            var userId = _userManager.GetUserId(User);
            var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

            byte[] activeNotebookIdBytes;
            int? activeNotebookId = null;
            if (HttpContext.Session.TryGetValue("ActiveNotebookId", out activeNotebookIdBytes))
            {
                activeNotebookId = BitConverter.ToInt32(activeNotebookIdBytes, 0);
            }

            // Return a JSON result instead of a partial view
            return new PartialViewResult
            {
                ViewName = "Views/Shared/View",
                ViewData = new ViewDataDictionary<IEnumerable<Notebook>>(new EmptyModelMetadataProvider(), new ModelStateDictionary())
                {
                    Model = notebooks
                },
              
                StatusCode = 200
            };
        }


    }


}
