using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

// I use this controller to handle the main pages for my smart note app.
// This includes the home page, privacy page, statistics, and more.
// Only logged-in users can use this controller.
namespace termprojectJksmartnote.Controllers
{
    [Authorize] // Only allow logged-in users to access this controller
    public class HomeController : Controller
    {
        // I use this logger to write info or errors to the log
        private readonly ILogger<HomeController> _logger;
        // I use this to get notes and notebooks from the database
        private readonly INoteRepository _noteRepo;
        // I use this to get information about the logged-in user
        private readonly UserManager<User> _userManager;

        // This is the constructor for my controller.
        // I get the note repository, user manager, and logger from dependency injection.
        // noteRepo: lets me access notes and notebooks in the database
        // userManager: lets me get info about the current user
        // logger: lets me log info and errors
        public HomeController(INoteRepository noteRepo, UserManager<User> userManager, ILogger<HomeController> logger)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
            _logger = logger;
        }

        // This method shows the home page with my notebooks and notes.
        // It doesn't take any parameters (it uses the logged-in user).
        // It returns the main view with my notebooks as the model.
        public async Task<IActionResult> Index()
        {
            // I check if I'm logged in
            if (User.Identity?.IsAuthenticated == true)
            {
                // I get my user ID
                var userId = _userManager.GetUserId(User);
                // I get all my notebooks and their notes from the database
                var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

                // I pass my notebooks to the view using ViewBag
                ViewBag.Notebooks = notebooks;

                // If I have a success message stored in TempData, I pass it to the view
                if (TempData["SuccessMessage"] != null)
                {
                    ViewBag.SuccessMessage = TempData["SuccessMessage"];
                }

                // I show the view and give it my notebooks as the model
                return View(notebooks);
            }

            // If I'm not logged in, I show the view with an empty notebooks list
            return View(Enumerable.Empty<Notebook>());
        }

        // This method shows the "create notebook" page.
        // It doesn't take any parameters.
        // It returns the view for creating a notebook.
        public IActionResult createnotebook()
        {
            return View();
        }

        // This method shows the privacy policy page.
        // It doesn't take any parameters.
        // It returns the privacy view.
        public IActionResult Privacy()
        {
            return View();
        }

        // This method shows the statistics as a partial view.
        // It doesn't take any parameters.
        // It returns the partial view for statistics.
        public IActionResult Statistics()
        {
            // I can add data to pass to the partial view here if I need to.
            return PartialView("statistics");
        }

        // This method gets the sidebar with all my notebooks.
        // It doesn't take any parameters.
        // It returns the sidebar view with my notebooks.
        [HttpGet("GetNotebooksSidebar")]
        public async Task<IActionResult> GetNotebooksSidebar()
        {
            // I get my user ID
            var userId = _userManager.GetUserId(User);

            // I get all my notebooks and their notes
            var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

            // I try to get the active notebook ID from the session (not always used)
            HttpContext.Session.TryGetValue("ActiveNotebookId", out var activeNotebookId);

            // I pass my notebooks to the view using ViewBag
            ViewBag.Notebooks = notebooks;

            // I show the view with my notebooks as the model
            return View(notebooks);
        }

        // This method shows an error page if something goes wrong.
        // It doesn't take any parameters.
        // It returns the error view with the request ID.
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            // I make a new error view model with the request ID
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        // This method shows the search bar as a partial view.
        // It doesn't take any parameters.
        // It returns the partial view for the search bar.
        public IActionResult Searchbar()
        {
            // I can add data to pass to the partial view here if I need to.
            return PartialView("_SearchPartial");
        }
    }
}
