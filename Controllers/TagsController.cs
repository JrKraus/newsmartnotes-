using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;

namespace termprojectJksmartnote.Controllers
{
    public class TagsController : Controller
    {
        private readonly INoteRepository _noteRepo;
        private readonly UserManager<User> _userManager;

        public TagsController(INoteRepository noteRepo, UserManager<User> userManager)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Associate(int noteId, string tagName)
        {
            var userId = _userManager.GetUserId(User);
            var tag = await _noteRepo.GetOrCreateTagAsync(tagName);
            await _noteRepo.AssociateTagToNoteAsync(noteId, tag.Id);
            return RedirectToAction("Details", "Notes", new { id = noteId });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Remove(int noteId, int tagId)
        {
            var userId = _userManager.GetUserId(User);
            await _noteRepo.RemoveTagFromNoteAsync(noteId, tagId);
            return RedirectToAction("Details", "Notes", new { id = noteId });
        }
    }
}
