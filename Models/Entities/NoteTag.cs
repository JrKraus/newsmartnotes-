namespace termprojectJksmartnote.Models.Entities
{
    // NoteTag entity
    //repsents the many to many relationship between notes and tags
    //each instance of note tag resprensents a note that is associated with a tag
    public class NoteTag
    {
        public int NoteId { get; set; } // Foreign Key
        public int TagId { get; set; } // Foreign Key

        //this links the note tag to a note

        // Navigation properties
        //provide access to the note that this note tag belongs to
        //this sets up the relationship between the note tag and the note

        public Note Note { get; set; }
        public Tag Tag { get; set; }

    }
}
