using System.Net.NetworkInformation;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class StatsController : ControllerBase
    {
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<TagsController> _logger;
       
        public StatsController( INoteRepository noteRepo, UserManager<User> userManager, ILogger<TagsController> logger)
        {
            
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }


        /// <summary>
        /// Gets statistics for the current authenticated user
        /// </summary>
        /// <returns>User statistics including notes, notebooks, and tag counts</returns>
        [HttpGet("Data")]
        public async Task<ActionResult<UserStatistics>> GetUserStatistics()
        {
            try
            {
                var userId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }

                var statistics = await _noteRepo.GetUserStatisticsAsync(userId);
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user statistics");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving user statistics",
                    error = ex.Message
                });
            }
        }

        ///// <summary>
        ///// Gets statistics for a specific notebook
        ///// </summary>
        ///// <param name="notebookId">ID of the notebook</param>
        ///// <returns>Statistics for the specified notebook</returns>
        //[HttpGet("notebooks/{notebookId}")]
        //public async Task<IActionResult> GetNotebookStatistics(int notebookId)
        //{
        //    try
        //    {
        //        var userId = _userManager.GetUserId(User);
        //        if (string.IsNullOrEmpty(userId))
        //        {
        //            return Unauthorized("User not authenticated");
        //        }

                
                
                

        //        var statistics = await _noteRepo.(notebookId);
        //        return Ok(statistics);
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Error retrieving notebook statistics for notebook {NotebookId}", notebookId);
        //        return StatusCode(500, new
        //        {
        //            success = false,
        //            message = "An error occurred while retrieving notebook statistics",
        //            error = ex.Message
        //        });
        //    }
        //}

        ///// <summary>
        ///// Gets tag usage statistics for the current user
        ///// </summary>
        ///// <returns>Tag usage statistics including frequency and distribution</returns>
        //[HttpGet("tags")]
        //public async Task<IActionResult> GetTagStatistics()
        //{
        //    try
        //    {
        //        var userId = _userManager.GetUserId(User);
        //        if (string.IsNullOrEmpty(userId))
        //        {
        //            return Unauthorized("User not authenticated");
        //        }

        //        var statistics = await UserStatistics.(userId);
        //        return Ok(statistics);
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Error retrieving tag statistics");
        //        return StatusCode(500, new
        //        {
        //            success = false,
        //            message = "An error occurred while retrieving tag statistics",
        //            error = ex.Message
        //        });
        //    }
        //}
    }

}
