using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;


namespace termprojectJksmartnote.Views.Shared.Components
{
    public class UserNotebooksViewComponent : ViewComponent
    {
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;

        public UserNotebooksViewComponent(INoteRepository noteRepo, UserManager<User> userManager)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
        }

        public async Task<IViewComponentResult> InvokeAsync(int? activeNotebookId = null, int? activeNoteId = null)
        {
            var userId = _userManager.GetUserId(HttpContext.User);
            var notebooks = await _noteRepo.GetAllUserNotebooksWithNotesAsync(userId);

            ViewBag.ActiveNotebookId = activeNotebookId;
            ViewBag.ActiveNoteId = activeNoteId;

            return View(notebooks);
        }
    }
}
