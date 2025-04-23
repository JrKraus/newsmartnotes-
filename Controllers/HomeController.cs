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

        

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
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
    }
}
