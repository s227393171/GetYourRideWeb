const DRIVER_API_URL = "/api/coordinator/drivers";

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

// Standard unified initialization wrapper block
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial backend database table loop call on boot load
    loadDriversTable();

    const modal = document.getElementById("driverFormModal");

    // 2. Open Add Driver View Modal Window Click Trigger
    document.getElementById("btnOpenAddDriverModal").addEventListener("click", () => {
        document.getElementById("frmDriverAsset").reset();
        document.getElementById("txtDriverId").value = "";
        document.getElementById("modalDriverFormTitle").innerText = "Add New Driver Profile";
        // FIXED: Explicitly force display flex properties to bypass stylesheet restrictions
        modal.style.display = "flex";
    });

    // 3. Close / Drop Down Modal View Overlay
    document.getElementById("btnCancelDriverModal").addEventListener("click", () => {
        // FIXED: Clear display rules to drop the modal overlay back out of visibility layer
        modal.style.display = "none";
    });

    // 4. Form Action Processing Event Listener
    const driverForm = document.getElementById("frmDriverAsset");
    if (driverForm) {
        driverForm.addEventListener("submit", handleDriverFormSubmit);
    }
});

// ✅ Renders the Interactive Operator Control Sheets and Count Badges
async function loadDriversTable() {
    try {
        const response = await fetch(DRIVER_API_URL);
        if (!response.ok) throw new Error("API Pipeline Connection Disconnected.");

        const drivers = await response.json();
        const tbody = document.getElementById("driverTableBody");
        tbody.innerHTML = "";

        if (drivers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">No registered drivers found in your database.</td></tr>`;
            return;
        }

        let activeCount = 0;
        let breakCount = 0;
        let offDutyCount = 0;

        drivers.forEach(d => {
            let statusText = d.status || "Active";
            let badgeClass = "badge-active";

            if (statusText.toLowerCase() === "active") {
                activeCount++;
                badgeClass = "badge-active";
            } else if (statusText.toLowerCase() === "on break") {
                breakCount++;
                badgeClass = "badge-break";
            } else {
                offDutyCount++;
                badgeClass = "badge-inactive";
            }

            // Dynamically pulls your C# SQL Left Join property variable
            let displayShuttle = d.shuttleName ? `🚌 ${d.shuttleName}` : `<span style="color:#64748b; font-style:italic;">Unassigned</span>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="driver-name-cell">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.5rem;">👤</span>
                        <div>
                            <strong>${d.fullName}</strong><br>
                            <small style="color:#64748b;">${d.email}</small>
                        </div>
                    </div>
                </td>
                <td><strong>${d.studentNumber}</strong></td>
                <td><span style="font-weight:500; color:#0284c7;">${displayShuttle}</span></td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td class="actions-cell">
                    <button class="action-icon-btn" onclick="openDriverEditModal(${d.userId}, '${d.fullName}', '${d.studentNumber}', '${d.email}')" title="Edit Profile">✏️</button>
                    <button class="action-icon-btn" onclick="deleteDriverProfile(${d.userId})" title="Delete Profile">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Write live calculation counters straight into metric panels
        document.getElementById("txtTotalDrivers").innerText = drivers.length;
        document.getElementById("txtActiveDrivers").innerText = activeCount;
        document.getElementById("txtBreakDrivers").innerText = breakCount;
        document.getElementById("txtOffDutyDrivers").innerText = offDutyCount;

    } catch (err) {
        console.error("Critical rendering failure:", err);
    }
}

// ✅ Form action save route handler routing payload data objects
async function handleDriverFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("txtDriverId").value;
    const payload = {
        studentNumber: document.getElementById("txtStudentNumber").value,
        fullName: document.getElementById("txtDriverName").value,
        email: document.getElementById("txtDriverEmail").value
    };

    const isEditing = id !== "";
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${DRIVER_API_URL}/${id}` : DRIVER_API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // FIXED: Using standard native style visibility manipulation targets
            document.getElementById("driverFormModal").style.display = "none";
            loadDriversTable();
        } else {
            alert("Error processing transaction request.");
        }
    } catch (err) {
        alert("Server communication fault error.");
    }
}

// ✅ Triggers entry edit form modal configurations
function openDriverEditModal(id, name, studentNum, email) {
    document.getElementById("txtDriverId").value = id;
    document.getElementById("txtDriverName").value = name;
    document.getElementById("txtStudentNumber").value = studentNum;
    document.getElementById("txtDriverEmail").value = email;

    document.getElementById("modalDriverFormTitle").innerText = "Edit Driver Profile Details";
    // FIXED: Form window display configuration target matched to display engine layer rules
    document.getElementById("driverFormModal").style.display = "flex";
}

// ✅ Action query request managing backend schema target removals
async function deleteDriverProfile(id) {
    if (!confirm("Are you sure you want to permanently delete this driver account asset record?")) return;

    try {
        const response = await fetch(`${DRIVER_API_URL}/${id}`, { method: "DELETE" });
        if (response.ok) {
            loadDriversTable();
        } else {
            alert("Action rejected by backend.");
        }
    } catch (err) {
        console.error(err);
    }
}