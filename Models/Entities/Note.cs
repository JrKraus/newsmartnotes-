using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;
namespace termprojectJksmartnote.Models.Entities
{
    //this class is the model used for the note entity 
    public class Note
    {
        public int Id { get; set; }   //this is the PK of the note entity 


        [Required]
        [StringLength(200)]  //this sets the max length of title to 200 chatrters 
        //reason: it prevents the user from entering a title that is too loong and 200 seemed enough
        public string? Title { get; set; } //this is the title of the note

        
        public string? Content { get; set; }  //this is the content of the note 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;   //records when note was created
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow; //records when last updated 

        // Foreign Key
        //this links this to a notebook 
        [Required]
        public int NotebookId { get; set; }

        // Navigation properties
        //provide access to the notebook that this note belongs to
        [JsonIgnore]
        public Notebook? Notebook { get; set; }
        //Collection of tags that are associated with this note 
        //this allows the many to many relationship between notes and tags
        public List<NoteTag> NoteTags { get; set; } = new();
    }
}
