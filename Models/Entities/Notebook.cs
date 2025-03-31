
using System.ComponentModel.DataAnnotations;

namespace termprojectJksmartnote.Models.Entities
{
    //a notebook is a collection of notes
    //a notebook belongs to a user
    
    public class Notebook
    {
        public int Id { get; set; }  // Primary Key

        [Required] // Title is required
        [StringLength(100)]  // Max length of 100 characters for the title of the notebook
        // Reason: It prevents the user from entering a title that is too long and 100 seemed enough
        public string Title { get; set; } // Title of the notebook

        [DataType(DataType.DateTime)]
        //records when the notebook was created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign Key
        // This links the notebook to a user
        // Reason: A notebook belongs to a user this sets up the relationship
        public string UserId { get; set; }

        // Navigation properties
        // Provides access to the user that this notebook belongs to
        public User User { get; set; }
        //this sets up the relationship between the notebook and the notes
        //this allows the one to many relationship between the notebook and the notes
        public List<Note> Notes { get; set; } = new();

    }
}
