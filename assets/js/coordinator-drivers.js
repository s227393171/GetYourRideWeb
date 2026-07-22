const DRIVER_API_URL = "/api/coordinator/drivers";

function openProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "flex", "important");
}

function closeProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "none", "important");
}

// Unified initialization wrapper block
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load the drivers table first
    loadDriversTable();

    const modal = document.getElementById("driverFormModal");

    // 2. Open Add Driver Modal (Safe Check)
    const addBtn = document.getElementById("btnOpenAddDriverModal");
    if (addBtn && modal) {
        addBtn.addEventListener("click", () => {
            document.getElementById("frmDriverAsset").reset();
            const idField = document.getElementById("txtDriverId");
            if (idField) idField.value = "";
            const titleField = document.getElementById("modalDriverFormTitle");
            if (titleField) titleField.innerText = "Add New Driver Profile";
            modal.style.display = "flex";
        });
    }

    // 3. Cancel/Close Modal (Safe Check)
    const cancelBtn = document.getElementById("btnCancelDriverModal");
    if (cancelBtn && modal) {
        cancelBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    // 4. Form Action Processing Event Listener (Safe Check)
    const driverForm = document.getElementById("frmDriverAsset");
    if (driverForm) {
        driverForm.addEventListener("submit", handleDriverFormSubmit);
    }

    // 5. Profile Link Dropdown (Safe Check)
    const viewProfileLink = document.getElementById("btnDropdownProfile");
    if (viewProfileLink) {
        viewProfileLink.addEventListener("click", (e) => {
            e.preventDefault();
            openProfileModal();
        });
    }
});

// ✅ Renders the Interactive Operator Control Sheets safely
async function loadDriversTable() {
    try {
        const tbody = document.getElementById("driverTableBody");
        if (!tbody) {
            console.error("Could not find table body element with ID 'driverTableBody'");
            return;
        }

        const response = await fetch(DRIVER_API_URL);

        // If the backend returns an error, show it inside the table row directly!
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#ef4444;">⚠️ Backend API returned status error ${response.status}.</td></tr>`;
            return;
        }

        const drivers = await response.json();

        // Clear the loading text now that we successfully have data
        tbody.innerHTML = "";

        if (!drivers || drivers.length === 0) {
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
            let displayEmpId = d.employeeId || `DRV-${d.id}`;
            let displayPhone = d.contactNumber || "N/A";
            let displayShuttle = d.assignedShuttle || "Unassigned";
            let currentId = d.id || d.driverId;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="driver-name-cell">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.5rem;">👤</span>
                        <div>
                            <strong>${d.fullName || "Unknown"}</strong><br>
                            <small style="color:#64748b;">${d.email || ""}</small>
                        </div>
                    </div>
                </td>
                <td><strong>${displayEmpId}</strong></td>
                <td>${displayPhone}</td>
                <td><span style="color:#475569;">🚌 ${displayShuttle}</span></td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td class="actions-cell">
                <button class="action-icon-btn" onclick="openDriverEditModal(${currentId}, '${d.fullName}', '${d.studentNumber}', '${d.email}', '${displayPhone}')" title="Edit Profile">✏️</button>
                    <button class="action-icon-btn" onclick="deleteDriverProfile(${currentId})" title="Delete Profile">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Safe metric counter updates
        const totalCard = document.getElementById("txtTotalDrivers");
        const activeCard = document.getElementById("txtActiveDrivers");
        const breakCard = document.getElementById("txtBreakDrivers");
        const offDutyCard = document.getElementById("txtOffDutyDrivers");

        if (totalCard) totalCard.innerText = drivers.length;
        if (activeCard) activeCard.innerText = activeCount;
        if (breakCard) breakCard.innerText = breakCount;
        if (offDutyCard) offDutyCard.innerText = offDutyCount;

    } catch (err) {
        console.error("Critical rendering failure:", err);
        const tbody = document.getElementById("driverTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#ef4444;">⚠️ Connection failed. Is your C# backend server running?</td></tr>`;
        }
    }
}

// ✅ Form Action Handler
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
            document.getElementById("driverFormModal").style.display = "none";
            loadDriversTable();
        } else {
            alert("Error processing transaction request.");
        }
    } catch (err) {
        alert("Server communication fault error.");
    }
}

function openDriverEditModal(id, name, studentNum, email) {
    document.getElementById("txtDriverId").value = id;
    document.getElementById("txtDriverName").value = name;
    document.getElementById("txtStudentNumber").value = studentNum;
    document.getElementById("txtDriverEmail").value = email;
    document.getElementById("txtDriverPhone").value = phone === "N/A" ? "" : phone;
    document.getElementById("modalDriverFormTitle").innerText = "Edit Driver Profile Details";
    document.getElementById("driverFormModal").style.display = "flex";
}

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