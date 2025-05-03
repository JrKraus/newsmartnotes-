using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Models.ViewModels
{ /// ViewModel for search functionality
    public class SearchViewModel
    {
        public string SearchTerm { get; set; } = string.Empty; // Default to empty string
        public int? TagId { get; set; } // Nullable to allow for no tag selection
        
        //navigation property
        public ICollection<Tag> AvailableTags { get; set; } = new List<Tag>(); // Default to empty list
    }
}
