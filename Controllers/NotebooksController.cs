using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    /// <summary>
    /// Controller for managing notebooks: listing, creation, and organization 
    /// </summary>
    public class NotebooksController : Controller
    {
        private readonly INoteRepository _noteRepo; // Repository for managing notes and notebooks
        private readonly UserManager<User> _userManager; // UserManager for managing user accounts

        ///  Initializes a new instance of the NotebooksController 
        /// <param name="noteRepo"></param>
        /// <param name="userManager"></param>
        public NotebooksController(INoteRepository noteRepo, UserManager<User> userManager)
        {
            _noteRepo = noteRepo;  // Repository for managing notes and notebooks
            _userManager = userManager; // UserManager for managing user accounts
        }

        /// Displays all notebooks belonging to the current user <summary>
        ///returns a view with all notebooks
        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var userId = _userManager.GetUserId(User);
            return View(await _noteRepo.GetAllUserNotebooksAsync(userId));
        }
        // Creates a new notebook for the current user
        /// <param name="notebook">Notebook data from form submission</param>
        /// returns a view with the created notebook
        /// redirects to the index action on success
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Notebook notebook)
        {
            if (!ModelState.IsValid) return View(notebook);

            var userId = _userManager.GetUserId(User);
            await _noteRepo.CreateNotebookAsync(notebook, userId);
            return RedirectToAction("Index");
        }
    }
}
