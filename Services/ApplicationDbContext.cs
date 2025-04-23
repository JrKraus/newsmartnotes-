using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models.Entities;

namespace termprojectJksmartnote.Services
{
    public class ApplicationDbContext : IdentityDbContext<User>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {

        }
        // Add the DbSet properties
        //setup the relatioship between the entities
        public DbSet<Notebook> Notebooks => Set<Notebook>(); //maps to the Notebooks table with one-to-many relationship 
        public DbSet<Note> Notes => Set<Note>();  //Maps to the Notes table with one-to-many relationship to Notebook
        public DbSet<Tag> Tags => Set<Tag>(); //Maps to the Tags table with many-to-many relationship to Note
        public DbSet<NoteTag> NoteTags => Set<NoteTag>(); //Maps to the NoteTags table with many-to-many relationship to Note and Tag


        // Override the OnModelCreating method
        //configure the many-to-many relationship between Note and Tag
        //this method is called when the model is created
        //this method is used to configure the relationships between the entities

        //i got this infomation from the microsoft documentation
        //https://docs.microsoft.com/en-us/ef/core/modeling/relationships?tabs=data-annotations%2Cfluent-api-simple-key%2Csimple-key
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure the many-to-many relationship
            modelBuilder.Entity<NoteTag>()
                .HasKey(nt => new { nt.NoteId, nt.TagId });
            
            // Configure the relationships for delete behavior
            modelBuilder.Entity<NoteTag>()
                .HasOne(nt => nt.Note)
                .WithMany(n => n.NoteTags)
                .HasForeignKey(nt => nt.NoteId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure the relationships for delete behavior 
            modelBuilder.Entity<NoteTag>() 
                .HasOne(nt => nt.Tag)
                .WithMany(t => t.NoteTags)
                .HasForeignKey(nt => nt.TagId)
                .OnDelete(DeleteBehavior.Cascade);
                
        }
    }

}

