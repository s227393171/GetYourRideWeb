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

    // 2. Open Add Driver Modal
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

    // 3. Cancel/Close Modal
    const cancelBtn = document.getElementById("btnCancelDriverModal");
    if (cancelBtn && modal) {
        cancelBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    // 4. Form Action Processing Event Listener
    const driverForm = document.getElementById("frmDriverAsset");
    if (driverForm) {
        driverForm.addEventListener("submit", handleDriverFormSubmit);
    }

    // 5. Profile Link Dropdown
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

        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;">⚠️ Backend API returned status error ${response.status}.</td></tr>`;
            return;
        }

        const allDrivers = await response.json();

        tbody.innerHTML = "";

        // 🎯 FIX: Filter out student drivers (Keep ONLY Shuttle Drivers)
        const shuttleDrivers = (allDrivers || []).filter(d => {
            const role = (d.role || "").toUpperCase();
            const email = (d.email || "").toLowerCase();
            const studentNum = d.studentNumber;

            // 1. Exclude if explicit STUDENT_DRIVER role
            if (role === "STUDENT_DRIVER" || role === "STUDENT") return false;

            // 2. Exclude if email matches student format (e.g. s223456789@...)
            if (/^s\d+@/i.test(email)) return false;

            // 3. Exclude if email ends with mandela student domain
            if (email.endsWith("@mandela.ac.za")) return false;

            return true;
        });

        if (shuttleDrivers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">No registered shuttle drivers found in your database.</td></tr>`;
            return;
        }

        let activeCount = 0;
        let breakCount = 0;
        let offDutyCount = 0;

        shuttleDrivers.forEach(d => {
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

            let displayEmpId = d.employeeId || `DRV-${d.id || d.driverId}`;
            let displayPhone = d.contactNumber || d.phone || "N/A";
            let displayShuttle = d.assignedShuttle || "Unassigned";
            let currentId = d.id || d.driverId;
            let displayStudentNum = d.studentNumber || "";

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
                    <button class="action-icon-btn" onclick="openDriverEditModal(${currentId}, '${d.fullName}', '${displayStudentNum}', '${d.email}', '${displayPhone}')" title="Edit Profile">✏️</button>
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

        if (totalCard) totalCard.innerText = shuttleDrivers.length;
        if (activeCard) activeCard.innerText = activeCount;
        if (breakCard) breakCard.innerText = breakCount;
        if (offDutyCard) offDutyCard.innerText = offDutyCount;

    } catch (err) {
        console.error("Critical rendering failure:", err);
        const tbody = document.getElementById("driverTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;">⚠️ Connection failed. Is your C# backend server running?</td></tr>`;
        }
    }
}

// ✅ Form Action Handler
async function handleDriverFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("txtDriverId").value;
    const payload = {
        studentNumber: document.getElementById("txtStudentNumber")?.value || "",
        fullName: document.getElementById("txtDriverName")?.value || "",
        email: document.getElementById("txtDriverEmail")?.value || "",
        phone: document.getElementById("txtDriverPhone")?.value || ""
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

// 🎯 FIX: Added 'phone' parameter to signature
function openDriverEditModal(id, name, studentNum, email, phone) {
    document.getElementById("txtDriverId").value = id;
    document.getElementById("txtDriverName").value = name;
    if (document.getElementById("txtStudentNumber")) document.getElementById("txtStudentNumber").value = studentNum;
    document.getElementById("txtDriverEmail").value = email;
    if (document.getElementById("txtDriverPhone")) {
        document.getElementById("txtDriverPhone").value = (phone === "N/A" || !phone) ? "" : phone;
    }
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