using System.Net.NetworkInformation;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

// This controller lets me get statistics about my notes, notebooks, and tags through the API.
// All routes start with /api/Stats because of the Route attribute.
namespace termprojectJksmartnote.Controllers
{
    [Authorize] // Only let logged-in users use this controller
    [ApiController] // Makes this class an API controller
    [Route("api/[controller]")] // Route is /api/Stats
    public class StatsController : ControllerBase
    {
        // I use this to talk to the database for notes and notebooks
        private readonly INoteRepository _noteRepo;
        // I use this to get info about the logged-in user
        private readonly UserManager<User> _userManager;
        // I use this to log info or errors
        private readonly ILogger<TagsController> _logger;

        // This is my controller's constructor.
        // noteRepo: lets me access notes and notebooks in the database
        // userManager: lets me get info about the current user
        // logger: lets me log info and errors
        public StatsController(INoteRepository noteRepo, UserManager<User> userManager, ILogger<TagsController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // This method gets statistics for the user who is logged in.
        // No parameters (uses the current user).
        // Returns: 200 OK with the user's statistics, or error if something goes wrong
        [HttpGet("Data")]
        public async Task<ActionResult<UserStatistics>> GetUserStatistics()
        {
            try
            {
                // Get my user ID
                var userId = _userManager.GetUserId(User);

                // If I am not logged in, return 401 Unauthorized
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }

                // Get my statistics from the repository (notes, notebooks, tags, etc)
                var statistics = await _noteRepo.GetUserStatisticsAsync(userId);

                // Return the statistics as JSON with 200 OK
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                // If something goes wrong, log the error and return 500 Internal Server Error
                _logger.LogError(ex, "Error retrieving user statistics");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving user statistics",
                    error = ex.Message
                });
            }
        }
    }
}
