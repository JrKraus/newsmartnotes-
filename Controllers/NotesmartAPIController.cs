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

    [Route("api/notesmart")]
    [ApiController]
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
      
        #region Notes
        [HttpPost("notes/create")]
        public async Task<IActionResult> CreateNote([FromBody] Note note)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var createdNote = await _noteRepo.CreateNoteAsync(note, CurrentUserId);
                return CreatedAtAction(nameof(GetNote), new { id = createdNote.Id }, createdNote);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
        //create a new note
        //this method is used to create a new note
        //it takes in a note object and returns the created note
        //<param name="note">The note object to be created</param>
        //<returns>The created note object</returns>

        [HttpGet("notes/{id}")]
        public async Task<IActionResult> GetNote(int id)
        {
            var note = await _noteRepo.GetNoteByIdAsync(id, CurrentUserId);
            return note != null ? Ok(note) : NotFound();
        }
        //get a note by id
        //this method is used to get a note by its id
        //it takes in an id and returns the note object
        //<param name="id">The id of the note to be retrieved</param>
        //<returns>The note object</returns>

        [HttpPut("notes/{id}")]
        public async Task<IActionResult> UpdateNote(int id, [FromBody] Note note)
        {
            if (id != note.Id) return BadRequest("ID mismatch");
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _noteRepo.UpdateNoteAsync(note, CurrentUserId);
            return NoContent();
        }
        //update a note
        //this method is used to update a note
        //it takes in a note object and returns the updated note
        //<param name="note">The note object to be updated</param>
        //<param name="id">The id of the note to be updated</param>
        //<returns>The updated note object</returns>


        [HttpPatch("notes/{id}/content")]
        public async Task<IActionResult> AutoSaveNote(int id, [FromBody] string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                return BadRequest("Content cannot be empty");

            await _noteRepo.QuickUpdateNoteContentAsync(id, content, CurrentUserId);
            return NoContent();
        }
        //this method is used to update the content of a note
        //it takes in a note object and returns the updated note
        //<param name="note">The note object to be updated</param>
        //<param name="id">The id of the note to be updated</param>
        //<returns>The updated note object</returns>


        [HttpGet("notes/search")]
        public async Task<IActionResult> SearchNotes([FromQuery][Required] string term)
        {
            if (!ModelState.IsValid) return BadRequest("Search term required");
            return Ok(await _noteRepo.SearchNotesAsync(term, CurrentUserId));
        }
        #endregion
        
        


        //search for notes
        //this method is used to search for notes
        //it takes in a search term and returns the notes that match the search term
        //<param name="term">The search term to be used</param>
        //<returns>The notes that match the search term</returns>

        #region Notebooks
        [HttpPost("notebooks/create")]
        public async Task<IActionResult> CreateNotebook([FromBody] Notebook notebook)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var createdNotebook = await _noteRepo.CreateNotebookAsync(notebook, CurrentUserId);
            return CreatedAtAction(nameof(GetNotebook), new { id = createdNotebook.Id }, createdNotebook);
        }
        //create a new notebook
        //this method is used to create a new notebook
        //it takes in a notebook object and returns the created notebook
        //<param name="notebook">The notebook object to be created</param>
        //<returns>The created notebook object</returns>

        [HttpGet("notebooks/{id}")]
        public async Task<IActionResult> GetNotebook(int id)
        {
            var notebook = await _noteRepo.GetNotebookWithNotesAsync(id, CurrentUserId);
            return notebook != null ? Ok(notebook) : NotFound();
        }
        //get a notebook by id
        //this method is used to get a notebook by its id
        //it takes in an id and returns the notebook object
        //<param name="id">The id of the notebook to be retrieved</param>
        //<returns>The notebook object</returns>
       

        [HttpDelete("notebooks/{id}")]
        public async Task<IActionResult> DeleteNotebook(int id)
        {
            await _noteRepo.DeleteNotebookAsync(id, CurrentUserId);
            return NoContent();
        }
        
        [HttpPost("tags/associate")]
        public async Task<IActionResult> AssociateTag(
            [FromForm, Required, Range(1, int.MaxValue)] int noteId,
            [FromForm, Required, StringLength(50)] string tagName)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Verify note ownership
            var noteExists = await _noteRepo.GetNoteByIdAsync(noteId, CurrentUserId) != null;
            if (!noteExists) return Forbid();

            var tag = await _noteRepo.GetOrCreateTagAsync(tagName);
            await _noteRepo.AssociateTagToNoteAsync(noteId, tag.Id);
            return NoContent();
        }
        // Associate a tag with a note
        // This method is used to associate a tag with a note
        // It takes in a note ID and a tag name and returns nothing
        // <param name="noteId">The ID of the note to be associated with the tag</param>
        // <param name="tagName">The name of the tag to be associated with the note</param>
        // <returns>Nothing</returns>

        [HttpPost("tags/remove")]
        public async Task<IActionResult> RemoveTagFromNote(
            [FromForm, Required, Range(1, int.MaxValue)] int noteId,
            [FromForm, Required, Range(1, int.MaxValue)] int tagId)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Verify note ownership
            var note = await _noteRepo.GetNoteByIdAsync(noteId, CurrentUserId);
            if (note == null) return Forbid();

            await _noteRepo.RemoveTagFromNoteAsync(noteId, tagId);
            return NoContent();
        }
        // Remove a tag from a note
        // This method is used to remove a tag from a note
        // It takes in a note ID and a tag ID and returns nothing
        // <param name="noteId">The ID of the note to be removed from the tag</param>
        // <param name="tagId">The ID of the tag to be removed from the note</param>
        // <returns>Nothing</returns>
        [HttpPut("tags/update")]
        public async Task<IActionResult> UpdateTag(
            [FromForm, Required, Range(1, int.MaxValue)] int tagId,
            [FromForm, Required, StringLength(50)] string newName)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Use repository instead of direct context access
            try
            {
                await _noteRepo.UpdateTagAsync(tagId, newName);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound("Tag not found");
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }
        // Update a tag 
        // This method is used to update a tag
        // It takes in a tag ID and a new name and returns nothing
        // <param name="tagId">The ID of the tag to be updated</param>
        // <param name="newName">The new name of the tag</param>
        // <returns>Nothing</returns>
        #endregion




    }

}
