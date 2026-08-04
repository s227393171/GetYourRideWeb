using MySqlConnector;
using System.Data;
using Microsoft.Extensions.FileProviders;
//using MySql.Data.MySqlClient; // Ensure your MySQL import is present

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

// 1. Serve static files from wwwroot if it exists
app.UseStaticFiles();

// 2. Serve static files from project root (Login.html, etc.)
app.UseFileServer(new FileServerOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory())),
    RequestPath = "",
    EnableDefaultFiles = true
});

// 3. Explicitly map and serve the 'admin' directory assets securely
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "admin")),
    RequestPath = "/admin"
});

// 4. Serve static files from assets folder (css, js)
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

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT role AS Role FROM users WHERE email = @Email AND password = @Password
            UNION ALL
            SELECT role AS Role FROM driver WHERE email = @Email AND password = @Password
            UNION ALL
            SELECT 'STUDENT' AS Role FROM student WHERE email = @Email AND password = @Password
            LIMIT 1;";

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
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Login failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// DRIVER PORTAL ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/driver/profile", async (string email, IConfiguration config) =>
{
    if (string.IsNullOrEmpty(email)) email = "thabo.nkosi@shuttle.nmu.ac.za";

    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT driver_id, CONCAT(first_name, ' ', last_name) AS FullName, email, role
            FROM driver WHERE email = @Email LIMIT 1;";
        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Email", email);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return Results.Ok(new
            {
                idNumber = $"DRV-{reader["driver_id"]}",
                fullName = reader["FullName"].ToString(),
                email = reader["email"].ToString(),
                role = reader["role"].ToString()
            });
        }
        return Results.NotFound();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Driver profile lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Bookings for the trips this driver runs. Pass ?email=driver@example.com
app.MapGet("/api/driver/bookings", async (string? email, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var bookings = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT tb.booking_id,
                   CONCAT(s.first_name, ' ', s.last_name) AS FullName,
                   s.student_number,
                   t.departure_stop,
                   t.destination_stop,
                   t.departure_time,
                   tb.booking_date,
                   tb.booking_status,
                   v.model AS VehicleModel
            FROM trip_booking tb
            JOIN student s ON tb.student_id = s.student_id
            JOIN trip t ON tb.trip_id = t.trip_id
            JOIN driver d ON t.driver_id = d.driver_id
            LEFT JOIN vehicle v ON t.registration_number = v.registration_number
            WHERE (@Email IS NULL OR d.email = @Email)
            ORDER BY t.departure_time ASC;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Email", string.IsNullOrEmpty(email) ? (object)DBNull.Value : email);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            bookings.Add(new
            {
                bookingId = Convert.ToInt32(reader["booking_id"]),
                studentName = reader["FullName"].ToString(),
                studentNumber = reader["student_number"] != DBNull.Value ? reader["student_number"].ToString() : "N/A",
                shuttle = reader["VehicleModel"] != DBNull.Value ? reader["VehicleModel"].ToString() : "Unassigned",
                departureFrom = reader["departure_stop"].ToString(),
                arrivalAt = reader["destination_stop"].ToString(),
                departureTime = Convert.ToDateTime(reader["departure_time"]).ToString("HH:mm"),
                bookingDate = reader["booking_date"] != DBNull.Value
                    ? Convert.ToDateTime(reader["booking_date"]).ToString("yyyy-MM-dd")
                    : "",
                status = reader["booking_status"].ToString()
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
    var list = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT 
                d.driver_id,
                CONCAT(d.first_name, ' ', d.last_name) AS full_name,
                d.email,
                d.role,
                d.join_date,
                COALESCE(NULLIF(s.student_number, 'undefined'), CONCAT('DRV-', d.driver_id)) AS display_id,
                COUNT(DISTINCT t.trip_id) AS total_trips,
                COALESCE(AVG(r.rating), 0.0) AS avg_rating,
                COUNT(r.review_id) AS total_reviews
            FROM driver d
            LEFT JOIN student s ON d.email = s.email
            LEFT JOIN trip t ON d.driver_id = t.driver_id
            LEFT JOIN trip_booking tb ON tb.trip_id = t.trip_id
            LEFT JOIN trip_review r ON r.booking_id = tb.booking_id
            WHERE d.is_verified = 1 
              AND (d.role = 'SHUTTLE_DRIVER' OR d.role IS NULL OR d.role != 'STUDENT_DRIVER')
            GROUP BY d.driver_id, d.first_name, d.last_name, d.email, d.role, d.join_date, s.student_number;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                driverId = Convert.ToInt32(reader["driver_id"]),
                fullName = reader["full_name"].ToString(),
                studentNumber = reader["display_id"].ToString(),
                joinDateText = reader["join_date"] != DBNull.Value
                    ? Convert.ToDateTime(reader["join_date"]).ToString("MMM yyyy")
                    : "Jan 2025",
                totalTrips = Convert.ToInt32(reader["total_trips"]),
                averageRating = Math.Round(Convert.ToDouble(reader["avg_rating"]), 1),
                totalRatingsCount = Convert.ToInt32(reader["total_reviews"])
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] /api/admin/driver-ratings execution failed: {ex.Message}");
        return Results.Ok(new List<object>());
    }

    return Results.Ok(list);
});

app.MapGet("/api/admin/unverified-drivers", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var unverified = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT d.driver_id, 
                   CONCAT(d.first_name, ' ', d.last_name) AS FullName, 
                   d.email, 
                   d.phone,
                   COALESCE(NULLIF(s.student_number, 'undefined'), CONCAT('DRV-', d.driver_id)) AS display_id
            FROM driver d
            LEFT JOIN student s ON d.email = s.email
            WHERE d.is_verified = 0;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            unverified.Add(new
            {
                driverId = Convert.ToInt32(reader["driver_id"]),
                fullName = reader["FullName"].ToString(),
                email = reader["email"].ToString(),
                studentNumber = reader["display_id"].ToString(),
                phone = reader["phone"] != DBNull.Value ? reader["phone"].ToString() : "N/A"
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Unverified drivers lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(unverified);
});

app.MapPost("/api/admin/verify-driver", async (VerifyActionRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = "UPDATE driver SET is_verified = 1 WHERE driver_id = @DriverId;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@DriverId", req.DriverId);

        int rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.BadRequest();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Verify driver failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// Helper model definition (Ensure this exists in your project scope)


// ---------------------------------------------------------
// 1. GET DRIVER DETAILS
// ---------------------------------------------------------
app.MapGet("/api/admin/drivers/{driverId:int}", async (int driverId, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT CONCAT(IFNULL(d.first_name, ''), ' ', IFNULL(d.last_name, '')) AS FullName, 
                   IFNULL(d.email, '') AS email, 
                   d.phone AS ContactNumber,
                   COALESCE(NULLIF(s.student_number, 'undefined'), CONCAT('DRV-', d.driver_id)) AS StudentNum,
                   da.VehicleMakeModel, 
                   da.RegistrationNumber,
                   da.SeatingCapacity, 
                   da.VehicleColor, 
                   da.LicenseImagePath,
                   da.RegistrationFilePath, 
                   da.ApplicationStatus
            FROM driver d
            LEFT JOIN student s ON d.email = s.email
            LEFT JOIN driverapplications da ON d.driver_id = da.driver_id
            WHERE d.driver_id = @DriverId 
            LIMIT 1;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@DriverId", driverId);

        using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            // Safe helper lambdas to handle DBNull
            string GetSafeString(string col) => reader[col] != DBNull.Value ? reader[col].ToString() : string.Empty;
            int GetSafeInt(string col) => reader[col] != DBNull.Value ? Convert.ToInt32(reader[col]) : 0;

            return Results.Ok(new
            {
                fullName = GetSafeString("FullName").Trim(),
                email = GetSafeString("email"),
                studentNumber = GetSafeString("StudentNum"),
                contactNumber = reader["ContactNumber"] != DBNull.Value ? reader["ContactNumber"].ToString() : "N/A",
                vehicleMakeModel = GetSafeString("VehicleMakeModel"),
                registrationNumber = GetSafeString("RegistrationNumber"),
                seatingCapacity = GetSafeInt("SeatingCapacity"),
                vehicleColor = GetSafeString("VehicleColor"),
                licenseImagePath = GetSafeString("LicenseImagePath"),
                registrationFilePath = GetSafeString("RegistrationFilePath"),
                applicationStatus = GetSafeString("ApplicationStatus")
            });
        }

        return Results.NotFound(new { message = $"No application or driver found with ID {driverId}." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Driver detail lookup failed: {ex}");
        return Results.Json(new { message = ex.Message, stackTrace = ex.StackTrace }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// 2. POST UPDATE STATUS
// ---------------------------------------------------------
app.MapPost("/api/admin/drivers/{driverId:int}/status", async (int driverId, DynamicStatusUpdate req, IConfiguration config) =>
{
    if (req == null || string.IsNullOrWhiteSpace(req.Status))
    {
        return Results.BadRequest(new { message = "Invalid request status supplied." });
    }

    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        // 1 = Approved, 0 = Rejected/Pending
        int isVerifiedValue = req.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase) ||
                              req.Status.Equals("Approve", StringComparison.OrdinalIgnoreCase) ? 1 : 0;

        // Fixed: join driverapplications on driver_id (DriverID), matching the GET query's key,
        // instead of email — email can be null/mismatched and silently drops the applications-table update.
        string updateQuery = @"
            UPDATE driver dr
            LEFT JOIN driverapplications da ON dr.driver_id = da.driver_id
            SET da.ApplicationStatus = @Status, 
                dr.is_verified = @IsVerified
            WHERE dr.driver_id = @DriverId;";

        using var command = new MySqlCommand(updateQuery, connection);
        command.Parameters.AddWithValue("@Status", req.Status);
        command.Parameters.AddWithValue("@IsVerified", isVerifiedValue);
        command.Parameters.AddWithValue("@DriverId", driverId);

        int rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0
            ? Results.Ok(new { success = true, message = $"Status updated to {req.Status}" })
            : Results.NotFound(new { success = false, message = "Driver ID not found." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Status update failed: {ex}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// DRIVER TRIP HISTORY (Admin Ratings "View Details")
// ---------------------------------------------------------
app.MapGet("/api/admin/drivers/{driverId:long}/trips", async (long driverId, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var trips = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT t.trip_id, t.departure_stop, t.destination_stop, t.departure_time, t.status,
                   r.rating, r.review
            FROM trip t
            LEFT JOIN trip_booking tb ON tb.trip_id = t.trip_id
            LEFT JOIN trip_review r ON r.booking_id = tb.booking_id
            WHERE t.driver_id = @DriverId
            ORDER BY t.departure_time DESC
            LIMIT 20;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@DriverId", driverId);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            trips.Add(new
            {
                tripId = Convert.ToInt64(reader["trip_id"]),
                departureStop = reader["departure_stop"].ToString(),
                destinationStop = reader["destination_stop"].ToString(),
                departureTime = reader["departure_time"] != DBNull.Value
                    ? Convert.ToDateTime(reader["departure_time"]).ToString("yyyy-MM-dd HH:mm")
                    : "",
                status = reader["status"].ToString(),
                rating = reader["rating"] != DBNull.Value ? Convert.ToInt32(reader["rating"]) : (int?)null,
                review = reader["review"] != DBNull.Value ? reader["review"].ToString() : null
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Driver trip history failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(trips);
});

// ---------------------------------------------------------
// ADMIN PROFILE
// ---------------------------------------------------------
app.MapGet("/api/admin/profile", async (string? email, IConfiguration config) => {
    if (string.IsNullOrEmpty(email))
    {
        email = "admin@getyourride.com";
    }

    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = "SELECT UserID, CONCAT(first_name, ' ', last_name) AS FullName, email, role FROM users WHERE email = @Email LIMIT 1;";
        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Email", email);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return Results.Ok(new
            {
                userId = Convert.ToInt32(reader["UserID"]),
                employeeId = $"ADMIN-{reader["UserID"]}",
                fullName = reader["FullName"].ToString(),
                email = reader["email"].ToString(),
                role = reader["role"].ToString()
            });
        }
        return Results.NotFound(new { message = "Admin user record not located." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Admin profile lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// SHUTTLE COORDINATOR FLEET ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/coordinator/shuttles", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var shuttles = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT v.vehicle_id, v.model, v.registration_number, v.capacity, v.driver_id, v.status,
                   COALESCE(CONCAT(d.first_name, ' ', d.last_name), 'Unassigned') AS DriverName
            FROM vehicle v
            LEFT JOIN driver d ON v.driver_id = d.driver_id
            WHERE v.status != 'Inactive' AND v.capacity >= 15
            ORDER BY v.vehicle_id DESC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            shuttles.Add(new
            {
                shuttleId = Convert.ToInt32(reader["vehicle_id"]),
                shuttleName = reader["model"].ToString(),
                licensePlate = reader["registration_number"].ToString(),
                capacity = Convert.ToInt32(reader["capacity"]),
                status = reader["status"].ToString(),
                driverId = reader["driver_id"] != DBNull.Value ? Convert.ToInt32(reader["driver_id"]) : (int?)null,
                driverName = reader["DriverName"].ToString()
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Shuttle fleet lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(shuttles);
});

app.MapPost("/api/coordinator/shuttles", async (ShuttleDto newShuttle, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"INSERT INTO vehicle (driver_id, registration_number, model, capacity, status)
                         VALUES (@DriverId, @Plate, @Name, @Capacity, @Status);";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@DriverId", newShuttle.DriverId.HasValue ? (object)newShuttle.DriverId.Value : DBNull.Value);
        command.Parameters.AddWithValue("@Name", newShuttle.ShuttleName);
        command.Parameters.AddWithValue("@Plate", newShuttle.LicensePlate);
        command.Parameters.AddWithValue("@Capacity", newShuttle.Capacity);
        command.Parameters.AddWithValue("@Status", string.IsNullOrEmpty(newShuttle.Status) ? "Active" : newShuttle.Status);

        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { success = true, message = "Shuttle successfully added to database." });
    }
    catch (MySqlException ex) when (ex.Number == 1062)
    {
        return Results.BadRequest(new { success = false, message = "A vehicle asset with this license plate already exists." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Add shuttle failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// PUT: Update an existing vehicle's details (including driver assignment)
app.MapPut("/api/coordinator/shuttles/{id:int}", async (int id, ShuttleDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            UPDATE vehicle
            SET driver_id = @DriverId,
                model = @Name,
                registration_number = @Plate,
                capacity = @Capacity,
                status = @Status
            WHERE vehicle_id = @Id;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@DriverId", req.DriverId.HasValue ? (object)req.DriverId.Value : DBNull.Value);
        command.Parameters.AddWithValue("@Name", req.ShuttleName);
        command.Parameters.AddWithValue("@Plate", req.LicensePlate);
        command.Parameters.AddWithValue("@Capacity", req.Capacity);
        command.Parameters.AddWithValue("@Status", string.IsNullOrEmpty(req.Status) ? "Active" : req.Status);

        int rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0 ? Results.Ok(new { success = true, message = "Shuttle updated successfully." }) : Results.NotFound();
    }
    catch (MySqlException ex) when (ex.Number == 1062)
    {
        return Results.BadRequest(new { success = false, message = "A vehicle asset with this license plate already exists." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Update shuttle failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// DELETE: Remove a vehicle from the fleet
app.MapDelete("/api/coordinator/shuttles/{id:int}", async (int id, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        // Get this vehicle's registration number so we can clear trip references too
        string regNumber = "";
        string lookupQuery = "SELECT registration_number FROM vehicle WHERE vehicle_id = @Id;";
        using (var lookupCmd = new MySqlCommand(lookupQuery, connection))
        {
            lookupCmd.Parameters.AddWithValue("@Id", id);
            var result = await lookupCmd.ExecuteScalarAsync();
            if (result != null) regNumber = result.ToString() ?? "";
        }

        if (!string.IsNullOrEmpty(regNumber))
        {
            // Delete trips that reference this vehicle (FK: fk_trip_vehicle)
            string clearTripsQuery = "DELETE FROM trip WHERE registration_number = @Reg;";
            using var clearTripsCmd = new MySqlCommand(clearTripsQuery, connection);
            clearTripsCmd.Parameters.AddWithValue("@Reg", regNumber);
            await clearTripsCmd.ExecuteNonQueryAsync();
        }

        string deleteQuery = "DELETE FROM vehicle WHERE vehicle_id = @Id;";
        using var deleteCmd = new MySqlCommand(deleteQuery, connection);
        deleteCmd.Parameters.AddWithValue("@Id", id);

        int rowsAffected = await deleteCmd.ExecuteNonQueryAsync();
        return rowsAffected > 0
            ? Results.Ok(new { success = true, message = "Shuttle removed successfully." })
            : Results.NotFound();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Delete shuttle failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// SHUTTLE COORDINATOR DRIVER ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/coordinator/drivers", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var drivers = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT d.driver_id, 
                   CONCAT(d.first_name, ' ', d.last_name) AS FullName, 
                   d.email, 
                   d.phone,
                   d.role,
                   s.student_number,
                   COALESCE(GROUP_CONCAT(v.model SEPARATOR ', '), 'Unassigned') AS ShuttleName
            FROM driver d
            LEFT JOIN student s ON d.email = s.email
            LEFT JOIN vehicle v ON d.driver_id = v.driver_id
            WHERE d.is_verified = 1 
              AND (d.role = 'SHUTTLE_DRIVER' OR d.role IS NULL OR d.role != 'STUDENT_DRIVER')
            GROUP BY d.driver_id, d.first_name, d.last_name, d.email, d.phone, d.role, s.student_number;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            drivers.Add(new
            {
                id = Convert.ToInt32(reader["driver_id"]),
                driverId = Convert.ToInt32(reader["driver_id"]),
                fullName = reader["FullName"].ToString(),
                email = reader["email"].ToString(),
                role = reader["role"] != DBNull.Value ? reader["role"].ToString() : "SHUTTLE_DRIVER",
                employeeId = $"DRV-{reader["driver_id"]}",
                studentNumber = reader["student_number"] != DBNull.Value ? reader["student_number"].ToString() : "N/A",
                assignedShuttle = reader["ShuttleName"] != DBNull.Value ? reader["ShuttleName"].ToString() : "Unassigned",
                contactNumber = reader["phone"] != DBNull.Value ? reader["phone"].ToString() : "N/A",
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

// GET single driver by ID
app.MapGet("/api/coordinator/drivers/{id:int}", async (int id, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT d.driver_id,
                   CONCAT(d.first_name, ' ', d.last_name) AS FullName,
                   d.email,
                   d.phone,
                   d.role,
                   s.student_number,
                   COALESCE(GROUP_CONCAT(v.model SEPARATOR ', '), 'Unassigned') AS ShuttleName
            FROM driver d
            LEFT JOIN student s ON d.email = s.email
            LEFT JOIN vehicle v ON d.driver_id = v.driver_id
            WHERE d.driver_id = @Id
            GROUP BY d.driver_id, d.first_name, d.last_name, d.email, d.phone, d.role, s.student_number
            LIMIT 1;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Id", id);
        using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return Results.Ok(new
            {
                id = Convert.ToInt32(reader["driver_id"]),
                driverId = Convert.ToInt32(reader["driver_id"]),
                fullName = reader["FullName"].ToString(),
                email = reader["email"].ToString(),
                role = reader["role"] != DBNull.Value ? reader["role"].ToString() : "SHUTTLE_DRIVER",
                employeeId = $"DRV-{reader["driver_id"]}",
                studentNumber = reader["student_number"] != DBNull.Value ? reader["student_number"].ToString() : "N/A",
                assignedShuttle = reader["ShuttleName"] != DBNull.Value ? reader["ShuttleName"].ToString() : "Unassigned",
                contactNumber = reader["phone"] != DBNull.Value ? reader["phone"].ToString() : "N/A",
                status = "Active"
            });
        }

        return Results.NotFound(new { message = $"Driver #{id} not found." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Single driver lookup failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// PUT: Update an existing driver's profile details
app.MapPut("/api/coordinator/drivers/{id:int}", async (int id, DriverUpsertDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string firstName = req.FullName;
        string lastName = "Driver";
        string[] nameParts = req.FullName.Trim().Split(' ', 2);
        if (nameParts.Length > 1) { firstName = nameParts[0]; lastName = nameParts[1]; }

        string query = @"UPDATE driver 
                         SET first_name = @First, last_name = @Last, email = @Email, phone = @Phone 
                         WHERE driver_id = @Id;";

        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@First", firstName);
        command.Parameters.AddWithValue("@Last", lastName);
        command.Parameters.AddWithValue("@Email", req.Email);
        command.Parameters.AddWithValue("@Phone", string.IsNullOrEmpty(req.Phone) ? (object)DBNull.Value : req.Phone);

        int rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.NotFound();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Update driver failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// POST: Create a new shuttle driver profile from the coordinator portal
app.MapPost("/api/coordinator/drivers", async (DriverUpsertDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string firstName = req.FullName;
        string lastName = "Driver";
        string[] nameParts = req.FullName.Trim().Split(' ', 2);
        if (nameParts.Length > 1) { firstName = nameParts[0]; lastName = nameParts[1]; }

        string insertQuery = @"
            INSERT INTO driver (first_name, last_name, email, phone, role, is_verified, join_date, password, total_trips)
            VALUES (@First, @Last, @Email, @Phone, 'SHUTTLE_DRIVER', 1, CURDATE(), 'Driver@GetYourRide2026', 0);";

        using var command = new MySqlCommand(insertQuery, connection);
        command.Parameters.AddWithValue("@First", firstName);
        command.Parameters.AddWithValue("@Last", lastName);
        command.Parameters.AddWithValue("@Email", req.Email);
        command.Parameters.AddWithValue("@Phone", string.IsNullOrEmpty(req.Phone) ? (object)DBNull.Value : req.Phone);

        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { success = true, message = "Driver added successfully." });
    }
    catch (MySqlException ex) when (ex.Number == 1062)
    {
        return Results.BadRequest(new { success = false, message = "A driver with this email already exists." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Add driver failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// DELETE: Remove a driver profile from the roster
app.MapDelete("/api/coordinator/drivers/{id:int}", async (int id, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Find every vehicle this driver owns
        var registrationNumbers = new List<string>();
        string vehicleLookupQuery = "SELECT registration_number FROM vehicle WHERE driver_id = @Id;";
        using (var lookupCmd = new MySqlCommand(vehicleLookupQuery, connection))
        {
            lookupCmd.Parameters.AddWithValue("@Id", id);
            using var reader = await lookupCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                registrationNumbers.Add(reader.GetString(0));
            }
        }

        // 2. Delete every trip that references this driver OR uses one of their vehicles
        string clearTripQuery = "DELETE FROM trip WHERE driver_id = @Id";
        if (registrationNumbers.Count > 0)
        {
            var placeholders = string.Join(",", registrationNumbers.Select((_, i) => $"@Reg{i}"));
            clearTripQuery += $" OR registration_number IN ({placeholders})";
        }
        clearTripQuery += ";";

        using (var clearTripCmd = new MySqlCommand(clearTripQuery, connection))
        {
            clearTripCmd.Parameters.AddWithValue("@Id", id);
            for (int i = 0; i < registrationNumbers.Count; i++)
            {
                clearTripCmd.Parameters.AddWithValue($"@Reg{i}", registrationNumbers[i]);
            }
            await clearTripCmd.ExecuteNonQueryAsync();
        }

        // 3. Now safe to delete the vehicles
        string clearVehicleQuery = "DELETE FROM vehicle WHERE driver_id = @Id;";
        using (var clearVehicleCmd = new MySqlCommand(clearVehicleQuery, connection))
        {
            clearVehicleCmd.Parameters.AddWithValue("@Id", id);
            await clearVehicleCmd.ExecuteNonQueryAsync();
        }

        // 4. Finally delete the driver
        string deleteQuery = "DELETE FROM driver WHERE driver_id = @Id;";
        using var deleteCmd = new MySqlCommand(deleteQuery, connection);
        deleteCmd.Parameters.AddWithValue("@Id", id);

        int rowsAffected = await deleteCmd.ExecuteNonQueryAsync();
        return rowsAffected > 0
            ? Results.Ok(new { success = true, message = "Driver and all associated vehicles/trips removed." })
            : Results.NotFound();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Delete driver failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// SHUTTLE STOPS / ROUTES
// ---------------------------------------------------------

// Raw stop list (used to populate departure/destination pickers directly)
app.MapGet("/api/coordinator/stops", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var stops = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = "SELECT stop_id, stop_name FROM shuttle_stop ORDER BY stop_name;";
        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            stops.Add(new
            {
                stopId = Convert.ToInt32(reader["stop_id"]),
                stopName = reader["stop_name"].ToString()
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Stops lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(stops);
});

// Route corridors (origin -> destination pairs), used by the "Select Route Path Corridor" dropdown
app.MapGet("/api/coordinator/routes", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var routes = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT 
                r.route_id, 
                s1.stop_name AS FromStop,
                s2.stop_name AS ToStop
            FROM routes r
            JOIN shuttle_stop s1 ON r.origin_stop_id = s1.stop_id
            JOIN shuttle_stop s2 ON r.destination_stop_id = s2.stop_id
            ORDER BY s1.stop_name ASC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            string fromStop = reader["FromStop"].ToString() ?? "";
            string toStop = reader["ToStop"].ToString() ?? "";

            routes.Add(new
            {
                routeId = Convert.ToInt32(reader["route_id"]),
                fromStop = fromStop,
                toStop = toStop,
                routeName = $"{fromStop} \u2192 {toStop}"
            });
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Routes lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }

    return Results.Ok(routes);
});

// ---------------------------------------------------------
// SHUTTLE COORDINATOR SCHEDULING ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/coordinator/schedules", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var schedules = new List<object>();

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT t.trip_id, t.departure_stop, t.destination_stop, t.departure_time, t.status,
                   COALESCE(v.model, 'Unassigned') AS ShuttleName,
                   COALESCE(CONCAT(d.first_name, ' ', d.last_name), 'Unassigned') AS DriverName
            FROM trip t
            LEFT JOIN vehicle v ON t.registration_number = v.registration_number
            LEFT JOIN driver d ON t.driver_id = d.driver_id
            WHERE t.trip_type = 'SHUTTLE'
            ORDER BY t.departure_time DESC;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var departureDateTime = Convert.ToDateTime(reader["departure_time"]);

            schedules.Add(new
            {
                tripId = Convert.ToInt32(reader["trip_id"]),
                scheduleId = Convert.ToInt32(reader["trip_id"]),
                routeName = $"{reader["departure_stop"]} \u2794 {reader["destination_stop"]}",
                departureTime = departureDateTime.ToString("HH:mm"),
                scheduleDate = departureDateTime.ToString("yyyy-MM-dd"),
                shuttleName = reader["ShuttleName"].ToString(),
                driverName = reader["DriverName"].ToString(),
                status = reader["status"].ToString()
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

// GET single schedule (for Edit modal)
app.MapGet("/api/coordinator/schedules/{id:int}", async (int id, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = @"
            SELECT
                trip_id,
                departure_stop,
                destination_stop,
                departure_time,
                driver_id,
                registration_number
            FROM trip
            WHERE trip_id = @Id;";

        using var cmd = new MySqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@Id", id);

        using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Results.NotFound();

        return Results.Ok(new
        {
            scheduleId = reader.GetInt32("trip_id"),
            fromStop = reader["departure_stop"].ToString(),
            toStop = reader["destination_stop"].ToString(),
            departureTime = Convert.ToDateTime(reader["departure_time"]).ToString("HH:mm"),
            scheduleDate = Convert.ToDateTime(reader["departure_time"]).ToString("yyyy-MM-dd"),
            driverID = Convert.ToInt32(reader["driver_id"]),
            registrationNumber = reader["registration_number"].ToString()
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Single schedule lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// POST: Create a new schedule. Accepts a RouteID and resolves From/To stop names server-side.
app.MapPost("/api/coordinator/schedules", async (ScheduleDirectDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string dateString = string.IsNullOrEmpty(req.ScheduleDate) ? DateTime.Today.ToString("yyyy-MM-dd") : req.ScheduleDate;
        string timeString = req.DepartureTime.Length == 5 ? req.DepartureTime + ":00" : req.DepartureTime;

        if (!DateTime.TryParse($"{dateString} {timeString}", out var departureDateTime))
        {
            return Results.BadRequest(new { success = false, message = "Invalid schedule date or time format." });
        }

        // Resolve From/To stop names from the selected route
        string fromLocation = "";
        string toLocation = "";
        string routeLookupQuery = @"
            SELECT s1.stop_name AS FromStop, s2.stop_name AS ToStop
            FROM routes r
            JOIN shuttle_stop s1 ON r.origin_stop_id = s1.stop_id
            JOIN shuttle_stop s2 ON r.destination_stop_id = s2.stop_id
            WHERE r.route_id = @RouteId LIMIT 1;";

        using (var routeCmd = new MySqlCommand(routeLookupQuery, connection))
        {
            routeCmd.Parameters.AddWithValue("@RouteId", req.RouteID);
            using var routeReader = await routeCmd.ExecuteReaderAsync();
            if (await routeReader.ReadAsync())
            {
                fromLocation = routeReader["FromStop"].ToString() ?? "";
                toLocation = routeReader["ToStop"].ToString() ?? "";
            }
        }

        if (string.IsNullOrEmpty(fromLocation) || string.IsNullOrEmpty(toLocation))
        {
            return Results.BadRequest(new { success = false, message = $"Could not locate a matching route for RouteID: '{req.RouteID}'." });
        }

        // Resolve vehicle registration number + capacity
        string regNumber = "";
        int capacity = 0;

        string vehicleQuery = "SELECT registration_number, capacity FROM vehicle WHERE vehicle_id = @VehId OR registration_number = @RegNum LIMIT 1;";
        using (var vehCmd = new MySqlCommand(vehicleQuery, connection))
        {
            int.TryParse(req.ShuttleID?.ToString() ?? "0", out int parsedId);
            vehCmd.Parameters.AddWithValue("@VehId", parsedId);
            vehCmd.Parameters.AddWithValue("@RegNum", req.ShuttleID?.ToString() ?? "");

            using var vehReader = await vehCmd.ExecuteReaderAsync();
            if (await vehReader.ReadAsync())
            {
                regNumber = vehReader["registration_number"].ToString() ?? "";
                capacity = Convert.ToInt32(vehReader["capacity"]);
            }
        }

        if (string.IsNullOrEmpty(regNumber))
        {
            return Results.BadRequest(new { success = false, message = $"Could not locate a matching vehicle asset for ID/Plate: '{req.ShuttleID}'." });
        }

        string insertQuery = @"
            INSERT INTO trip (driver_id, registration_number, trip_type, departure_stop, destination_stop,
                               departure_time, available_seats, price, status)
            VALUES (@DriverID, @RegNumber, 'SHUTTLE', @From, @To, @DepartureDateTime, @Seats, 0.00, 'SCHEDULED');";

        using var command = new MySqlCommand(insertQuery, connection);
        command.Parameters.AddWithValue("@From", fromLocation);
        command.Parameters.AddWithValue("@To", toLocation);
        command.Parameters.AddWithValue("@DepartureDateTime", departureDateTime);
        command.Parameters.AddWithValue("@RegNumber", regNumber);
        command.Parameters.AddWithValue("@Seats", capacity);
        command.Parameters.AddWithValue("@DriverID", req.DriverID);

        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { success = true, message = "Assignment recorded successfully." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"\n[Database Execution Failure]: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// PUT: Update an existing schedule. Same RouteID resolution as POST.
app.MapPut("/api/coordinator/schedules/{id:int}", async (int id, ScheduleDirectDto req, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        int.TryParse(req.ShuttleID?.ToString() ?? "0", out int parsedShuttleId);

        string vehicleQuery = "SELECT registration_number FROM vehicle WHERE vehicle_id = @Id";
        string registrationNumber = "";

        using (var vehicleCmd = new MySqlCommand(vehicleQuery, connection))
        {
            vehicleCmd.Parameters.AddWithValue("@Id", parsedShuttleId);
            var result = await vehicleCmd.ExecuteScalarAsync();
            if (result != null) registrationNumber = result.ToString() ?? "";
        }

        if (string.IsNullOrEmpty(registrationNumber))
        {
            return Results.BadRequest(new { success = false, message = $"Could not locate a matching vehicle asset for ID: '{req.ShuttleID}'." });
        }

        if (!DateTime.TryParse($"{req.ScheduleDate} {req.DepartureTime}", out var departure))
        {
            return Results.BadRequest(new { success = false, message = "Invalid schedule date or time format." });
        }

        // Resolve From/To stop names from the selected route
        string fromLocation = "";
        string toLocation = "";
        string routeLookupQuery = @"
            SELECT s1.stop_name AS FromStop, s2.stop_name AS ToStop
            FROM routes r
            JOIN shuttle_stop s1 ON r.origin_stop_id = s1.stop_id
            JOIN shuttle_stop s2 ON r.destination_stop_id = s2.stop_id
            WHERE r.route_id = @RouteId LIMIT 1;";

        using (var routeCmd = new MySqlCommand(routeLookupQuery, connection))
        {
            routeCmd.Parameters.AddWithValue("@RouteId", req.RouteID);
            using var routeReader = await routeCmd.ExecuteReaderAsync();
            if (await routeReader.ReadAsync())
            {
                fromLocation = routeReader["FromStop"].ToString() ?? "";
                toLocation = routeReader["ToStop"].ToString() ?? "";
            }
        }

        if (string.IsNullOrEmpty(fromLocation) || string.IsNullOrEmpty(toLocation))
        {
            return Results.BadRequest(new { success = false, message = $"Could not locate a matching route for RouteID: '{req.RouteID}'." });
        }

        string sql = @"
            UPDATE trip
            SET
                driver_id = @Driver,
                registration_number = @Plate,
                departure_stop = @From,
                destination_stop = @To,
                departure_time = @Time
            WHERE trip_id = @TripId;";

        using var cmd = new MySqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@Driver", req.DriverID);
        cmd.Parameters.AddWithValue("@Plate", registrationNumber);
        cmd.Parameters.AddWithValue("@From", fromLocation);
        cmd.Parameters.AddWithValue("@To", toLocation);
        cmd.Parameters.AddWithValue("@Time", departure);
        cmd.Parameters.AddWithValue("@TripId", id);

        int rowsAffected = await cmd.ExecuteNonQueryAsync();
        if (rowsAffected == 0) return Results.NotFound(new { success = false, message = "Schedule not found." });

        return Results.Ok(new { success = true });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Schedule update failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// DELETE: Remove a scheduled route
app.MapDelete("/api/coordinator/schedules/{id:int}", async (int id, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = "DELETE FROM trip WHERE trip_id = @Id;";
        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Id", id);

        int rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0
            ? Results.Ok(new { success = true })
            : Results.NotFound(new { success = false, message = "Schedule not found." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Delete schedule failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// COORDINATOR PROFILE
// ---------------------------------------------------------
app.MapGet("/api/coordinator/profile", async (string? email, IConfiguration config) => {
    if (string.IsNullOrEmpty(email))
    {
        email = "coordinator@shuttle.nmu.ac.za";
    }

    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string query = "SELECT UserID, CONCAT(first_name, ' ', last_name) AS FullName, email, role FROM users WHERE email = @Email OR role = 'COORDINATOR' LIMIT 1;";
        using var command = new MySqlCommand(query, connection);
        command.Parameters.AddWithValue("@Email", email);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return Results.Ok(new
            {
                userId = Convert.ToInt32(reader["UserID"]),
                employeeId = $"COORD-{reader["UserID"]}",
                fullName = reader["FullName"].ToString(),
                email = reader["email"].ToString(),
                role = reader["role"].ToString()
            });
        }
        return Results.NotFound(new { message = "Coordinator user record not located." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Coordinator profile lookup failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// ADMIN: DIRECT DRIVER UPSERT (student-driver style, used elsewhere in the app)
// ---------------------------------------------------------
app.MapPost("/api/admin/drivers/upsert", async (DriverUpsertDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string firstName = req.FullName;
        string lastName = "Driver";

        string[] nameParts = req.FullName.Trim().Split(' ', 2);
        if (nameParts.Length > 1)
        {
            firstName = nameParts[0];
            lastName = nameParts[1];
        }

        string insertQuery = @"
            INSERT INTO driver (first_name, last_name, email, phone, role, is_verified, join_date, password, total_trips)
            VALUES (@First, @Last, @Email, @Phone, 'STUDENT_DRIVER', 1, CURDATE(), '1234', 0);";

        using var command = new MySqlCommand(insertQuery, connection);
        command.Parameters.AddWithValue("@First", firstName);
        command.Parameters.AddWithValue("@Last", lastName);
        command.Parameters.AddWithValue("@Email", req.Email);
        command.Parameters.AddWithValue("@Phone", string.IsNullOrEmpty(req.Phone) ? (object)DBNull.Value : req.Phone);

        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { success = true, message = "Driver saved successfully." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Driver upsert failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// FORGOT/RESET PASSWORD ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/Forgot.html", () => Results.File(Path.Combine(Directory.GetCurrentDirectory(), "Forgot.html"), "text/html"));

app.MapPost("/api/auth/forgot-password", async (ForgotPasswordRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string[] tables = { "users", "driver", "student" };
        string token = Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
        bool found = false;

        foreach (var table in tables)
        {
            string checkQuery = $"SELECT 1 FROM `{table}` WHERE email = @Email LIMIT 1;";
            using var checkCmd = new MySqlCommand(checkQuery, connection);
            checkCmd.Parameters.AddWithValue("@Email", req.Email);
            var exists = await checkCmd.ExecuteScalarAsync();

            if (exists != null)
            {
                found = true;
                string updateTokenQuery = $"UPDATE `{table}` SET reset_token = @Token WHERE email = @Email;";
                using var updateCmd = new MySqlCommand(updateTokenQuery, connection);
                updateCmd.Parameters.AddWithValue("@Token", token);
                updateCmd.Parameters.AddWithValue("@Email", req.Email);
                await updateCmd.ExecuteNonQueryAsync();
                break;
            }
        }

        if (found)
        {
            Console.WriteLine("\n==========================================");
            Console.WriteLine($"[EMAIL SIMULATOR] To reset password, open:");
            Console.WriteLine($"http://localhost:5000/reset-password.html?token={token}&email={req.Email}");
            Console.WriteLine("==========================================\n");
        }

        return Results.Ok(new { success = true });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Forgot password failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});
// ---------------------------------------------------------
// ADMIN DASHBOARD SUMMARY (for dashboard-home.html's stats row)
// Drop this into the "ADMIN DASHBOARD ENDPOINTS" section of
// Program.cs, alongside /api/admin/driver-ratings etc.
// ---------------------------------------------------------
app.MapGet("/api/admin/dashboard/summary", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        // Single round trip: one row with four subquery columns.
        //  - PendingApplications: drivers not yet verified (mirrors /api/admin/unverified-drivers)
        //  - ActiveDrivers: verified, non-student-driver drivers (mirrors /api/admin/driver-ratings)
        //  - AverageRating: overall average across all trip_review rows
        //  - TripsToday: trips whose departure_time falls on today's date
        string query = @"
            SELECT
                (SELECT COUNT(*) FROM driver WHERE is_verified = 0) AS PendingApplications,
                (SELECT COUNT(*) FROM driver
                    WHERE is_verified = 1
                      AND (role = 'SHUTTLE_DRIVER' OR role IS NULL OR role != 'STUDENT_DRIVER')) AS ActiveDrivers,
                (SELECT COALESCE(AVG(rating), 0.0) FROM trip_review) AS AverageRating,
                (SELECT COUNT(*) FROM trip WHERE DATE(departure_time) = CURDATE()) AS TripsToday;";

        using var command = new MySqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return Results.Ok(new
            {
                pendingApplications = Convert.ToInt32(reader["PendingApplications"]),
                activeDrivers = Convert.ToInt32(reader["ActiveDrivers"]),
                averageRating = Math.Round(Convert.ToDouble(reader["AverageRating"]), 2),
                tripsToday = Convert.ToInt32(reader["TripsToday"])
            });
        }

        // Should never happen (the query always returns exactly one row), but keep the
        // frontend's placeholder fallback working if it somehow does.
        return Results.Ok(new { pendingApplications = 0, activeDrivers = 0, averageRating = (double?)null, tripsToday = 0 });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Dashboard summary failed: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.MapPost("/api/auth/reset-password", async (ResetPasswordRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    try
    {
        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string[] tables = { "users", "driver", "student" };
        int totalRowsAffected = 0;

        foreach (var table in tables)
        {
            string resetQuery = $"UPDATE `{table}` SET password = @NewPassword, reset_token = NULL WHERE reset_token = @Token;";
            using var command = new MySqlCommand(resetQuery, connection);
            command.Parameters.AddWithValue("@NewPassword", req.NewPassword);
            command.Parameters.AddWithValue("@Token", req.Token);
            totalRowsAffected += await command.ExecuteNonQueryAsync();
        }

        if (totalRowsAffected > 0)
        {
            return Results.Ok(new { success = true, message = "Password updated successfully." });
        }
        return Results.BadRequest(new { success = false, message = "Invalid or expired reset token." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[API Error] Reset password failed: {ex.Message}");
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

app.Run();

// ---------------------------------------------------------
// DATA TRANSFER RECORDS (DTOs) & REQUESTS
// ---------------------------------------------------------
public record LoginRequest(string Email, string Password);
public record VerifyActionRequest(int DriverId);
public record DynamicStatusUpdate(string Status);
public record ShuttleDto(int? DriverId, string ShuttleName, string LicensePlate, int Capacity, string? Status);
public record DriverUpsertDto(string FullName, string Email, string? Phone);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);

// Accepts RouteID instead of raw FromStop/ToStop text — the server resolves
// the stop names from the routes table so the frontend only needs to send an ID.
public class ScheduleDirectDto
{
    public int RouteID { get; set; }
    public string? ScheduleDate { get; set; }
    public string DepartureTime { get; set; } = "";
    public object? ShuttleID { get; set; }
    public int DriverID { get; set; }
}