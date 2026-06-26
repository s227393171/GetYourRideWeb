document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial table and modal dropdown populate on boot load
    loadSchedulesTable();
    populateFormDropdowns();

    const modal = document.getElementById("scheduleModal");

    // 2. Open Modal Event listener
    document.getElementById("btnOpenScheduleModal").addEventListener("click", () => {
        document.getElementById("frmScheduleAsset").reset();
        modal.classList.add("show"); // Adds bootstrap utility visibility rule
    });

    // 3. Cancel/Close Modal Event listener
    document.getElementById("btnCancelModal").addEventListener("click", () => {
        modal.classList.remove("show"); // Hides view overlay popup window
    });

    // 4. Form Submission tracking
    document.getElementById("frmScheduleAsset").addEventListener("submit", handleScheduleFormSubmit);
});

// ✅ Renders the Dashboard Grid Table Rows
async function loadSchedulesTable() {
    try {
        const response = await fetch("/api/coordinator/schedules");
        const schedules = await response.json();
        const tbody = document.getElementById("scheduleTableBody");
        tbody.innerHTML = "";

        if (schedules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">No transit operational schedules created yet.</td></tr>`;
            return;
        }

        schedules.forEach(s => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #f1f5f9";
            tr.innerHTML = `
                <td style="padding:14px;"><strong>${s.routeName}</strong></td>
                <td style="padding:14px; color:#334155;">📅 ${s.scheduleDate}</td>
                <td style="padding:14px;"><strong>${s.departureTime}</strong></td>
                <td style="padding:14px;"><span style="color:#0284c7; font-weight:500;">🚌 ${s.shuttleName}</span></td>
                <td style="padding:14px; color:#475569;">👨‍✈️ ${s.driverName}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load schedules table context window:", err);
    }
}

// ✅ Loads choices dynamically into HTML Select Elements
async function populateFormDropdowns() {
    try {
        // Fetch and map routes lookup dropdown elements
        const routeRes = await fetch("/api/coordinator/routes");
        const routes = await routeRes.json();
        document.getElementById("ddlRouteAsset").innerHTML = routes.map(r =>
            `<option value="${r.routeId}">${r.routeName}</option>`
        ).join('');

        // Fetch and map shuttles vehicle dropdown entries
        const shuttleRes = await fetch("/api/coordinator/shuttles");
        const shuttles = await shuttleRes.json();
        document.getElementById("ddlShuttleAsset").innerHTML = shuttles.map(s =>
            `<option value="${s.shuttleId}">${s.shuttleName} (${s.licensePlate})</option>`
        ).join('');

        // Fetch and map verified system driver accounts
        const driverRes = await fetch("/api/coordinator/drivers");
        const drivers = await driverRes.json();

        // Supports both pre-seed raw users or custom schema configurations
        document.getElementById("ddlDriverAsset").innerHTML = drivers.map(d =>
            `<option value="${d.userId}">${d.fullName}</option>`
        ).join('');

    } catch (err) {
        console.error("Dropdown rendering synchronization failed:", err);
    }
}

// ✅ Handles Save Assignment button transaction requests
async function handleScheduleFormSubmit(e) {
    e.preventDefault();

    // Grabs the dynamic select element reference
    const routeSelect = document.getElementById("ddlRouteAsset");

    // Extracts the actual Text Option (e.g. "CAMPUS NORTH") instead of numeric primary keys
    const chosenRouteText = routeSelect.options[routeSelect.selectedIndex].text;

    const payload = {
        routeName: chosenRouteText,
        scheduleDate: document.getElementById("txtScheduleDate").value,
        departureTime: document.getElementById("txtDepartureTime").value,
        shuttleId: parseInt(document.getElementById("ddlShuttleAsset").value),
        driverId: parseInt(document.getElementById("ddlDriverAsset").value)
    };

    try {
        const response = await fetch("/api/coordinator/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            document.getElementById("scheduleModal").classList.remove("show"); // Close modal popup frame
            loadSchedulesTable(); // Instantly update view tracking lines
        } else {
            alert("Error logging system transaction assignment request.");
        }
    } catch (err) {
        console.error("Transmission Failure:", err);
    }
}