// Email is sent through Brevo's transactional email HTTP API (https://api.brevo.com/v3/smtp/email).
// No SMTP authentication is used, so a mailbox with SMTP auth disabled (e.g. the university
// Outlook account) is no longer required.
//
// Configuration:
//   appsettings.json  -> "Email": { "SenderName": "...", "SenderAddress": "..." }
//   User Secrets / env -> "Brevo:ApiKey" (NEVER commit the key to source control)

using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using MySqlConnector;

// ---- Settings (filled from the "Email" section of configuration) -----------------------
public class EmailSettings
{
    // The sender must be a verified sender in your Brevo account.
    public string SenderName { get; set; } = "GetYourRide";
    public string SenderAddress { get; set; } = "";
}

// Holds the Brevo API key, bound from the "Brevo" configuration section.
// The key itself lives in User Secrets or an environment variable, never in appsettings.json.
public class BrevoSettings
{
    public string ApiKey { get; set; } = "";
}

// ---- Generic email sender ----------------------------------------------------------------
public interface IEmailService
{
    Task SendAsync(string toEmail, string toName, string subject, string htmlBody, string textBody);
}

// ---- Brevo implementation ----------------------------------------------------------------
public class EmailService : IEmailService
{
    private readonly HttpClient _http;
    private readonly EmailSettings _settings;
    private readonly string _apiKey;

    public EmailService(HttpClient http, IOptions<EmailSettings> emailOptions, IOptions<BrevoSettings> brevoOptions)
    {
        _http = http;
        _settings = emailOptions.Value;
        _apiKey = brevoOptions.Value.ApiKey ?? "";
    }

    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody, string textBody)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            throw new InvalidOperationException("Brevo API key is not configured. Set 'Brevo:ApiKey' in User Secrets or an environment variable.");

        if (string.IsNullOrWhiteSpace(_settings.SenderAddress))
            throw new InvalidOperationException("Sender address is not configured. Set 'Email:SenderAddress' to a verified Brevo sender.");

        // Request body shaped per Brevo's POST /v3/smtp/email contract.
        var payload = new
        {
            sender = new { name = _settings.SenderName, email = _settings.SenderAddress },
            to = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
            subject,
            htmlContent = htmlBody,
            textContent = textBody
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.TryAddWithoutValidation("api-key", _apiKey);
        request.Headers.TryAddWithoutValidation("accept", "application/json");
        request.Content = JsonContent.Create(payload);

        using var response = await _http.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            // Read Brevo's error body for diagnostics. This body never contains the API key.
            string detail = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"Brevo API returned {(int)response.StatusCode} {response.StatusCode}: {detail}");
        }
    }
}

// ---- Builds and sends the rejection email, then records that the driver was notified -----
public class DriverNotifier
{
    private readonly IEmailService _email;
    private readonly string _connectionString;

    public DriverNotifier(IEmailService email, IConfiguration config)
    {
        _email = email;
        _connectionString = config.GetConnectionString("DefaultConnection") ?? "";
    }

    // Returns true if the email was sent. A failed email never undoes the rejection.
    public async Task<bool> NotifyRejectedAsync(int driverId, string reason)
    {
        try
        {
            await using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            string? firstName = null, email = null;
            bool alreadyNotified = false;

            var lookup = new MySqlCommand(
                "SELECT d.first_name, d.email, " +
                "       COALESCE((SELECT x.driver_notified FROM driverapplications x " +
                "                 WHERE x.driver_id = d.driver_id AND x.application_status = 'Rejected' " +
                "                 ORDER BY x.ApplicationID DESC LIMIT 1), 0) AS notified " +
                "FROM driver d WHERE d.driver_id = @id", conn);
            lookup.Parameters.AddWithValue("@id", driverId);
            await using (var r = await lookup.ExecuteReaderAsync())
            {
                if (!await r.ReadAsync()) return false;
                firstName = r.GetString("first_name");
                email = r.GetString("email");
                alreadyNotified = Convert.ToInt32(r["notified"]) == 1;
            }

            // Avoid duplicate notifications: if we already emailed this rejection, do nothing.
            if (alreadyNotified) return true;

            var safeName = WebUtility.HtmlEncode(firstName);
            var safeReason = WebUtility.HtmlEncode(reason);

            var html = $@"
<div style=""font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1e293b;"">
  <h2 style=""color:#f97316;margin-bottom:4px;"">GetYourRide</h2>
  <p>Hi {safeName},</p>
  <p>Thank you for applying to drive with GetYourRide. After reviewing your application,
     we couldn't approve it yet.</p>
  <div style=""background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:6px;margin:16px 0;"">
    <strong>Reason:</strong><br/>{safeReason}
  </div>
  <p><strong>What to do next:</strong> open the GetYourRide app, go to <em>Application Status</em>,
     fix the issue above (for example, upload a clearer document) and submit again.
     Your details are saved, so it only takes a minute.</p>
  <p style=""color:#64748b;font-size:13px;"">If you think this is a mistake, reply to this email and we'll look into it.</p>
</div>";

            var text =
$@"Hi {firstName},

Thank you for applying to drive with GetYourRide. After reviewing your application, we couldn't approve it yet.

Reason: {reason}

What to do next: open the GetYourRide app, go to Application Status, fix the issue above (for example, upload a clearer document) and submit again. Your details are saved, so it only takes a minute.

If you think this is a mistake, reply to this email and we'll look into it.

The GetYourRide Team";

            await _email.SendAsync(email!, firstName!, "Update on your GetYourRide driver application", html, text);

            var mark = new MySqlCommand(
                "UPDATE driverapplications SET driver_notified = 1 WHERE driver_id = @id AND application_status = 'Rejected'", conn);
            mark.Parameters.AddWithValue("@id", driverId);
            await mark.ExecuteNonQueryAsync();

            return true;
        }
        catch (Exception ex)
        {
            // Log without leaking the API key or any secret. The exception messages above
            // intentionally contain only Brevo's HTTP status/body, never the key.
            Console.WriteLine($"[API Error] Rejection email failed: {ex.Message}");
            return false;
        }
    }
}
