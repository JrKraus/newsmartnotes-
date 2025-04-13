using System.Security.Claims;
using Humanizer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Build.Framework;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

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
    }


}
