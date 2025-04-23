using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    public class NotesController : Controller
    {
        private readonly INoteRepository _noteRepo; // Repository for managing notes and notebooks
        private readonly UserManager<User> _userManager; // UserManager for managing user accounts
        /// Initializes a new instance of the NotesController 
        /// Initializes a new instance of the NotesController
        
        /// <param name="noteRepo"></param>
        /// <param name="userManager"></param>
        public NotesController(INoteRepository noteRepo, UserManager<User> userManager)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
        }
        
        /// Creates a new note for the current user
        /// <param name="notebookId"></param>
        
        [HttpGet]
        public IActionResult Create(int notebookId)
        {
            // Preselect notebook in creation form
            ViewBag.NotebookId = notebookId;
            return View();
        }


        /// processes the creation of a new note

        /// <param name="note"></param>
        /// Redirects to note details on success,
        /// returns form with errors on validation failure
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Note note)
        {
            if (!ModelState.IsValid) return View(note);

            var userId = _userManager.GetUserId(User);
            await _noteRepo.CreateNoteAsync(note, userId);
            return RedirectToAction("Details", new { id = note.Id });
        }
        /// Displays full note details with relationshi
        /// <param name="id"></param>
        ///return a view with the note details
        [HttpGet]
        public async Task<IActionResult> Details(int id)
        {
            var userId = _userManager.GetUserId(User);
            var note = await _noteRepo.GetNoteByIdAsync(id, userId);
            return note != null ? View(note) : NotFound();
        }
        /// Handles real-time content updates from editor auto-save       
        /// <param name="id"></param>
        /// <param name="content"></param>
        /// returns
        /// 200 OK on success
        /// This lightweight endpoint bypasses full model validation
        /// for performance-critical auto-save functionality
        public async Task<IActionResult> AutoSave(int id, string content)
        {
            var userId = _userManager.GetUserId(User);
            await _noteRepo.QuickUpdateNoteContentAsync(id, content, userId);
            return Ok();
        }
    }
}
