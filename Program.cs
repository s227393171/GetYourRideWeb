using MySqlConnector;
using System.Data;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Enable CORS so your frontend can communicate with the API
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

// ✅ Serve static files from wwwroot if it exists
app.UseStaticFiles();

// ✅ Serve static files from project root (Login.html, dashboard.html, etc.)
app.UseFileServer(new FileServerOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory())),
    RequestPath = "",
    EnableDefaultFiles = true
});

// ✅ Serve static files from assets folder (css, js)
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "assets")),
    RequestPath = "/assets"
});

// Root Route: Serve Login.html
app.MapGet("/", () => Results.File(Path.Combine(Directory.GetCurrentDirectory(), "Login.html"), "text/html"));

// ---------------------------------------------------------
// AUTHENTICATION ENDPOINT
// ---------------------------------------------------------
app.MapPost("/api/login", async (LoginRequest request, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    // Matching your exact column names: Email, Password, and Role
    string query = "SELECT Role FROM Users WHERE Email = @Email AND Password = @Password";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@Email", request.Email);
    command.Parameters.AddWithValue("@Password", request.Password); // Plain text matching '1234'

    using var reader = await command.ExecuteReaderAsync();

    if (await reader.ReadAsync())
    {
        string role = reader.GetString("Role");
        return Results.Ok(new { success = true, role = role });
    }

    return Results.Json(new { success = false, message = "Invalid email or password" }, statusCode: 401);
});

// ---------------------------------------------------------
// DRIVER PORTAL ENDPOINTS (Synced with your exact DB schema)
// ---------------------------------------------------------

// 1. Fetch Logged-in Driver Profile Data
app.MapGet("/api/driver/profile", async (IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    // Grabbing Driver One's metrics as the default context from your exact INSERT setup
    string query = "SELECT UserID, FullName, Email, Role FROM Users WHERE Email = 'driver@ride.com' LIMIT 1;";

    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    if (await reader.ReadAsync())
    {
        return Results.Ok(new
        {
            idNumber = $"EMP-{reader["UserID"]}", // Generates clean ID string 'EMP-3' dynamically matching frontend
            fullName = reader["FullName"].ToString(),
            email = reader["Email"].ToString(),
            role = reader["Role"].ToString()
        });
    }

    return Results.NotFound(new { message = "Driver profile record missing." });
});

// 2. Fetch Active Shuttle Manifest Bookings Data for Today
app.MapGet("/api/driver/bookings", async (IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");
    var bookings = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
        // Capitalization matches exactly with your new script updates
        string query = @"
            SELECT b.BookingID, u.FullName, u.StudentNumber, r.RouteName, r.DepartureTime, b.Status 
            FROM Bookings b
            JOIN Users u ON b.StudentID = u.UserID
            JOIN Routes r ON b.RouteID = r.RouteID
            WHERE b.BookingDate = CURDATE()
            ORDER BY r.DepartureTime ASC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            bookings.Add(new
            {
                BookingId = reader["BookingID"],
                StudentName = reader["FullName"].ToString(),
                StudentNumber = reader["StudentNumber"].ToString(), // Maps student UserID to display number layout card
                RouteName = reader["RouteName"].ToString(),
                DepartureTime = reader["DepartureTime"].ToString(),
                Status = reader["Status"].ToString()
            });
        }
    }
    catch (MySqlException ex)
    {
        // Logs database structural errors cleanly if tables aren't matching
        Console.WriteLine($"Database query mismatch: {ex.Message}");
        return Results.Ok(bookings);
    }

    return Results.Ok(bookings);
});

app.Run();

// DTO Declarations
public record LoginRequest(string Email, string Password);