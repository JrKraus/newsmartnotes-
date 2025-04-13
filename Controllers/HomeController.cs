using System.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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
                ViewBag.Notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

                // Pass success message to view if exists
                if (TempData["SuccessMessage"] != null)
                {
                    ViewBag.SuccessMessage = TempData["SuccessMessage"];
                }
            }
            return View();
        }
        public IActionResult createnotebook()
        {
            return View();
        }
        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        //will fix this later when i create a veiw for this 

        //[HttpGet]
        //public async Task<IActionResult> Index()
        //{
        //    var userId = _userManager.GetUserId(User);
        //    return View(await _noteRepo.GetAllUserNotebooksAsync(userId));
        //}

        //[HttpPost]
        //[ValidateAntiForgeryToken]
        //public async Task<IActionResult> Create(Notebook notebook)
        //{
        //    if (!ModelState.IsValid) return View(notebook);

        //    var userId = _userManager.GetUserId(User);
        //    await _noteRepo.CreateNotebookAsync(notebook, userId);
        //    return RedirectToAction("Index");
        //}
        //[HttpPost]
        //[ValidateAntiForgeryToken]
        //public async Task<IActionResult> CreateNotebook(Notebook notebook)
        //{
        //    if (!ModelState.IsValid)
        //    {
        //        // If validation fails, redirect back to home with error message
        //        TempData["ErrorMessage"] = "Please provide a valid notebook title.";
        //        return RedirectToAction("Index");
        //    }

        //    // Get current user ID
        //    var userId = _userManager.GetUserId(User);
        //    if (string.IsNullOrEmpty(userId))
        //    {
        //        return Challenge(); // Redirect to login if not authenticated
        //    }

        //    // Set creation metadata
        //    notebook.UserId = userId;
        //    notebook.CreatedAt = DateTime.UtcNow;

        //    // Save to database using repository
        //    await _noteRepo.CreateNotebookAsync(notebook, userId);

        //    // Add success message
        //    TempData["SuccessMessage"] = $"Notebook '{notebook.Title}' was successfully created.";

        //    // Redirect back to home page
        //    return RedirectToAction("Index");
        //}
    }
}
