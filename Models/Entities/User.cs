using Microsoft.AspNetCore.Identity;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.ComponentModel.DataAnnotations;

namespace termprojectJksmartnote.Models.Entities
{
    // Inherit from IdentityUser
    // IdentityUser is a class that represents a user in the identity system
    // a user is the primary ower of the notebook and notes which enables
    // authentication and authorization
    public class User : IdentityUser
    {
        
        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string DisplayName { get; set; }  // Display name of the user aka username

        [DataType(DataType.DateTime)] //records when the user was created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // collection of the notebooks that belongs to the user 
        // this allows the one to many relationship between the user and the notebooks
        // this allows the user to have multiple notebooks
        // Navigation property
        public List<Notebook> Notebooks { get; set; } = new();

    }
}
