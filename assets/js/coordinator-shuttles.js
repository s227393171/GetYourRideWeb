const API_URL = '/api/coordinator/shuttles';
let fleetCache = [];

document.addEventListener("DOMContentLoaded", () => {
    // Initial data stream load
    loadShuttleFleet();

    // Event binding controllers for interface triggers
    document.getElementById("shuttleSearchInput").addEventListener("keyup", searchShuttles);
    document.getElementById("btnOpenAddModal").addEventListener("click", openAddModal);
    document.getElementById("btnCancelShuttleModal").addEventListener("click", closeModal);
    document.getElementById("shuttleForm").addEventListener("submit", saveShuttleForm);

    // Global navigation event setups
    const dropdown = document.getElementById("coordinatorDropdown");
    document.getElementById("profileTrigger").addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    });
    window.addEventListener("click", () => { if (dropdown) dropdown.classList.remove("show"); });

    document.getElementById("btnDropdownLogout").addEventListener("click", executeLogout);
    document.getElementById("btnDropdownProfile").addEventListener("click", () => document.getElementById("profileModal").classList.add("show"));
    document.getElementById("btnCloseProfile").addEventListener("click", () => document.getElementById("profileModal").classList.remove("show"));
    document.getElementById("btnSidebarSupport").addEventListener("click", () => document.getElementById("supportModal").classList.add("show"));
    document.getElementById("btnCloseSupport").addEventListener("click", () => document.getElementById("supportModal").classList.remove("show"));
});

async function loadShuttleFleet() {
    try {
        const response = await fetch(API_URL);
        fleetCache = await response.json();
        renderFleetTable(fleetCache);
        calculateMetrics(fleetCache);
    } catch (err) {
        console.error("Error loading shuttle array values:", err);
    }
}

function renderFleetTable(shuttles) {
    const tableBody = document.getElementById("shuttleTableBody");
    tableBody.innerHTML = "";

    if (shuttles.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No vehicles found in fleet registry.</td></tr>`;
        return;
    }

    shuttles.forEach(bus => {
        const row = document.createElement("tr");
        let statusClass = "status-active";
        if (bus.status === "Maintenance") statusClass = "status-maintenance";
        if (bus.status === "Inactive") statusClass = "status-inactive";

        row.innerHTML = `
            <td><strong>${bus.shuttleName}</strong></td>
            <td><code>${bus.licensePlate}</code></td>
            <td>${bus.capacity} Seats</td>
            <td><span class="status-badge ${statusClass}">${bus.status}</span></td>
            <td>
                <button class="action-btn-inline edit-trigger">✏️</button>
                <button class="action-btn-inline delete-trigger">🗑️</button>
            </td>
        `;

        // Direct isolated action listener bindings
        row.querySelector(".edit-trigger").addEventListener("click", () => {
            openEditModal(bus.shuttleId, bus.shuttleName, bus.licensePlate, bus.capacity, bus.status);
        });
        row.querySelector(".delete-trigger").addEventListener("click", () => {
            deleteShuttle(bus.shuttleId);
        });

        tableBody.appendChild(row);
    });
}

function calculateMetrics(shuttles) {
    document.getElementById("txtTotalFleet").textContent = shuttles.length;
    document.getElementById("txtActiveFleet").textContent = shuttles.filter(b => b.status === "Active").length;

    const maintenanceList = shuttles.filter(b => b.status === "Maintenance");
    document.getElementById("txtMaintenanceFleet").textContent = maintenanceList.length;
    document.getElementById("txtTotalCapacity").textContent = shuttles.reduce((acc, curr) => acc + curr.capacity, 0);

    const alertBox = document.getElementById("maintenanceAlertBox");
    if (maintenanceList.length > 0) {
        document.getElementById("maintenanceAlertText").textContent = `${maintenanceList[0].shuttleName} (${maintenanceList[0].licensePlate}) is currently marked under service maintenance checks.`;
        alertBox.style.display = "flex";
    } else {
        alertBox.style.display = "none";
    }
}

function searchShuttles() {
    const term = document.getElementById("shuttleSearchInput").value.toLowerCase();
    const filtered = fleetCache.filter(b => b.shuttleName.toLowerCase().includes(term) || b.licensePlate.toLowerCase().includes(term));
    renderFleetTable(filtered);
}

function openAddModal() {
    document.getElementById("shuttleForm").reset();
    document.getElementById("formShuttleId").value = "";
    document.getElementById("modalTitle").textContent = "Add New Shuttle";
    document.getElementById("shuttleModal").classList.add("show");
}

function openEditModal(id, name, plate, capacity, status) {
    document.getElementById("formShuttleId").value = id;
    document.getElementById("formName").value = name;
    document.getElementById("formPlate").value = plate;
    document.getElementById("formCapacity").value = capacity;
    document.getElementById("formStatus").value = status;
    document.getElementById("modalTitle").textContent = "Edit Shuttle Details";
    document.getElementById("shuttleModal").classList.add("show");
}

function closeModal() {
    document.getElementById("shuttleModal").classList.remove("show");
}

async function saveShuttleForm(e) {
    e.preventDefault();
    const id = document.getElementById("formShuttleId").value;

    const payload = {
        shuttleName: document.getElementById("formName").value,
        licensePlate: document.getElementById("formPlate").value,
        capacity: parseInt(document.getElementById("formCapacity").value),
        status: document.getElementById("formStatus").value
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/${id}` : API_URL;

    const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        closeModal();
        loadShuttleFleet();
    } else {
        alert("Action dropped due to duplicate data validation issues.");
    }
}

async function deleteShuttle(id) {
    if (!confirm("Permanently strip this vehicle asset record from core fleet logs?")) return;
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (response.ok) loadShuttleFleet();
}

function executeLogout() {
    if (confirm("Log out of Coordinator Session?")) window.location.href = "../Login.html";
}