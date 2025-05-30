﻿using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Controllers
{
    ///source https://docs.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-7.0
   
    /// handles user registration and login
    /// </summary>
    [Route("Account")]
    public class AccountController : Controller
    {
       
        /// UserManager is used to manage users
      
        private readonly UserManager<User> _userManager;
      
        /// SignInManager is used to sign in users
      
        private readonly SignInManager<User> _signInManager;

   
        /// UserManager is used to manage users
       
        /// <param name="userManager"></param>
        /// <param name="signInManager"></param>

        public AccountController(
            UserManager<User> userManager,
            SignInManager<User> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }
       
        /// Register action method to display the registration form
        
        [HttpGet("Register")]
        public IActionResult Register() => View();
        
        /// Register action method to handle the registration form submission
        
        /// <param name="model"></param>
        /// Redirects to home page on success, 
        /// returns form with errors on failure
        [HttpPost("Register")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (!ModelState.IsValid) return View(model);
            // check if the email is already registered

            var user = new User  // Create a new user object
            {
                UserName = model.Email,
                Email = model.Email,
                DisplayName = model.DisplayName
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // If registration is successful, sign in the user
                await _signInManager.SignInAsync(user, isPersistent: false);
                return RedirectToAction("Index", "Home");
            }
            //add errors to the model state if registration fails
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }

            return View(model);
        }
        // ---------- Authentication ---------- //

        /// Login action method to display the login form

        [HttpGet("Login")]
        public IActionResult Login() => View();
       
        /// Login action method to handle the login form submission
        
        /// <param name="model"></param>
        /// Redirects to home page on success,
        /// returns form with error on failure
        [HttpPost("Login")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid) return View(model);

            var result = await _signInManager.PasswordSignInAsync(
                model.Email,
                model.Password,
                model.RememberMe, //persist the login across sessions
                lockoutOnFailure: false);  //disable lockout on failure

            if (result.Succeeded)
            {
                return RedirectToAction("Index", "Home");
            }

            ModelState.AddModelError(string.Empty, "Invalid login attempt");
            return View(model);
        }

        /// Logout action method to handle the logout request
       
        /// goes to the home page
        [HttpPost("Logout")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return RedirectToAction("Index", "Home");
        }
    }
    // ---------- View Models ---------- //
    /// Represents data required for user registration 
    /// the reason i put the class here is to prevent overposting attacks
    /// Represents data required for user registration 
    ///  https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
    public class RegisterViewModel
    {
        [Required]
        [EmailAddress]
        [Display(Name = "Email")]
        public string Email { get; set; }
        /// User's email address (used as username)
        [Required]
        [StringLength(50, MinimumLength = 3)]
        [Display(Name = "Display Name")]
        public string DisplayName { get; set; }
        ///public display name (3-50 characters)
        [Required]
        [StringLength(100, ErrorMessage = "The {0} must be at least {2} characters long.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; }
        /// Password confirmation must match
        [DataType(DataType.Password)]
        [Display(Name = "Confirm Password")]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; }
    }

    
    /// Represents data required for user login
    
    public class LoginViewModel
    {
        /// User's email address (used as username)
        [Required]
        [EmailAddress]
        [Display(Name = "Email")]
        public string Email { get; set; }
       
        /// User's password (6-100 characters)
        
        [Required]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; }
       
        /// Indicates whether to remember the user
        
        [Display(Name = "Remember me?")]
        public bool RememberMe { get; set; }
    }
}