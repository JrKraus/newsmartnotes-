using System.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;

        public HomeController(INoteRepository noteRepo, UserManager<User> userManager, ILogger<HomeController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        public async Task<IActionResult> Index()
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var userId = _userManager.GetUserId(User);
                var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

                ViewBag.Notebooks = notebooks; // Pass notebooks to the view

                if (TempData["SuccessMessage"] != null)
                {
                    ViewBag.SuccessMessage = TempData["SuccessMessage"];
                }

                return View(notebooks); // Pass notebooks as the model
            }

            return View(Enumerable.Empty<Notebook>()); // Return an empty list if not authenticated
        }
        public IActionResult createnotebook()
        {
            return View();
        }
        public IActionResult Privacy()
        {
            return View();
        }
        [HttpGet("GetNotebooksSidebar")]
        public async Task<IActionResult> GetNotebooksSidebar()
        {
            var userId = _userManager.GetUserId(User);

            var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);
            HttpContext.Session.TryGetValue("ActiveNotebookId", out var activeNotebookId);
            ViewBag.Notebooks = notebooks;
            return View(notebooks);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        
    }
}
