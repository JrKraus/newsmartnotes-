using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;
using Microsoft.EntityFrameworkCore;

namespace termprojectJksmartnote.Controllers

{
    // #region NotesmartAPIController/ #endregion
    //comes from the following link
    // https://stackoverflow.com/questions/44390454/what-is-the-use-of-region-and-endregion-in-c

    //[Route("api/notesmart")]
   // [ApiController]
    [EnableCors("AllowPostman")]
    [Authorize]
    // This controller is responsible for handling all the requests related to notes, notebooks and tags
    public class NotesmartController : ControllerBase
    {
        private readonly INoteRepository _noteRepo; // Repository for notes, notebooks and tags
        private readonly UserManager<User> _userManager; // User manager for handling user-related operations

        // Constructor for the controller
        // It takes in a note repository and a user manager as dependencies
        // This allows for better separation of concerns and makes the code more testable
        public NotesmartController(INoteRepository noteRepo, UserManager<User> userManager)
        {
            _noteRepo = noteRepo;
            _userManager = userManager;
        }
        // This property gets the current user's ID from the user manager
        private string CurrentUserId => _userManager.GetUserId(User);

        // This property gets the current user's display name from the user manager
      
        




    }

}
