const API_URL = '/api/coordinator/shuttles';
const DRIVERS_API_URL = '/api/coordinator/drivers';
let fleetCache = [];
let driverCache = []; // FIX: holds the driver list so the dropdown can be populated

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial data stream load
    loadShuttleFleet();
    loadDriverOptions(); // FIX: populate the "Assigned Driver" dropdown

    // 2. Safe event binding for core interface triggers
    safeBindListener("shuttleSearchInput", "keyup", searchShuttles);
    safeBindListener("btnOpenAddModal", "click", openAddModal);
    safeBindListener("btnCancelShuttleModal", "click", closeModal);
    safeBindListener("shuttleForm", "submit", saveShuttleForm);

    // 3. Setup Live Clock if it exists
    startLiveClock();
});

// Helper function to safely bind listeners without crashing if an ID is missing
function safeBindListener(elementId, eventType, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(eventType, callback);
    }
}

// FIX: fetch verified drivers and populate the <select id="formDriver"> dropdown
async function loadDriverOptions() {
    const select = document.getElementById("formDriver");
    if (!select) return;

    try {
        const response = await fetch(DRIVERS_API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        driverCache = await response.json();

        select.innerHTML = '<option value="">Select a driver...</option>';
        driverCache.forEach(driver => {
            const option = document.createElement("option");
            option.value = driver.driverId;
            option.textContent = `${driver.fullName} (${driver.employeeId})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Error loading driver list:", err);
        select.innerHTML = '<option value="">Unable to load drivers</option>';
    }
}

async function loadShuttleFleet() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        fleetCache = await response.json();
        renderFleetTable(fleetCache);
        calculateMetrics(fleetCache);
    } catch (err) {
        console.error("Error loading shuttle array values:", err);
        const tableBody = document.getElementById("shuttleTableBody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">⚠️ Unable to connect to backend server.</td></tr>`;
        }
    }
}

function renderFleetTable(shuttles) {
    const tableBody = document.getElementById("shuttleTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!shuttles || shuttles.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">No vehicles found in fleet registry.</td></tr>`;
        return;
    }

    shuttles.forEach(bus => {
        const row = document.createElement("tr");
        let statusClass = "status-active";
        if (bus.status === "Maintenance") statusClass = "status-maintenance";
        if (bus.status === "Inactive") statusClass = "status-inactive";

        row.innerHTML = `
            <td style="padding:12px; vertical-align:middle;"><strong>🚌 ${bus.shuttleName}</strong></td>
            <td style="padding:12px; vertical-align:middle;"><code>${bus.licensePlate}</code></td>
            <td style="padding:12px; vertical-align:middle;">${bus.capacity} Seats</td>
            <td style="padding:12px; vertical-align:middle;"><span class="status-badge ${statusClass}">${bus.status}</span></td>
            <td style="padding:12px; vertical-align:middle;">
                <button class="action-btn-inline edit-trigger" style="background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:8px;">✏️</button>
                <button class="action-btn-inline delete-trigger" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">🗑️</button>
            </td>
        `;

        // Safely bind actions to the row buttons
        row.querySelector(".edit-trigger").addEventListener("click", () => {
            // FIX: pass driverId through too, so editing preselects the right driver
            openEditModal(bus.shuttleId, bus.shuttleName, bus.licensePlate, bus.capacity, bus.status, bus.driverId);
        });
        row.querySelector(".delete-trigger").addEventListener("click", () => {
            deleteShuttle(bus.shuttleId);
        });

        tableBody.appendChild(row);
    });
}

function calculateMetrics(shuttles) {
    const txtTotal = document.getElementById("txtTotalFleet");
    const txtActive = document.getElementById("txtActiveFleet");
    const txtMaint = document.getElementById("txtMaintenanceFleet");
    const txtCap = document.getElementById("txtTotalCapacity");

    if (txtTotal) txtTotal.textContent = shuttles.length;
    if (txtActive) txtActive.textContent = shuttles.filter(b => b.status === "Active").length;

    const maintenanceList = shuttles.filter(b => b.status === "Maintenance");
    if (txtMaint) txtMaint.textContent = maintenanceList.length;
    if (txtCap) txtCap.textContent = shuttles.reduce((acc, curr) => acc + (parseInt(curr.capacity) || 0), 0);

    const alertBox = document.getElementById("maintenanceAlertBox");
    const alertText = document.getElementById("maintenanceAlertText");

    if (alertBox && alertText) {
        if (maintenanceList.length > 0) {
            alertText.textContent = `${maintenanceList[0].shuttleName} (${maintenanceList[0].licensePlate}) is currently marked under service maintenance checks.`;
            alertBox.style.display = "flex";
        } else {
            alertBox.style.display = "none";
        }
    }
}

function searchShuttles() {
    const searchInput = document.getElementById("shuttleSearchInput");
    if (!searchInput) return;

    const term = searchInput.value.toLowerCase();
    const filtered = fleetCache.filter(b =>
        (b.shuttleName && b.shuttleName.toLowerCase().includes(term)) ||
        (b.licensePlate && b.licensePlate.toLowerCase().includes(term))
    );
    renderFleetTable(filtered);
}

// Global modal operations triggered by your HTML onclicks
function openAddModal() {
    const form = document.getElementById("shuttleForm");
    if (form) form.reset();

    const formId = document.getElementById("formShuttleId");
    if (formId) formId.value = "";

    const title = document.getElementById("modalTitle");
    if (title) title.textContent = "Add New Shuttle";

    // FIX: this CSS has a second .modal-overlay rule further down the file
    // that requires the "show" class to actually become visible/clickable
    // (it controls opacity and pointer-events). Setting inline display
    // alone left the modal present but invisible and unclickable.
    const modal = document.getElementById("shuttleModal");
    if (modal) modal.classList.add("show");
}

// FIX: now accepts driverId so the Edit form can preselect the assigned driver
function openEditModal(id, name, plate, capacity, status, driverId) {
    if (document.getElementById("formShuttleId")) document.getElementById("formShuttleId").value = id;
    if (document.getElementById("formName")) document.getElementById("formName").value = name;
    if (document.getElementById("formPlate")) document.getElementById("formPlate").value = plate;
    if (document.getElementById("formCapacity")) document.getElementById("formCapacity").value = capacity;
    if (document.getElementById("formStatus")) document.getElementById("formStatus").value = status;
    if (document.getElementById("formDriver") && driverId) document.getElementById("formDriver").value = driverId;

    const title = document.getElementById("modalTitle");
    if (title) title.textContent = "Edit Shuttle Details";

    // FIX: same as openAddModal -- toggle the "show" class, not inline display
    const modal = document.getElementById("shuttleModal");
    if (modal) modal.classList.add("show");
}

function closeModal() {
    // FIX: remove the "show" class to hide/disable the modal again
    const modal = document.getElementById("shuttleModal");
    if (modal) modal.classList.remove("show");
}

async function saveShuttleForm(e) {
    e.preventDefault();
    const id = document.getElementById("formShuttleId").value;

    // Driver is optional -- can be assigned later during scheduling
    const driverSelect = document.getElementById("formDriver");
    const driverId = driverSelect && driverSelect.value ? parseInt(driverSelect.value) : null;

    // Build payload including the missing status property
    const payload = {
        shuttleName: document.getElementById("formName").value,
        licensePlate: document.getElementById("formPlate").value,
        capacity: parseInt(document.getElementById("formCapacity").value),
        status: document.getElementById("formStatus").value, // Fixed: Sends the availability status to C#
        driverId: driverId
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
            loadShuttleFleet(); // Refreshes the table view instantly
        } else {
            const errorText = await response.text();
            console.error("Save failed:", errorText);
            alert("Action dropped due to data verification issues.");
        }
    } catch (err) {
        console.error("Error saving form:", err);
    }
}
async function deleteShuttle(id) {
    if (!confirm("Permanently strip this vehicle asset record from core fleet logs?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            console.log(`Shuttle ${id} deleted successfully.`);
            loadShuttleFleet(); // Refresh table view instantly
        } else {
            const errorText = await response.text();
            console.error("Backend rejection on delete:", errorText);
            alert(`Server refused deletion: ${errorText || response.statusText}`);
        }
    } catch (err) {
        console.error("Network or execution error running delete:", err);
        alert("Network error: Could not reach the backend server.");
    }
}
// Sidebar Modal controls mapping directly to your HTML onclick attributes
function openSettingsModal() { document.getElementById("settingsModal")?.style.setProperty("display", "flex", "important"); }
function closeSettingsModal() { document.getElementById("settingsModal")?.style.setProperty("display", "none", "important"); }
function openSupportModal() { document.getElementById("supportModal")?.style.setProperty("display", "flex", "important"); }
function closeSupportModal() { document.getElementById("supportModal")?.style.setProperty("display", "none", "important"); }
function openProfileModal() { document.getElementById("profileModal")?.style.setProperty("display", "flex", "important"); }
function closeProfileModal() { document.getElementById("profileModal")?.style.setProperty("display", "none", "important"); }

function toggleProfileMenu() {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) dropdown.classList.toggle("show");
}

function handleLogout() {
    if (confirm("Log out of Coordinator Session?")) window.location.href = "../Login.html";
}

function startLiveClock() {
    const clockEl = document.getElementById("liveClock");
    if (!clockEl) return;
    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toTimeString().split(' ')[0];
    }, 1000);
}