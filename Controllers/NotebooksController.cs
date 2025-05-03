
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Build.Framework;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Mvc.ModelBinding;

// This controller lets me create, get, update, and delete notebooks using the API.
// All routes start with /api/Notebooks because of the Route attribute.
namespace termprojectJksmartnote.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotebooksController : ControllerBase
    {
        // I use this to talk to the database for notes and notebooks
        private readonly INoteRepository _noteRepo;
        // I use this to get info about the logged-in user
        private readonly UserManager<User> _userManager;
        // I use this to log info or errors
        private readonly ILogger<NotebooksController> _logger;

        // This is the constructor for my controller.
        // noteRepo: lets me access notes and notebooks in the database
        // userManager: lets me get info about the current user
        // logger: lets me log info and errors
        public NotebooksController(
            INoteRepository noteRepo,
            UserManager<User> userManager,
            ILogger<NotebooksController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // This class is used when I want to create a new notebook.
        // It only has a Title property, which is required.
        public class NotebookCreateDto
        {
            [Required] // Title must be filled in
            public string Title { get; set; }
        }

        // This class is used when I want to update a notebook's title.
        public class NotebookDto
        {
            public string Title { get; set; }
        }

        // This method creates a new notebook for the current user.
        // dto: NotebookCreateDto, has the title for the new notebook
        // Returns: 201 Created with the notebook, or error if something goes wrong
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromForm] NotebookCreateDto dto)
        {
            // If the model is not valid (like missing title), return errors for the fields
            if (!ModelState.IsValid)
            {
                // Only return errors for the Title field
                var relevantErrors = ModelState
                    .Where(m => m.Key == "Title")
                    .ToDictionary(m => m.Key, m => m.Value.Errors);

                if (relevantErrors.Count > 0)
                    return BadRequest(relevantErrors);
            }

            // Get the current user's ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                // If I can't find the user, return 401 Unauthorized
                return Unauthorized();
            }

            // Log that the user is authenticated and show their ID
            _logger.LogInformation("User authenticated: {IsAuthenticated}, UserId: {UserId}",
                User.Identity.IsAuthenticated, _userManager.GetUserId(User));

            try
            {
                // Make a new notebook object with the title and user ID
                var notebook = new Notebook
                {
                    Title = dto.Title,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                // Save the notebook to the database
                var createdNotebook = await _noteRepo.CreateNotebookAsync(notebook);

                // Log that I got a request to create a notebook
                _logger.LogInformation("Received notebook creation request. Title: {Title}", notebook.Title);

                // Return 201 Created and give back the new notebook
                return CreatedAtAction(nameof(GetNotebook), new { id = createdNotebook.Id }, createdNotebook);
            }
            catch (Exception ex)
            {
                // Log the error if something went wrong
                _logger.LogError(ex, "Error creating notebook");
                // Return 500 Internal Server Error
                return StatusCode(500, "An error occurred while creating the notebook");
            }
        }

        // This method gets all notebooks and notes for the current user.
        // id: int, the notebook ID (not really used here, but required by route)
        // Returns: 200 OK with the notebooks, or 401/404 if not found
        [HttpGet("{id}")]
        public async Task<IActionResult> GetNotebook(int id)
        {
            // Get the current user's ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId))
            {
                // If I can't find the user, return 401 Unauthorized
                return Unauthorized();
            }

            // Get all notebooks and notes for this user
            var notebook = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);
            if (notebook == null)
            {
                // If I can't find any notebooks, return 404 Not Found
                return NotFound();
            }

            // Return the notebooks as JSON
            return Ok(notebook);
        }

        // This method deletes a notebook for the current user.
        // id: int, the ID of the notebook to delete
        // Returns: 204 No Content if deleted
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotebook(int id)
        {
            // Get the current user's ID
            var userId = _userManager.GetUserId(User);

            // Delete the notebook from the database
            await _noteRepo.DeleteNotebookAsync(id, userId);

            // Return 204 No Content to show it worked
            return NoContent();
        }

        // This method updates the title of a notebook for the current user.
        // id: int, the notebook's ID
        // notebookDto: NotebookDto, has the new title
        // Returns: 200 OK with a message and the new name, or error if not found
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNotebook(int id, [FromBody] NotebookDto notebookDto)
        {
            // Get the current user's ID
            var userId = _userManager.GetUserId(User);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Find the notebook in the database
            var existingNotebook = await _noteRepo.GetNotebookByIdAsync(id, userId);
            if (existingNotebook == null) return NotFound();

            // Set the new title
            existingNotebook.Title = notebookDto.Title;
            // Save the changes to the database
            await _noteRepo.UpdateNotebookAsync(existingNotebook, userId);

            // Return OK and show the new title
            return Ok(new { message = "Notebook updated successfully", name = existingNotebook.Title });
        }

        // This method gets all notebooks for the sidebar (for the current user).
        // No parameters.
        // Returns: a partial view with the list of notebooks
        [HttpGet("GetNotebooksSidebar")]
        public async Task<IActionResult> GetNotebooksSidebar()
        {
            // Get the current user's ID
            var userId = _userManager.GetUserId(User);
            // Get all notebooks and notes for this user
            var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

            // Try to get the active notebook ID from the session (if it exists)
            byte[] activeNotebookIdBytes;
            int? activeNotebookId = null;
            if (HttpContext.Session.TryGetValue("ActiveNotebookId", out activeNotebookIdBytes))
            {
                // Convert the bytes to an int
                activeNotebookId = BitConverter.ToInt32(activeNotebookIdBytes, 0);
            }

            // Return a partial view with the notebooks as the model
            return new PartialViewResult
            {
                ViewName = "Views/Shared/View", // Name of the partial view to use
                ViewData = new ViewDataDictionary<IEnumerable<Notebook>>(new EmptyModelMetadataProvider(), new ModelStateDictionary())
                {
                    Model = notebooks // Set the model to the list of notebooks
                },
                StatusCode = 200 // HTTP 200 OK
            };
        }
    }
}