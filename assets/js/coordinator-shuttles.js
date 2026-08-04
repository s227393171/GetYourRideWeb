const SHUTTLES_API_URL = '/api/coordinator/shuttles';
const DRIVERS_API_URL = '/api/coordinator/drivers';

let shuttleCache = [];
let driverCache = [];


function ensurePopupRoot() {
    let root = document.getElementById("popupRoot");
    if (!root) {
        root = document.createElement("div");
        root.id = "popupRoot";
        document.body.appendChild(root);
    }
    return root;
}

function showToast(message, type = "info") {
    const root = ensurePopupRoot();

    const colors = {
        info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a8a", icon: "fa-circle-info" },
        success: { bg: "#f0fdf4", border: "#22c55e", text: "#14532d", icon: "fa-circle-check" },
        error: { bg: "#fef2f2", border: "#ef4444", text: "#7f1d1d", icon: "fa-triangle-exclamation" }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 3000;
        background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
        padding: 14px 18px; border-radius: 10px; display: flex; align-items: center; gap: 10px;
        font-weight: 600; font-size: 14px; box-shadow: 0 10px 20px -8px rgba(0,0,0,0.15);
        max-width: 360px; opacity: 0; transform: translateY(-10px); transition: all 0.25s ease;
    `;
    toast.innerHTML = `<i class="fa-solid ${c.icon}"></i><span>${message}</span>`;
    root.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

function showConfirm(message, onConfirm) {
    const root = ensurePopupRoot();

    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        z-index: 3000; display: flex; align-items: center; justify-content: center;
    `;
    backdrop.innerHTML = `
        <div style="background:#fff; padding:28px; border-radius:16px; width:100%; max-width:380px; text-align:center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);">
            <div style="width:56px; height:56px; border-radius:50%; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:22px; margin:0 auto 14px auto;">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <p style="margin:0 0 20px 0; color:#334155; font-size:14px; font-weight:600;">${message}</p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="popupCancelBtn" style="flex:1; padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; font-weight:600; cursor:pointer;">Cancel</button>
                <button id="popupConfirmBtn" style="flex:1; padding:10px 14px; border-radius:8px; border:none; background:#ef4444; color:#fff; font-weight:600; cursor:pointer;">Confirm</button>
            </div>
        </div>
    `;
    root.appendChild(backdrop);

    backdrop.querySelector("#popupCancelBtn").addEventListener("click", () => backdrop.remove());
    backdrop.querySelector("#popupConfirmBtn").addEventListener("click", () => {
        backdrop.remove();
        onConfirm();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadShuttleFleet();
    loadDriverOptions();

    safeBindListener("shuttleSearchInput", "keyup", searchShuttles);
    safeBindListener("btnOpenAddModal", "click", openAddModal);
    safeBindListener("btnCancelShuttleModal", "click", closeModal);
    safeBindListener("shuttleForm", "submit", saveShuttleForm);
});

function safeBindListener(elementId, eventType, callback) {
    const element = document.getElementById(elementId);
    if (element) element.addEventListener(eventType, callback);
}

// Populates the "Assigned Driver" dropdown in the Add/Edit Shuttle modal
async function loadDriverOptions() {
    const select = document.getElementById("formDriver");
    if (!select) return;

    try {
        const response = await fetch(DRIVERS_API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const rawDrivers = await response.json();
        driverCache = (rawDrivers || []).filter(d => {
            const role = (d.role || "").toUpperCase();
            const email = (d.email || "").toLowerCase();
            if (role === "STUDENT_DRIVER" || role === "STUDENT") return false;
            if (/^s\d+@/i.test(email) || email.endsWith("@mandela.ac.za")) return false;
            return true;
        });

        select.innerHTML = '<option value="">Select a driver...</option>';
        driverCache.forEach(driver => {
            const option = document.createElement("option");
            option.value = driver.driverId ?? driver.id;
            option.textContent = driver.fullName || driver.name || "Unknown Driver";
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Error loading driver list:", err);
        select.innerHTML = '<option value="">Unable to load drivers</option>';
        showToast("Failed to load driver list from the server.", "error");
    }
}

async function loadShuttleFleet() {
    try {
        const response = await fetch(SHUTTLES_API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        shuttleCache = await response.json();
        renderShuttleTable(shuttleCache);
        updateFleetMetrics(shuttleCache);
    } catch (err) {
        console.error("Error loading shuttle fleet:", err);
        const tableBody = document.getElementById("shuttleTableBody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Unable to connect to backend server.</td></tr>`;
        }
        showToast("Failed to load the shuttle fleet from the server.", "error");
    }
}

function renderShuttleTable(shuttles) {
    const tableBody = document.getElementById("shuttleTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!shuttles || shuttles.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No shuttles registered in the fleet.</td></tr>`;
        return;
    }

    shuttles.forEach(s => {
        const id = s.shuttleId ?? s.id;
        const name = s.shuttleName || "Unnamed Shuttle";
        const plate = s.licensePlate || "N/A";
        const capacity = s.capacity ?? 0;
        const status = s.status || "Active";
        const driverName = s.driverName || "Unassigned";

        let badgeClass = "badge-active";
        if (status.toLowerCase() === "maintenance") badgeClass = "badge-break";
        else if (status.toLowerCase() === "inactive") badgeClass = "badge-inactive";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${name}</strong><br><small style="color:#64748b;">${driverName}</small></td>
            <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-weight:600;">${plate}</code></td>
            <td>${capacity} seats</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td class="actions-cell">
                <button class="action-icon-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="action-icon-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;

        row.querySelector('[title="Edit"]').addEventListener("click", () => openEditModal(id));
        row.querySelector('[title="Delete"]').addEventListener("click", () => deleteShuttle(id));

        tableBody.appendChild(row);
    });
}

function updateFleetMetrics(shuttles) {
    const total = shuttles.length;
    const active = shuttles.filter(s => (s.status || "").toLowerCase() === "active").length;
    const maintenance = shuttles.filter(s => (s.status || "").toLowerCase() === "maintenance").length;
    const totalCapacity = shuttles.reduce((sum, s) => sum + (s.capacity ?? 0), 0);

    const totalEl = document.getElementById("txtTotalFleet");
    const activeEl = document.getElementById("txtActiveFleet");
    const maintenanceEl = document.getElementById("txtMaintenanceFleet");
    const capacityEl = document.getElementById("txtTotalCapacity");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (maintenanceEl) maintenanceEl.textContent = maintenance;
    if (capacityEl) capacityEl.textContent = totalCapacity;
}

function searchShuttles() {
    const searchInput = document.getElementById("shuttleSearchInput");
    if (!searchInput) return;

    const term = searchInput.value.toLowerCase();
    const filtered = shuttleCache.filter(s =>
        (s.shuttleName || "").toLowerCase().includes(term) ||
        (s.licensePlate || "").toLowerCase().includes(term)
    );
    renderShuttleTable(filtered);
}

function openAddModal() {
    const form = document.getElementById("shuttleForm");
    if (form) form.reset();

    const formId = document.getElementById("formShuttleId");
    if (formId) formId.value = "";

    const title = document.getElementById("modalTitle");
    if (title) title.textContent = "Add New Shuttle";

    const modal = document.getElementById("shuttleModal");
    if (modal) modal.classList.add("show");
}

function openEditModal(id) {
    const shuttle = shuttleCache.find(s => (s.shuttleId ?? s.id) === id);
    if (!shuttle) return;

    if (document.getElementById("formShuttleId")) document.getElementById("formShuttleId").value = id;
    if (document.getElementById("formName")) document.getElementById("formName").value = shuttle.shuttleName || "";
    if (document.getElementById("formPlate")) document.getElementById("formPlate").value = shuttle.licensePlate || "";
    if (document.getElementById("formCapacity")) document.getElementById("formCapacity").value = shuttle.capacity ?? "";
    if (document.getElementById("formDriver")) document.getElementById("formDriver").value = shuttle.driverId ?? "";
    if (document.getElementById("formStatus")) document.getElementById("formStatus").value = shuttle.status || "Active";

    const title = document.getElementById("modalTitle");
    if (title) title.textContent = "Edit Shuttle";

    const modal = document.getElementById("shuttleModal");
    if (modal) modal.classList.add("show");
}

function closeModal() {
    const modal = document.getElementById("shuttleModal");
    if (modal) modal.classList.remove("show");
}

async function saveShuttleForm(e) {
    e.preventDefault();
    const id = document.getElementById("formShuttleId").value;

    const driverVal = document.getElementById("formDriver").value;

    const payload = {
        DriverId: driverVal ? parseInt(driverVal) : null,
        ShuttleName: document.getElementById("formName").value,
        LicensePlate: document.getElementById("formPlate").value,
        Capacity: parseInt(document.getElementById("formCapacity").value),
        Status: document.getElementById("formStatus").value
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${SHUTTLES_API_URL}/${id}` : SHUTTLES_API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
            showToast(id ? "Shuttle updated successfully." : "Shuttle added successfully.", "success");
            loadShuttleFleet();
        } else {
            const errorText = await response.text();
            console.error("Save failed:", errorText);
            showToast(errorText || "Action dropped due to data verification issues.", "error");
        }
    } catch (err) {
        console.error("Error saving shuttle form:", err);
        showToast("A network error occurred while saving.", "error");
    }
}

async function deleteShuttle(id) {
    showConfirm("Permanently strip this vehicle asset record from core fleet logs?", async () => {
        try {
            const response = await fetch(`${SHUTTLES_API_URL}/${id}`, { method: "DELETE" });

            if (response.ok) {
                showToast("Shuttle removed successfully.", "success");
                loadShuttleFleet();
            } else {
                const errorText = await response.text();
                showToast(`Server refused deletion: ${errorText || response.statusText}`, "error");
            }
        } catch (err) {
            console.error("Error deleting shuttle:", err);
            showToast("Network error: Could not reach the backend server.", "error");
        }
    });
}