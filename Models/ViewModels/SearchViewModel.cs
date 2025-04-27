using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Models.ViewModels
{
    public class SearchViewModel
    {
        public string SearchTerm { get; set; }
        public int? TagId { get; set; }
        public ICollection<Tag> AvailableTags { get; set; } = new List<Tag>();
    }
}
