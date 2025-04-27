using System.ComponentModel.DataAnnotations;

namespace termprojectJksmartnote.Models.Entities
{
    // Tag entity
    //a tag can help the user to categorize the notes
    //a tag can be used to search for notes
    public class Tag
    {
        public int Id { get; set; }  // Primary Key

        [Required]
        [StringLength(50)]  // Max length of 50 characters for the tag name
        // Reason: It prevents the user from entering a tag name that is too long and 50 seemed enough
        public string Name { get; set; } // Tag name

        [Required]
        public string UserId { get; set; }

        // Navigation properties
        // Provides access to the user that this notebook belongs to

        public User? User { get; set; }

        // Navigation property
        //collection of notes that are associated with this tag 
        //this allows the many to many relationship between notes and tags
        //this property allows the user to access the notes that are associated with this tag
        public List<NoteTag> NoteTags { get; set; } = new();

    }
}
