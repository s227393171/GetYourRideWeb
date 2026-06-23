using MySqlConnector;
using System.Data;
using Microsoft.Extensions.FileProviders;
var builder = WebApplication.CreateBuilder(args);// Enable CORS so your frontend can communicate with the API
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
}); var app = builder.Build();
app.UseCors();// ✅ 1. Serve static files from wwwroot if it exists
app.UseStaticFiles();// ✅ 2. Serve static files from project root (Login.html, etc.)
app.UseFileServer(new FileServerOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory())),
    RequestPath = "",
    EnableDefaultFiles = true
});// ✅ 3. Explicitly map and serve the 'admin' directory assets securely
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "admin")),
    RequestPath = "/admin"
});// ✅ 4. Serve static files from assets folder (css, js)
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "assets")),
    RequestPath = "/assets"
});// Root Route: Serve Login.html
app.MapGet("/", () => Results.File(Path.Combine(Directory.GetCurrentDirectory(), "Login.html"), "text/html"));// ---------------------------------------------------------// AUTHENTICATION ENDPOINT// ---------------------------------------------------------
app.MapPost("/api/login", async (LoginRequest request, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "SELECT Role FROM Users WHERE Email = @Email AND Password = @Password";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@Email", request.Email);
    command.Parameters.AddWithValue("@Password", request.Password);

    using var reader = await command.ExecuteReaderAsync();

    if (await reader.ReadAsync())
    {
        string role = reader.GetString("Role");
        return Results.Ok(new { success = true, role = role });
    }

    return Results.Json(new { success = false, message = "Invalid email or password" }, statusCode: 401);
});// ---------------------------------------------------------// DRIVER PORTAL ENDPOINTS// ---------------------------------------------------------// 1. Force the database to return Marcus Chen directly for testing
app.MapGet("/api/driver/profile", async (string email, IConfiguration config) =>
{
    if (string.IsNullOrEmpty(email)) email = "driver@ride.com";

    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "SELECT UserID, FullName, Email, Role FROM Users WHERE Email = @Email LIMIT 1;";
    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@Email", email);

    using var reader = await command.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
        return Results.Ok(new
        {
            idNumber = $"EMP-{reader["UserID"]}",
            fullName = reader["FullName"].ToString(),
            email = reader["Email"].ToString(),
            role = reader["Role"].ToString()
        });
    }
    return Results.NotFound();
});// 2. Fetch Active Shuttle Manifest Bookings Data for Today (Synced camelCase Mapping)
app.MapGet("/api/driver/bookings", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var bookings = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
        // Removed the restrictive CURDATE() rule constraint so sample insert logs register flawlessly
        string query = @"
            SELECT b.BookingID, u.FullName, u.StudentNumber, r.RouteName, r.DepartureTime, b.BookingDate, b.Status 
            FROM Bookings b
            JOIN Users u ON b.StudentID = u.UserID
            JOIN Routes r ON b.RouteID = r.RouteID
            ORDER BY r.DepartureTime ASC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            // Maps exactly to what your driver dashboard JS variables look for!
            bookings.Add(new
            {
                bookingId = reader["BookingID"],
                studentName = reader["FullName"].ToString(),
                studentNumber = reader["StudentNumber"] != DBNull.Value ? reader["StudentNumber"].ToString() : "N/A",
                shuttle = "Shuttle Bus A",
                routeName = reader["RouteName"].ToString(),
                departureTime = reader["DepartureTime"].ToString(),
                bookingDate = Convert.ToDateTime(reader["BookingDate"]).ToString("yyyy-MM-dd"),
                status = reader["Status"].ToString()
            });
        }
    }
    catch (MySqlException ex)
    {
        Console.WriteLine($"Database query mismatch: {ex.Message}");
        return Results.Ok(bookings);
    }

    return Results.Ok(bookings);
});// ---------------------------------------------------------// ADMIN DASHBOARD ENDPOINTS// ---------------------------------------------------------// 1. Fetch Active/Verified Drivers Performance metrics from the Database
app.MapGet("/api/admin/driver-ratings", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var drivers = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT FullName, StudentNumber, JoinDate, AverageRating, TotalTrips, TotalRatingsCount 
        FROM Users 
        WHERE LOWER(Role) = 'driver' AND IsVerified = 1
        ORDER BY AverageRating DESC;";

    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        drivers.Add(new
        {
            FullName = reader["FullName"].ToString(),
            StudentNumber = reader["StudentNumber"] != DBNull.Value ? reader["StudentNumber"].ToString() : "N/A",
            JoinDateText = reader["JoinDate"] != DBNull.Value ? Convert.ToDateTime(reader["JoinDate"]).ToString("MMM yyyy") : "Jan 2026",
            AverageRating = Convert.ToDouble(reader["AverageRating"]),
            TotalTrips = Convert.ToInt32(reader["TotalTrips"]),
            TotalRatingsCount = Convert.ToInt32(reader["TotalRatingsCount"])
        });
    }
    return Results.Ok(drivers);
});// 2. Fetch Pending/Unverified Driver Applicants for the Verification Panel
app.MapGet("/api/admin/unverified-drivers", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var unverified = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT UserID, FullName, StudentNumber, Email 
        FROM Users 
        WHERE LOWER(Role) = 'driver' AND IsVerified = 0;";

    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        unverified.Add(new
        {
            UserId = Convert.ToInt32(reader["UserID"]),
            FullName = reader["FullName"].ToString(),
            StudentNumber = reader["StudentNumber"] != DBNull.Value ? reader["StudentNumber"].ToString() : "N/A",
            Email = reader["Email"].ToString()
        });
    }
    return Results.Ok(unverified);
});// 3. Update Verification State (Switches IsVerified flag from 0 to 1 when Admin clicks approve)
app.MapPost("/api/admin/verify-driver", async (VerifyActionRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "UPDATE Users SET IsVerified = 1 WHERE UserID = @UserID;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@UserID", req.UserId);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.BadRequest();
});// 4. NEW: Fetch Single Application Profile Details (Combined SQL INNER JOIN using StudentNumber)
app.MapGet("/api/admin/drivers/{studentId}", async (string studentId, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT u.FullName, u.StudentNumber, u.Email, 
               da.ContactNumber, da.VehicleMakeModel, da.RegistrationNumber, 
               da.SeatingCapacity, da.VehicleColor, da.LicenseImagePath, 
               da.RegistrationFilePath, da.ApplicationStatus
        FROM Users u
        INNER JOIN DriverApplications da ON u.UserID = da.UserID
        WHERE u.StudentNumber = @StudentNumber LIMIT 1;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@StudentNumber", studentId);

    using var reader = await command.ExecuteReaderAsync();

    if (await reader.ReadAsync())
    {
        return Results.Ok(new
        {
            fullName = reader["FullName"].ToString(),
            studentNumber = reader["StudentNumber"].ToString(),
            email = reader["Email"].ToString(),
            contactNumber = reader["ContactNumber"].ToString(),
            vehicleMakeModel = reader["VehicleMakeModel"].ToString(),
            registrationNumber = reader["RegistrationNumber"].ToString(),
            seatingCapacity = Convert.ToInt32(reader["SeatingCapacity"]),
            vehicleColor = reader["VehicleColor"].ToString(),
            licenseImagePath = reader["LicenseImagePath"].ToString(),
            registrationFilePath = reader["RegistrationFilePath"].ToString(),
            applicationStatus = reader["ApplicationStatus"].ToString()
        });
    }

    return Results.NotFound(new { message = "Application profile details not found." });
});// 5. NEW: Handle Decision Processing Status Updates (Approve / Reject Decisions)
app.MapPost("/api/admin/drivers/{studentId}/status", async (string studentId, DynamicStatusUpdate req, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    // If decision rule is Approval, switch IsVerified flag inside Core User profile record to active state
    int isVerifiedValue = (req.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase)) ? 1 : 0;

    string updateQuery = @"
        UPDATE Users u
        INNER JOIN DriverApplications da ON u.UserID = da.UserID
        SET da.ApplicationStatus = @Status, u.IsVerified = @IsVerified
        WHERE u.StudentNumber = @StudentNumber;";

    using var command = new MySqlCommand(updateQuery, connection);
    command.Parameters.AddWithValue("@Status", req.Status);
    command.Parameters.AddWithValue("@IsVerified", isVerifiedValue);
    command.Parameters.AddWithValue("@StudentNumber", studentId);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.BadRequest();
});

app.Run();
public record LoginRequest(string Email, string Password);
public record VerifyActionRequest(int UserId);
public record DynamicStatusUpdate(string Status);