using Microsoft.EntityFrameworkCore;
using termprojectJksmartnote.Models.Entities;
using termprojectJksmartnote.Services;
using Microsoft.AspNetCore.Identity;

using System.Text.Json.Serialization;



var builder = WebApplication.CreateBuilder(args);
// Default providers added automatically
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.AddEventSourceLogger();
// On Windows:


// Database Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));


// Identity Configuration
builder.Services.AddDefaultIdentity<User>(options => {
    options.SignIn.RequireConfirmedAccount = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<ApplicationDbContext>();

// CORS Configuration
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(builder => {
        builder.WithOrigins("https://web.postman.com")
               .AllowAnyHeader()
               .AllowAnyMethod();
    });
});
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.Configure<IdentityOptions>(options =>
{
    options.SignIn.RequireConfirmedEmail = false; // Require confirmed email to sign in
});
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddControllersWithViews();
builder.Services.AddScoped<INoteRepository, NoteRepository>();

var app = builder.Build();

// Middleware Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
}
else
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors();
app.MapControllers();
app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

//Add this before your route mapping


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapRazorPages();

app.Run();

