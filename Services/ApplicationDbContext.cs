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
        // Setup the relationship between the entities  
        public DbSet<Notebook> Notebooks => Set<Notebook>(); // Maps to the Notebooks table with one-to-many relationship  
        public DbSet<Note> Notes => Set<Note>(); // Maps to the Notes table with one-to-many relationship to Notebook  
        public DbSet<Tag> Tags => Set<Tag>(); // Maps to the Tags table with many-to-many relationship to Note  
        public DbSet<NoteTag> NoteTags => Set<NoteTag>(); // Maps to the NoteTags table with many-to-many relationship to Note and Tag  

        // Use the `new` keyword to hide the inherited `Users` property  
        public new DbSet<User> Users => Set<User>();

        // Override the OnModelCreating method  
        // Configure the many-to-many relationship between Note and Tag  
        // This method is called when the model is created  
        // This method is used to configure the relationships between the entities  

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

            modelBuilder.Entity<NoteTag>()
                .HasOne(nt => nt.Tag)
                .WithMany(t => t.NoteTags)
                .HasForeignKey(nt => nt.TagId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Notebook>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notebooks)
                .HasForeignKey(n => n.UserId);

            modelBuilder.Entity<Note>()
                .HasOne(n => n.Notebook)
                .WithMany(nb => nb.Notes)
                .HasForeignKey(n => n.NotebookId);

            // Add UserId as foreign key for Tag entity  
            modelBuilder.Entity<Tag>()
                .HasOne(t => t.User)
                .WithMany(u => u.Tags)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict); // Restrict prevents cascade delete to User  
        }
    }

}

