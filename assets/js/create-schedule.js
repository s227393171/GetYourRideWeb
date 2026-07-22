document.addEventListener("DOMContentLoaded", async () => {
    // 1. FIX: Use a relative path so it automatically routes to port 7276 seamlessly
    const apiBaseUrl = "/api/coordinator";

    // DOM Target Handles (Kept exactly as per your HTML)
    const routeSelect = document.getElementById("ddlRouteAsset");
    const shuttleSelect = document.getElementById("ddlShuttleAsset");
    const driverSelect = document.getElementById("ddlDriverAsset");
    const scheduleForm = document.getElementById("frmCreateSchedule");

    // 1. Fetch lookups from database on load to populate dropdown options
    async function populateDropdowns() {
        try {
            const [routesRes, shuttlesRes, driversRes] = await Promise.all([
                fetch(`${apiBaseUrl}/routes`),
                fetch(`${apiBaseUrl}/shuttles`),
                fetch(`${apiBaseUrl}/drivers`)
            ]);

            const routes = await routesRes.json();
            const shuttles = await shuttlesRes.json();
            const drivers = await driversRes.json();

            // FIX: Map using 'routeName' based on backend response structure
            routeSelect.innerHTML = routes.map(r =>
                `<option value="${r.routeName}">${r.routeName}</option>`
            ).join('');

            // FIX: Map using 'shuttleId', 'shuttleName', and 'licensePlate' from backend
            shuttleSelect.innerHTML = shuttles.map(s =>
                `<option value="${s.shuttleId}">${s.shuttleName} (${s.licensePlate})</option>`
            ).join('');

            // FIX: Map using 'driverId' and 'fullName' from backend
            driverSelect.innerHTML = drivers.map(d =>
                `<option value="${d.driverId}">${d.fullName}</option>`
            ).join('');

        } catch (error) {
            console.error("Failed to load form dropdown assets from server:", error);
            alert("Error communicating with database server. Please check your backend connection.");
        }
    }

    // 2. Handle Form Submission to Database Connection
    scheduleForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Validate that fields actually have selections before preparing payload
        if (!routeSelect.value || !shuttleSelect.value || !driverSelect.value) {
            alert("Please ensure all dropdown fields are populated before saving.");
            return;
        }

        // FIX: Match the exact PascalCase keys expected by C#'s ScheduleDirectDto record
        const payload = {
            RouteName: routeSelect.value, // Backend splits text string via arrows (➔)
            ScheduleDate: document.getElementById("txtScheduleDate").value,
            DepartureTime: document.getElementById("txtDepartureTime").value,
            ShuttleID: parseInt(shuttleSelect.value, 10),
            DriverID: parseInt(driverSelect.value, 10)
        };

        try {
            const response = await fetch(`${apiBaseUrl}/schedules`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert("🎉 Fleet route dispatch successfully created!");
                // Cleanly bounce back to your dashboard overview page
                window.location.href = "schedule-shuttles.html";
            } else {
                alert(`Failed to save dispatch allocation: ${result.message || "Unknown error occurred."}`);
            }
        } catch (error) {
            console.error("Network communication drop:", error);
            alert("Could not process submit packet. Confirm backend server connectivity.");
        }
    });

    // Run lookups initialization immediately
    populateDropdowns();
});