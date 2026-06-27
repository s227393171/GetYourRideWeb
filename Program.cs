using MySqlConnector;
using System.Data;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Enable CORS so your frontend can communicate with the API
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

// ✅ 1. Serve static files from wwwroot if it exists
app.UseStaticFiles();

// ✅ 2. Serve static files from project root (Login.html, etc.)
app.UseFileServer(new FileServerOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory())),
    RequestPath = "",
    EnableDefaultFiles = true
});

// ✅ 3. Explicitly map and serve the 'admin' directory assets securely
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "admin")),
    RequestPath = "/admin"
});

// ✅ 4. Serve static files from assets folder (css, js)
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
});

// ---------------------------------------------------------
// DRIVER PORTAL ENDPOINTS
// ---------------------------------------------------------
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
});

app.MapGet("/api/driver/bookings", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var bookings = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
        string query = @"
            SELECT b.BookingID, u.FullName, u.StudentNumber, r.DepartureFrom, r.ArrivalAt, r.DepartureTime, b.BookingDate, b.Status 
            FROM Bookings b
            JOIN Users u ON b.StudentID = u.UserID
            JOIN Routes r ON b.RouteID = r.RouteID
            ORDER BY r.DepartureTime ASC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        int idOrdinal = reader.GetOrdinal("BookingID");
        int nameOrdinal = reader.GetOrdinal("FullName");
        int numOrdinal = reader.GetOrdinal("StudentNumber");
        int fromOrdinal = reader.GetOrdinal("DepartureFrom");
        int atOrdinal = reader.GetOrdinal("ArrivalAt");
        int timeOrdinal = reader.GetOrdinal("DepartureTime");
        int dateOrdinal = reader.GetOrdinal("BookingDate");
        int statusOrdinal = reader.GetOrdinal("Status");

        while (await reader.ReadAsync())
        {
            int bookingId = reader.GetInt32(idOrdinal);
            string studentName = reader.GetString(nameOrdinal);
            string studentNumber = !reader.IsDBNull(numOrdinal) ? reader.GetValue(numOrdinal).ToString() : "N/A";
            string departureFrom = reader.GetString(fromOrdinal);
            string arrivalAt = reader.GetString(atOrdinal);

            string departureTime = reader.GetValue(timeOrdinal).ToString();
            if (departureTime.Length >= 5) departureTime = departureTime.Substring(0, 5);

            string bookingDate = "2026-06-26";
            if (!reader.IsDBNull(dateOrdinal))
            {
                var rawDate = reader.GetValue(dateOrdinal);
                bookingDate = rawDate is DateTime dt ? dt.ToString("yyyy-MM-dd") : Convert.ToDateTime(rawDate).ToString("yyyy-MM-dd");
            }

            string status = !reader.IsDBNull(statusOrdinal) ? reader.GetString(statusOrdinal) : "Booked";

            bookings.Add(new
            {
                bookingId = bookingId,
                studentName = studentName,
                studentNumber = studentNumber,
                shuttle = "Shuttle Bus A",
                departureFrom = departureFrom,
                arrivalAt = arrivalAt,
                departureTime = departureTime,
                bookingDate = bookingDate,
                status = status
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Driver Bookings failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(bookings);
});

// ---------------------------------------------------------
// ADMIN DASHBOARD ENDPOINTS
// ---------------------------------------------------------
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
});

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
});

app.MapPost("/api/admin/verify-driver", async (VerifyActionRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "UPDATE Users SET IsVerified = 1 WHERE UserID = @UserID;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@UserID", req.UserId);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.BadRequest();
});

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
});

app.MapPost("/api/admin/drivers/{studentId}/status", async (string studentId, DynamicStatusUpdate req, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

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

// ---------------------------------------------------------
// SHUTTLE COORDINATOR FLEET ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/coordinator/shuttles", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var shuttles = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "SELECT ShuttleID, ShuttleName, LicensePlate, Capacity, Status FROM Shuttles ORDER BY ShuttleID DESC;";

    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        shuttles.Add(new
        {
            shuttleId = Convert.ToInt32(reader["ShuttleID"]),
            shuttleName = reader["ShuttleName"].ToString(),
            licensePlate = reader["LicensePlate"].ToString(),
            capacity = Convert.ToInt32(reader["Capacity"]),
            status = reader["Status"].ToString()
        });
    }
    return Results.Ok(shuttles);
});

app.MapPost("/api/coordinator/shuttles", async (ShuttleDto newShuttle, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"INSERT INTO Shuttles (ShuttleName, LicensePlate, Capacity, Status) 
                     VALUES (@Name, @Plate, @Capacity, @Status);";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@Name", newShuttle.ShuttleName);
    command.Parameters.AddWithValue("@Plate", newShuttle.LicensePlate);
    command.Parameters.AddWithValue("@Capacity", newShuttle.Capacity);
    command.Parameters.AddWithValue("@Status", newShuttle.Status);

    try
    {
        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { message = "Shuttle successfully added to database." });
    }
    catch (MySqlException ex) when (ex.Number == 1062)
    {
        return Results.BadRequest("A vehicle asset with this license plate already exists.");
    }
});

app.MapPut("/api/coordinator/shuttles/{id:int}", async (int id, ShuttleDto updatedShuttle, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"UPDATE Shuttles 
                     SET ShuttleName = @Name, LicensePlate = @Plate, Capacity = @Capacity, Status = @Status 
                     WHERE ShuttleID = @Id;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@Id", id);
    command.Parameters.AddWithValue("@Name", updatedShuttle.ShuttleName);
    command.Parameters.AddWithValue("@Plate", updatedShuttle.LicensePlate);
    command.Parameters.AddWithValue("@Capacity", updatedShuttle.Capacity);
    command.Parameters.AddWithValue("@Status", updatedShuttle.Status);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    if (rowsAffected == 0) return Results.NotFound("Shuttle record not found.");

    return Results.Ok(new { message = "Shuttle updated successfully." });
});

app.MapDelete("/api/coordinator/shuttles/{id:int}", async (int id, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "DELETE FROM Shuttles WHERE ShuttleID = @Id;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@Id", id);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    if (rowsAffected == 0) return Results.NotFound("Target record does not exist.");

    return Results.Ok(new { message = "Asset successfully deleted." });
});

// ---------------------------------------------------------
// SHUTTLE COORDINATOR SCHEDULING ENDPOINTS (ShuttleSchedules Table Alignment)
// ---------------------------------------------------------
app.MapGet("/api/coordinator/schedules", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var schedules = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
        // Targets ShuttleSchedules and brings in route, shuttle, and driver descriptions safely
        string query = @"
            SELECT sch.ScheduleID, r.DepartureFrom, r.ArrivalAt, sch.DepartureTime, sch.ScheduleDate,
                   COALESCE(s.ShuttleName, 'Unassigned') AS ShuttleName, 
                   COALESCE(u.FullName, 'Unassigned') AS DriverName
            FROM ShuttleSchedules sch
            INNER JOIN Routes r ON sch.RouteID = r.RouteID
            LEFT JOIN Shuttles s ON sch.ShuttleID = s.ShuttleID
            LEFT JOIN Users u ON sch.DriverID = u.UserID
            ORDER BY sch.ScheduleDate DESC, sch.DepartureTime ASC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        int scheduleIdOrdinal = reader.GetOrdinal("ScheduleID");
        int fromOrdinal = reader.GetOrdinal("DepartureFrom");
        int atOrdinal = reader.GetOrdinal("ArrivalAt");
        int timeOrdinal = reader.GetOrdinal("DepartureTime");
        int dateOrdinal = reader.GetOrdinal("ScheduleDate");
        int shuttleOrdinal = reader.GetOrdinal("ShuttleName");
        int driverOrdinal = reader.GetOrdinal("DriverName");

        while (await reader.ReadAsync())
        {
            string scheduleTimeFormatted = reader.GetValue(timeOrdinal).ToString();
            if (scheduleTimeFormatted.Length >= 5) scheduleTimeFormatted = scheduleTimeFormatted.Substring(0, 5);

            string scheduleDateFormatted = "2026-06-26";
            if (!reader.IsDBNull(dateOrdinal))
            {
                scheduleDateFormatted = Convert.ToDateTime(reader.GetValue(dateOrdinal)).ToString("yyyy-MM-dd");
            }

            schedules.Add(new
            {
                scheduleId = Convert.ToInt32(reader[scheduleIdOrdinal]),
                routeName = $"{reader[fromOrdinal]} ➔ {reader[atOrdinal]}",
                departureTime = scheduleTimeFormatted,
                scheduleDate = scheduleDateFormatted,
                shuttleName = reader[shuttleOrdinal].ToString(),
                driverName = reader[driverOrdinal].ToString()
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Schedules lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
    return Results.Ok(schedules);
});
// 5. Fetch all verified drivers for the coordinator roster (GET)
app.MapGet("/api/coordinator/drivers", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var drivers = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
        string query = @"
            SELECT u.UserID, u.StudentNumber, u.FullName, u.IsVerified, u.Email,
                   COALESCE(da.ContactNumber, 'N/A') AS ContactNumber
            FROM Users u
            LEFT JOIN DriverApplications da ON u.UserID = da.UserID
            WHERE LOWER(u.Role) = 'driver' AND u.IsVerified = 1;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            drivers.Add(new
            {
                // JavaScript fields are case-sensitive. Let's provide BOTH standard naming styles 
                // so your script catches what it needs regardless of its variable setup:
                id = Convert.ToInt32(reader["UserID"]),
                driverId = Convert.ToInt32(reader["UserID"]),

                // Mappings for Name & Email subtext fields
                name = reader["FullName"].ToString(),
                fullName = reader["FullName"].ToString(),
                email = reader["Email"].ToString(),

                // Mappings for Employee ID columns
                employeeId = reader["StudentNumber"] != DBNull.Value ? reader["StudentNumber"].ToString() : $"EMP-{reader["UserID"]}",
                studentNumber = reader["StudentNumber"] != DBNull.Value ? reader["StudentNumber"].ToString() : $"EMP-{reader["UserID"]}",

                // Other dashboard attributes
                contactNumber = reader["ContactNumber"].ToString(),
                assignedShuttle = "Unassigned",
                status = "Active"
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Coordinator drivers loading failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(drivers);
});

app.MapPost("/api/coordinator/schedules", async (ScheduleDirectDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string standardizedTime = req.DepartureTime;
    if (standardizedTime.Length == 5) standardizedTime += ":00";

    string incoming = req.RouteName;
    string fromLocation = incoming.Contains('➔') ? incoming.Split('➔')[0].Trim() : incoming.Trim();
    string toLocation = incoming.Contains('➔') ? incoming.Split('➔')[1].Trim() : "Campus Hub";

    try
    {
        // Find existing RouteID matching the stop tracking locations
        int routeId = 1;
        string findRouteQuery = "SELECT RouteID FROM Routes WHERE DepartureFrom = @From AND ArrivalAt = @To LIMIT 1;";
        using (var findCmd = new MySqlCommand(findRouteQuery, connection))
        {
            findCmd.Parameters.AddWithValue("@From", fromLocation);
            findCmd.Parameters.AddWithValue("@To", toLocation);
            var result = await findCmd.ExecuteScalarAsync();
            if (result != null)
            {
                routeId = Convert.ToInt32(result);
            }
        }

        // Inserts data directly into the matching ShuttleSchedules schema allocation table
        string insertQuery = @"INSERT INTO ShuttleSchedules (RouteID, ScheduleDate, DepartureTime, ShuttleID, DriverID) 
                               VALUES (@RouteID, @ScheduleDate, @DepartureTime, @ShuttleID, @DriverID);";

        using var command = new MySqlCommand(insertQuery, connection);
        command.Parameters.AddWithValue("@RouteID", routeId);
        command.Parameters.AddWithValue("@ScheduleDate", string.IsNullOrEmpty(req.ScheduleDate) ? "2026-06-26" : req.ScheduleDate);
        command.Parameters.AddWithValue("@DepartureTime", standardizedTime);
        command.Parameters.AddWithValue("@ShuttleID", req.ShuttleID);
        command.Parameters.AddWithValue("@DriverID", req.DriverID);

        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { success = true, message = "Assignment recorded successfully inside ShuttleSchedules." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database Save Error: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

app.Run();

// ---------------------------------------------------------
// DATA TRANSFER RECORDS (DTOs)
// ---------------------------------------------------------
public record ScheduleDirectDto(string RouteName, string ScheduleDate, string DepartureTime, int ShuttleID, int DriverID);
public record LoginRequest(string Email, string Password);
public record VerifyActionRequest(int UserId);
public record DynamicStatusUpdate(string Status);
public record ShuttleDto(string ShuttleName, string LicensePlate, int Capacity, string Status);
public record DriverUpsertDto(string StudentNumber, string FullName, string Email);