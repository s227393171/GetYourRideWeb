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
});

// ---------------------------------------------------------
// DRIVER PORTAL ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/driver/profile", async (string email, IConfiguration config) =>
{
    if (string.IsNullOrEmpty(email)) email = "thabo.nkosi@shuttle.nmu.ac.za";

    string connectionString = config.GetConnectionString("DefaultConnection");
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
});

// Bookings for the trips this driver runs. Pass ?email=driver@example.com
app.MapGet("/api/driver/bookings", async (string? email, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var bookings = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
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
    var drivers = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT d.driver_id,
               CONCAT(d.first_name, ' ', d.last_name) AS FullName,
               d.join_date,
               d.total_trips,
               COALESCE(AVG(tr.rating), 0) AS AverageRating,
               COUNT(tr.review_id) AS TotalRatingsCount
        FROM driver d
        LEFT JOIN trip t ON t.driver_id = d.driver_id
        LEFT JOIN trip_booking tb ON tb.trip_id = t.trip_id
        LEFT JOIN trip_review tr ON tr.booking_id = tb.booking_id
        WHERE d.is_verified = 1
        GROUP BY d.driver_id, d.first_name, d.last_name, d.join_date, d.total_trips
        ORDER BY AverageRating DESC;";

    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        drivers.Add(new
        {
            FullName = reader["FullName"].ToString(),
            JoinDateText = reader["join_date"] != DBNull.Value ? Convert.ToDateTime(reader["join_date"]).ToString("MMM yyyy") : "",
            AverageRating = Math.Round(Convert.ToDouble(reader["AverageRating"]), 2),
            TotalTrips = Convert.ToInt32(reader["total_trips"]),
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
        SELECT driver_id, CONCAT(first_name, ' ', last_name) AS FullName, email, phone
        FROM driver
        WHERE is_verified = 0;";

    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        unverified.Add(new
        {
            DriverId = Convert.ToInt32(reader["driver_id"]),
            FullName = reader["FullName"].ToString(),
            Email = reader["email"].ToString(),
            Phone = reader["phone"] != DBNull.Value ? reader["phone"].ToString() : "N/A"
        });
    }
    return Results.Ok(unverified);
});

app.MapPost("/api/admin/verify-driver", async (VerifyActionRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = "UPDATE driver SET is_verified = 1 WHERE driver_id = @DriverId;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@DriverId", req.DriverId);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.BadRequest();
});

app.MapGet("/api/admin/drivers/{driverId:int}", async (int driverId, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT CONCAT(d.first_name, ' ', d.last_name) AS FullName, d.email, d.phone AS ContactNumber,
               da.VehicleMakeModel, da.RegistrationNumber,
               da.SeatingCapacity, da.VehicleColor, da.LicenseImagePath,
               da.RegistrationFilePath, da.ApplicationStatus
        FROM driver d
        INNER JOIN driverapplications da ON d.driver_id = da.DriverID
        WHERE d.driver_id = @DriverId LIMIT 1;";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@DriverId", driverId);

    using var reader = await command.ExecuteReaderAsync();

    if (await reader.ReadAsync())
    {
        return Results.Ok(new
        {
            fullName = reader["FullName"].ToString(),
            email = reader["email"].ToString(),
            contactNumber = reader["ContactNumber"] != DBNull.Value ? reader["ContactNumber"].ToString() : "",
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

app.MapPost("/api/admin/drivers/{driverId:int}/status", async (int driverId, DynamicStatusUpdate req, IConfiguration config) =>
{
    string connectionString = config.GetConnectionString("DefaultConnection");

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    int isVerifiedValue = req.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase) ? 1 : 0;

    string updateQuery = @"
        UPDATE driver dr
        INNER JOIN driverapplications da ON dr.driver_id = da.DriverID
        SET da.ApplicationStatus = @Status, dr.is_verified = @IsVerified
        WHERE dr.driver_id = @DriverId;";

    using var command = new MySqlCommand(updateQuery, connection);
    command.Parameters.AddWithValue("@Status", req.Status);
    command.Parameters.AddWithValue("@IsVerified", isVerifiedValue);
    command.Parameters.AddWithValue("@DriverId", driverId);

    int rowsAffected = await command.ExecuteNonQueryAsync();
    return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.BadRequest();
});

// ---------------------------------------------------------
// SHUTTLE COORDINATOR FLEET ENDPOINTS
// ---------------------------------------------------------
// UPDATED GET: Filters out 'Inactive' soft-deleted vehicles from layout
app.MapGet("/api/coordinator/shuttles", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var shuttles = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT v.vehicle_id, v.model, v.registration_number, v.capacity, v.driver_id, v.status,
               COALESCE(CONCAT(d.first_name, ' ', d.last_name), 'Unassigned') AS DriverName
        FROM vehicle v
        LEFT JOIN driver d ON v.driver_id = d.driver_id
        WHERE v.status != 'Inactive'
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
    return Results.Ok(shuttles);
});

app.MapPost("/api/coordinator/shuttles", async (ShuttleDto newShuttle, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"INSERT INTO vehicle (driver_id, registration_number, model, capacity, status)
                     VALUES (@DriverId, @Plate, @Name, @Capacity, @Status);";

    using var command = new MySqlCommand(query, connection);
    command.Parameters.AddWithValue("@DriverId", newShuttle.DriverId);
    command.Parameters.AddWithValue("@Name", newShuttle.ShuttleName);
    command.Parameters.AddWithValue("@Plate", newShuttle.LicensePlate);
    command.Parameters.AddWithValue("@Capacity", newShuttle.Capacity);
    command.Parameters.AddWithValue("@Status", string.IsNullOrEmpty(newShuttle.Status) ? "Active" : newShuttle.Status);

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

// PUT: Update an existing driver's profile details
app.MapPut("/api/coordinator/drivers/{id:int}", async (int id, DriverUpsertDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
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
});

// DELETE: Remove a driver profile from the roster
app.MapDelete("/api/coordinator/drivers/{id:int}", async (int id, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    // Set foreign key references in vehicle table to NULL first so it doesn't crash
    string clearVehicleQuery = "UPDATE vehicle SET driver_id = NULL WHERE driver_id = @Id;";
    using var clearCmd = new MySqlCommand(clearVehicleQuery, connection);
    clearCmd.Parameters.AddWithValue("@Id", id);
    await clearCmd.ExecuteNonQueryAsync();

    string deleteQuery = "DELETE FROM driver WHERE driver_id = @Id;";
    using var deleteCmd = new MySqlCommand(deleteQuery, connection);
    deleteCmd.Parameters.AddWithValue("@Id", id);

    int rowsAffected = await deleteCmd.ExecuteNonQueryAsync();
    return rowsAffected > 0 ? Results.Ok(new { success = true }) : Results.NotFound();
});
// "Routes" aren't a table -- they're derived from the distinct departure/destination pairs
app.MapGet("/api/coordinator/routes", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var routes = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT ROW_NUMBER() OVER (ORDER BY departure_stop, destination_stop) AS RouteID,
               departure_stop, destination_stop
        FROM (SELECT DISTINCT departure_stop, destination_stop FROM trip WHERE trip_type = 'SHUTTLE') AS r;";
    using var command = new MySqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        routes.Add(new
        {
            routeId = Convert.ToInt32(reader["RouteID"]),
            routeName = $"{reader["departure_stop"]} ➔ {reader["destination_stop"]}"
        });
    }
    return Results.Ok(routes);
});

// ---------------------------------------------------------
// SHUTTLE COORDINATOR SCHEDULING ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/api/coordinator/schedules", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var schedules = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
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
                scheduleId = Convert.ToInt32(reader["trip_id"]),
                routeName = $"{reader["departure_stop"]} ➔ {reader["destination_stop"]}",
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

app.MapGet("/api/coordinator/drivers", async (IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    var drivers = new List<object>();

    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    try
    {
        string query = @"
            SELECT d.driver_id, 
                   CONCAT(d.first_name, ' ', d.last_name) AS FullName, 
                   d.email, 
                   d.phone,
                   s.student_number,
                   COALESCE(GROUP_CONCAT(v.model SEPARATOR ', '), 'Unassigned') AS ShuttleName
            FROM driver d
            LEFT JOIN student s ON d.email = s.email
            LEFT JOIN vehicle v ON d.driver_id = v.driver_id
            WHERE d.is_verified = 1
            GROUP BY d.driver_id, d.first_name, d.last_name, d.email, d.phone, s.student_number;";

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

app.MapPost("/api/coordinator/schedules", async (ScheduleDirectDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
    using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();

    string incoming = req.RouteName ?? "";
    string[] separators = new string[] { "→", "➔", "->", "-" };
    string[] locations = incoming.Split(separators, StringSplitOptions.RemoveEmptyEntries);

    string fromLocation = locations.Length > 0 ? locations[0].Trim() : incoming.Trim();
    string toLocation = locations.Length > 1 ? locations[1].Trim() : "";

    string dateString = string.IsNullOrEmpty(req.ScheduleDate) ? DateTime.Today.ToString("yyyy-MM-dd") : req.ScheduleDate;
    string timeString = req.DepartureTime.Length == 5 ? req.DepartureTime + ":00" : req.DepartureTime;

    if (!DateTime.TryParse($"{dateString} {timeString}", out var departureDateTime))
    {
        return Results.BadRequest(new { success = false, message = "Invalid schedule date or time format." });
    }

    string regNumber = "";
    int capacity = 0;

    // Fixed query logic template parameters
    string vehicleQuery = "SELECT registration_number, capacity FROM vehicle WHERE vehicle_id = @VehId OR registration_number = @RegNum LIMIT 1;";
    using (var vehCmd = new MySqlCommand(vehicleQuery, connection))
    {
        int.TryParse(req.ShuttleID.ToString(), out int parsedId);
        vehCmd.Parameters.AddWithValue("@VehId", parsedId);
        vehCmd.Parameters.AddWithValue("@RegNum", req.ShuttleID.ToString());

        using var vehReader = await vehCmd.ExecuteReaderAsync();
        if (await vehReader.ReadAsync())
        {
            regNumber = vehReader["registration_number"].ToString();
            capacity = Convert.ToInt32(vehReader["capacity"]);
        }
    }

    if (string.IsNullOrEmpty(regNumber))
    {
        return Results.BadRequest(new { success = false, message = $"Could not locate a matching vehicle asset for ID/Plate: '{req.ShuttleID}'." });
    }

    try
    {
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

app.MapGet("/api/coordinator/profile", async (string email, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
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
            employeeId = $"COORD-{reader["UserID"]}",
            fullName = reader["FullName"].ToString(),
            email = reader["email"].ToString(),
            role = reader["role"].ToString()
        });
    }
    return Results.NotFound(new { message = "Coordinator user record not located." });
});

app.MapPost("/api/admin/drivers/upsert", async (DriverUpsertDto req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
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

    try
    {
        await command.ExecuteNonQueryAsync();
        return Results.Ok(new { success = true, message = "Driver saved successfully." });
    }
    catch (Exception ex)
    {
        return Results.Json(new { success = false, message = ex.Message }, statusCode: 500);
    }
});

// ---------------------------------------------------------
// FORGOT/RESET PASSWORD ENDPOINTS
// ---------------------------------------------------------
app.MapGet("/Forgot.html", () => Results.File(Path.Combine(Directory.GetCurrentDirectory(), "Forgot.html"), "text/html"));

app.MapPost("/api/auth/forgot-password", async (ForgotPasswordRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
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
});

app.MapPost("/api/auth/reset-password", async (ResetPasswordRequest req, IConfiguration config) => {
    string connectionString = config.GetConnectionString("DefaultConnection");
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
});

app.Run();

// ---------------------------------------------------------
// DATA TRANSFER RECORDS (DTOs) & REQUESTS
// ---------------------------------------------------------
public record LoginRequest(string Email, string Password);
public record VerifyActionRequest(int DriverId);
public record DynamicStatusUpdate(string Status);
public record ShuttleDto(int? DriverId, string ShuttleName, string LicensePlate, int Capacity, string? Status);
public record ScheduleDirectDto(string RouteName, string DepartureTime, string ScheduleDate, object ShuttleID, int DriverID);
public record DriverUpsertDto(string FullName, string Email, string? Phone);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);