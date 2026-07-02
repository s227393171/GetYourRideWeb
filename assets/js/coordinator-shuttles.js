const API_URL = '/api/coordinator/drivers';
let driverCache = [];
// Add these control functions to your file
function openProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "flex", "important");
}

function closeProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "none", "important");
}

// Inside your loadCoordinatorProfile() function, make sure these assignments exist:
if (document.getElementById('modalFullName')) document.getElementById('modalFullName').innerText = activeCoordinatorProfile.fullName;
if (document.getElementById('modalIdNumber')) document.getElementById('modalIdNumber').innerText = activeCoordinatorProfile.employeeId;
if (document.getElementById('modalEmail')) document.getElementById('modalEmail').innerText = activeCoordinatorProfile.email;
if (document.getElementById('modalRole')) document.getElementById('modalRole').innerText = activeCoordinatorProfile.role;

// Inside your DOMContentLoaded listener, ensure the link is wired up:
const viewProfileLink = document.getElementById("btnDropdownProfile");
if (viewProfileLink) {
    viewProfileLink.addEventListener("click", (e) => {
        e.preventDefault();
        openProfileModal();
    });
}
document.addEventListener("DOMContentLoaded", () => {
    // Initial data stream load
    loadDriverFleet();

    // Event binding controllers for interface triggers
    document.getElementById("driverSearchInput").addEventListener("keyup", searchDrivers);
    document.getElementById("btnOpenAddModal").addEventListener("click", openAddModal);
    document.getElementById("btnCancelDriverModal").addEventListener("click", closeModal);
    document.getElementById("driverForm").addEventListener("submit", saveDriverForm);

    // Global navigation event setups
    const dropdown = document.getElementById("coordinatorDropdown");
    if (document.getElementById("profileTrigger")) {
        document.getElementById("profileTrigger").addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("show");
        });
    }
    window.addEventListener("click", () => { if (dropdown) dropdown.classList.remove("show"); });

    if (document.getElementById("btnDropdownLogout")) document.getElementById("btnDropdownLogout").addEventListener("click", executeLogout);
    if (document.getElementById("btnDropdownProfile")) document.getElementById("btnDropdownProfile").addEventListener("click", () => document.getElementById("profileModal").classList.add("show"));
    if (document.getElementById("btnCloseProfile")) document.getElementById("btnCloseProfile").addEventListener("click", () => document.getElementById("profileModal").classList.remove("show"));
    if (document.getElementById("btnSidebarSupport")) document.getElementById("btnSidebarSupport").addEventListener("click", () => document.getElementById("supportModal").classList.add("show"));
    if (document.getElementById("btnCloseSupport")) document.getElementById("btnCloseSupport").addEventListener("click", () => document.getElementById("supportModal").classList.remove("show"));
});

async function loadDriverFleet() {
    try {
        const response = await fetch(API_URL);
        driverCache = await response.json();
        renderDriverTable(driverCache);
    } catch (err) {
        console.error("Error loading driver array values:", err);
    }
}

function renderDriverTable(drivers) {
    const tableBody = document.getElementById("driverTableBody");
    tableBody.innerHTML = "";

    if (drivers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">No verified operators found in roster registry.</td></tr>`;
        return;
    }

    drivers.forEach(driver => {
        const row = document.createElement("tr");

        let statusClass = "status-active";
        if (driver.status === "Inactive") statusClass = "status-inactive";

        // ✅ Uses properties exactly matching the anonymous object returned by C# app.MapGet("/api/coordinator/drivers")
        row.innerHTML = `
            <td><strong>${driver.fullName}</strong></td>
            <td><code>${driver.employeeId}</code></td>
            <td>${driver.email}</td>
            <td>${driver.contactNumber}</td>
            <td><span class="shuttle-badge">${driver.assignedShuttle}</span></td>
            <td><span class="status-badge ${statusClass}">${driver.status}</span></td>
        `;

        tableBody.appendChild(row);
    });
}

function searchDrivers() {
    const term = document.getElementById("driverSearchInput").value.toLowerCase();
    const filtered = driverCache.filter(d => d.fullName.toLowerCase().includes(term) || d.employeeId.toLowerCase().includes(term));
    renderDriverTable(filtered);
}

function openAddModal() {
    document.getElementById("driverForm").reset();
    document.getElementById("modalTitle").textContent = "Add New Driver Profile";
    document.getElementById("driverModal").classList.add("show");
}

function closeModal() {
    document.getElementById("driverModal").classList.remove("show");
}

async function saveDriverForm(e) {
    e.preventDefault();

    // Packages payload fields to map strictly onto C#'s DriverUpsertDto record
    const payload = {
        studentNumber: document.getElementById("formEmployeeNumber").value,
        fullName: document.getElementById("formFullName").value,
        email: document.getElementById("formEmail").value
    };

    // ✅ Form redirects strictly to your backend registration endpoint mapping path
    const url = '/api/admin/drivers/upsert';

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        closeModal();
        loadDriverFleet(); // Reload roster layout directly
    } else {
        const errorText = await response.text();
        console.error("Backend Error Details:", errorText);
        alert(`Server Error (${response.status}): ${errorText || 'Error processing transaction request.'}`);
    }
}

function executeLogout() {
    if (confirm("Log out of Coordinator Session?")) window.location.href = "../Login.html";
}