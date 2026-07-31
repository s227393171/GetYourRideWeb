const COORDINATOR_PROFILE_API_URL = '/api/coordinator/profile';
window.activeCoordinatorProfile = null;

// Clean loading lifecycle hooks
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 GetYourRide Scheduler System Initialized.");
    loadCoordinatorProfile();
    loadSchedulesTable();
    populateFormDropdowns();
});

// ==========================================================================
// EXPLICIT HTML MODAL CONTROLLERS
// ==========================================================================
window.openScheduleModalContainer = function () {
    console.log("🎯 Form window requested.");
    const modal = document.getElementById("scheduleModal");
    if (modal) {
        document.getElementById("frmScheduleAsset")?.reset();
        modal.style.setProperty("display", "flex", "important");
    }
};

window.closeScheduleModalContainer = function () {
    const modal = document.getElementById("scheduleModal");
    if (modal) {
        modal.style.setProperty("display", "none", "important");
    }
};

// ==========================================================================
// DATA FETCHERS & DROPDOWNS (MAPPED TO YOUR PROGRAM.CS OBJECTS)
// ==========================================================================
async function populateFormDropdowns() {
    // 1. Load Routes
    try {
        const res = await fetch("/api/coordinator/routes");
        if (res.ok) {
            const routes = await res.json();
            document.getElementById("ddlRouteAsset").innerHTML =
                `<option value="">-- Select Route Corridor --</option>` +
                routes.map(r => {
                    const name = r.routeName || r.RouteName || `${r.fromStop || ''} -> ${r.toStop || ''}`;
                    return `<option value="${name}">${name}</option>`;
                }).join('');
        }
    } catch (err) { console.error("Routes display processing error:", err); }

    // 2. Load Shuttles
    try {
        const res = await fetch("/api/coordinator/shuttles");
        if (res.ok) {
            const shuttles = await res.json();
            document.getElementById("ddlShuttleAsset").innerHTML =
                `<option value="">-- Select Vehicle Asset --</option>` +
                shuttles.map(s => {
                    const id = s.shuttleId ?? s.shuttleID ?? s.vehicleId ?? s.id;
                    const name = s.shuttleName || s.vehicleName || "Shuttle";
                    const plate = s.licensePlate || s.registrationNumber || "";
                    return `<option value="${id}">${name} (${plate})</option>`;
                }).join('');
        }
    } catch (err) { console.error("Shuttles drop-down parsing error:", err); }

    // 3. Load Drivers (Filters out student drivers if backend returns role)
    try {
        const res = await fetch("/api/coordinator/drivers");
        if (res.ok) {
            let drivers = await res.json();

            // Filter to shuttle drivers only if role exists
            if (drivers.length > 0 && drivers[0].role) {
                drivers = drivers.filter(d => d.role === "SHUTTLE_DRIVER");
            }

            document.getElementById("ddlDriverAsset").innerHTML =
                `<option value="">-- Select Roster Operator --</option>` +
                drivers.map(d => {
                    const id = d.driverId ?? d.driverID ?? d.id;
                    const name = d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim();
                    return `<option value="${id}">${name}</option>`;
                }).join('');
        }
    } catch (err) { console.error("Drivers collection loading error:", err); }
}

// ==========================================================================
// TRANSACTION FORM SUBMISSION HANDLER
// ==========================================================================
window.handleScheduleFormSubmit = async function (e) {
    e.preventDefault();

    const routeSelect = document.getElementById("ddlRouteAsset");
    const shuttleSelect = document.getElementById("ddlShuttleAsset");
    const driverSelect = document.getElementById("ddlDriverAsset");
    const rawDate = document.getElementById("txtScheduleDate").value;
    const rawTime = document.getElementById("txtDepartureTime").value;

    if (!routeSelect.value || !shuttleSelect.value || !driverSelect.value || !rawDate || !rawTime) {
        alert("Please complete all configuration fields before saving.");
        return;
    }

    const shuttleId = parseInt(shuttleSelect.value);
    const driverId = parseInt(driverSelect.value);

    if (isNaN(shuttleId) || isNaN(driverId)) {
        alert("Invalid Shuttle or Driver selection.");
        return;
    }

    // Split "2nd Avenue -> Forest Hill" into FromStop and ToStop
    const routeParts = routeSelect.value.split("->").map(s => s.trim());
    const fromStop = routeParts[0] || routeSelect.value;
    const toStop = routeParts[1] || "";

    // Matches ScheduleDirectDto C# record
    const payload = {
        FromStop: fromStop,
        ToStop: toStop,
        ScheduleDate: rawDate.replace(/\//g, "-"), // Ensure yyyy-MM-dd format
        DepartureTime: rawTime,
        ShuttleID: shuttleId,
        DriverID: driverId
    };

    try {
        const response = await fetch("/api/coordinator/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeScheduleModalContainer();
            loadSchedulesTable();
        } else {
            const data = await response.json();
            alert("Save operational assignment failed: " + (data.message || "Invalid setup."));
        }
    } catch (err) {
        console.error("Network write fault:", err);
    }
};

// ==========================================================================
// BACKGROUND METRIC TRACKERS
// ==========================================================================
async function loadSchedulesTable() {
    try {
        const response = await fetch("/api/coordinator/schedules");
        if (!response.ok) return;
        const schedules = await response.json();
        const tbody = document.getElementById("scheduleTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (schedules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">No active transit routes logged.</td></tr>`;
            return;
        }

        schedules.forEach(s => {
            const routeDisplay = s.routeName || `${s.fromStop || ''} → ${s.toStop || ''}`;
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding:14px;"><strong>${routeDisplay}</strong></td>
                    <td style="padding:14px; color:#334155;">📅 ${s.scheduleDate}</td>
                    <td style="padding:14px;"><strong>${s.departureTime}</strong></td>
                    <td style="padding:14px;"><span style="color:#0284c7; font-weight:500;">🚌 ${s.shuttleName || 'Unassigned'}</span></td>
                    <td style="padding:14px; color:#475569;">👨‍✈️ ${s.driverName || 'Unassigned'}</td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

async function loadCoordinatorProfile() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email') || 'coord@getyourride.com';
        const response = await fetch(`/api/coordinator/profile?email=${encodeURIComponent(loggedInEmail)}`);
        if (response.ok) {
            activeCoordinatorProfile = await response.json();
            if (document.getElementById('coordinatorNameLabel')) document.getElementById('coordinatorNameLabel').innerText = activeCoordinatorProfile.fullName;
            if (document.getElementById('coordinatorEmailLabel')) document.getElementById('coordinatorEmailLabel').innerText = activeCoordinatorProfile.email;
        }
    } catch (err) { console.error(err); }
}