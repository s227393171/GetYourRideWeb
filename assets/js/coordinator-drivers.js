const DRIVER_API_URL = "/api/coordinator/drivers";

function openProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "flex", "important");
}

function closeProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "none", "important");
}



function injectDialogStyles() {
    if (document.getElementById("dialogSystemStyles")) return;

    const style = document.createElement("style");
    style.id = "dialogSystemStyles";
    style.textContent = `
        .dlg-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: dlgFadeIn 0.15s ease-out;
        }
        @keyframes dlgFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .dlg-box {
            background: #fff;
            border-radius: 10px;
            width: 360px;
            max-width: 90vw;
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            overflow: hidden;
            animation: dlgPopIn 0.15s ease-out;
        }
        @keyframes dlgPopIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .dlg-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 18px 20px 0 20px;
        }
        .dlg-icon {
            font-size: 1.4rem;
        }
        .dlg-icon.dlg-icon-error { color: #ef4444; }
        .dlg-icon.dlg-icon-warn { color: #f59e0b; }
        .dlg-icon.dlg-icon-info { color: #3b82f6; }
        .dlg-title {
            font-weight: 600;
            color: #1e293b;
            font-size: 1rem;
        }
        .dlg-body {
            padding: 12px 20px 20px 20px;
            color: #475569;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .dlg-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 0 20px 18px 20px;
        }
        .dlg-btn {
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 0.85rem;
            cursor: pointer;
            font-weight: 500;
        }
        .dlg-btn-secondary {
            background: #f1f5f9;
            color: #475569;
        }
        .dlg-btn-secondary:hover { background: #e2e8f0; }
        .dlg-btn-primary {
            background: #3b82f6;
            color: #fff;
        }
        .dlg-btn-primary:hover { background: #2563eb; }
        .dlg-btn-danger {
            background: #ef4444;
            color: #fff;
        }
        .dlg-btn-danger:hover { background: #dc2626; }
    `;
    document.head.appendChild(style);
}

function buildDialogIcon(tone) {
    const icons = {
        error: "fa-solid fa-circle-exclamation",
        warn: "fa-solid fa-triangle-exclamation",
        info: "fa-solid fa-circle-info"
    };
    return `<i class="dlg-icon dlg-icon-${tone} ${icons[tone] || icons.info}"></i>`;
}


function showAlertModal(message, { title = "Notice", tone = "info" } = {}) {
    injectDialogStyles();
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "dlg-overlay";
        overlay.innerHTML = `
            <div class="dlg-box">
                <div class="dlg-header">
                    ${buildDialogIcon(tone)}
                    <span class="dlg-title">${title}</span>
                </div>
                <div class="dlg-body">${message}</div>
                <div class="dlg-actions">
                    <button class="dlg-btn dlg-btn-primary" data-role="ok">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const cleanup = () => {
            overlay.remove();
            resolve();
        };

        overlay.querySelector('[data-role="ok"]').addEventListener("click", cleanup);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) cleanup();
        });
    });
}


function showConfirmModal(message, { title = "Please confirm", tone = "warn" } = {}) {
    injectDialogStyles();
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "dlg-overlay";
        overlay.innerHTML = `
            <div class="dlg-box">
                <div class="dlg-header">
                    ${buildDialogIcon(tone)}
                    <span class="dlg-title">${title}</span>
                </div>
                <div class="dlg-body">${message}</div>
                <div class="dlg-actions">
                    <button class="dlg-btn dlg-btn-secondary" data-role="cancel">Cancel</button>
                    <button class="dlg-btn dlg-btn-danger" data-role="confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector('[data-role="confirm"]').addEventListener("click", () => cleanup(true));
        overlay.querySelector('[data-role="cancel"]').addEventListener("click", () => cleanup(false));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) cleanup(false);
        });
    });
}


document.addEventListener("DOMContentLoaded", () => {
    
    loadDriversTable();

    const modal = document.getElementById("driverFormModal");

   
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

  
    const cancelBtn = document.getElementById("btnCancelDriverModal");
    if (cancelBtn && modal) {
        cancelBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

 
    const driverForm = document.getElementById("frmDriverAsset");
    if (driverForm) {
        driverForm.addEventListener("submit", handleDriverFormSubmit);
    }

    
    const viewProfileLink = document.getElementById("btnDropdownProfile");
    if (viewProfileLink) {
        viewProfileLink.addEventListener("click", (e) => {
            e.preventDefault();
            openProfileModal();
        });
    }
});


async function loadDriversTable() {
    try {
        const tbody = document.getElementById("driverTableBody");
        if (!tbody) {
            console.error("Could not find table body element with ID 'driverTableBody'");
            return;
        }

        const response = await fetch(DRIVER_API_URL);

        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Backend API returned status error ${response.status}.</td></tr>`;
            return;
        }

        const allDrivers = await response.json();

        tbody.innerHTML = "";

        
        const shuttleDrivers = (allDrivers || []).filter(d => {
            const role = (d.role || "").toUpperCase();
            const email = (d.email || "").toLowerCase();
            const studentNum = d.studentNumber;

            
            if (role === "STUDENT_DRIVER" || role === "STUDENT") return false;

           
            if (/^s\d+@/i.test(email)) return false;

           
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
                        <span style="font-size:1.5rem;"><i class="fa-solid fa-user"></i></span>
                        <div>
                            <strong>${d.fullName || "Unknown"}</strong><br>
                            <small style="color:#64748b;">${d.email || ""}</small>
                        </div>
                    </div>
                </td>
                <td><strong>${displayEmpId}</strong></td>
                <td>${displayPhone}</td>
                <td><span style="color:#475569;"><i class="fa-solid fa-bus"></i> ${displayShuttle}</span></td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td class="actions-cell">
                    <button class="action-icon-btn" onclick="viewDriverPassword(${currentId})" title="View Password"><i class="fa-solid fa-key"></i></button>
                <button class="action-icon-btn" onclick="openDriverEditModal(${currentId}, '${d.fullName}', '${displayStudentNum}', '${d.email}', '${displayPhone}', '${statusText}')" title="Edit Profile"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-icon-btn" onclick="deleteDriverProfile(${currentId})" title="Delete Profile"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
            applyDriverFilters();
        });

        
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
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Connection failed. Is your C# backend server running?</td></tr>`;
        }
    }
}


async function handleDriverFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("txtDriverId").value;
    const payload = {
        studentNumber: document.getElementById("txtStudentNumber")?.value || "",
        fullName: document.getElementById("txtDriverName")?.value || "",
        email: document.getElementById("txtDriverEmail")?.value || "",
        phone: document.getElementById("txtDriverPhone")?.value || "",
        status: document.getElementById("txtDriverStatus")?.value || "Active"
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

            // For newly added drivers, show the auto-generated login password so
            // the coordinator can pass it on to the driver.
            if (!isEditing) {
                let generatedPassword = "";
                try {
                    const result = await response.json();
                    generatedPassword = result?.generatedPassword || "";
                } catch (_) { /* no body / not JSON */ }

                if (generatedPassword) {
                    await showAlertModal(
                        `Driver <strong>${payload.fullName}</strong> was added successfully.<br><br>` +
                        `Their temporary login password is:<br>` +
                        `<div style="margin-top:8px; padding:10px 12px; background:#f1f5f9; border-radius:6px; font-family:monospace; font-size:1rem; font-weight:700; color:#0f172a; text-align:center; user-select:all;">${generatedPassword}</div>` +
                        `<br><small>Share this with the driver. They can change it later.</small>`,
                        { title: "Driver Added", tone: "info" }
                    );
                }
            }

            loadDriversTable();
        } else {
            await showAlertModal("Error processing transaction request.", { title: "Request Failed", tone: "error" });
        }
    } catch (err) {
        await showAlertModal("Server communication fault error.", { title: "Connection Error", tone: "error" });
    }
}

// Added 'phone' parameter to signature
function openDriverEditModal(id, name, studentNum, email, phone, status) {
    document.getElementById("txtDriverId").value = id;
    document.getElementById("txtDriverName").value = name;
    if (document.getElementById("txtStudentNumber")) document.getElementById("txtStudentNumber").value = studentNum;
    document.getElementById("txtDriverEmail").value = email;
    if (document.getElementById("txtDriverPhone")) {
        document.getElementById("txtDriverPhone").value = (phone === "N/A" || !phone) ? "" : phone;
    }
    if (document.getElementById("txtDriverStatus")) {
        document.getElementById("txtDriverStatus").value = status || "Active";
    }
    document.getElementById("modalDriverFormTitle").innerText = "Edit Driver Profile Details";
    document.getElementById("driverFormModal").style.display = "flex";
}

async function viewDriverPassword(id) {
    try {
        const response = await fetch(`${DRIVER_API_URL}/${id}/password`);
        if (!response.ok) {
            await showAlertModal("Could not retrieve the driver's password.", { title: "Lookup Failed", tone: "error" });
            return;
        }

        const data = await response.json();
        const password = data?.password || "";
        const name = data?.fullName || "this driver";

        if (!password) {
            await showAlertModal(`No password is set for <strong>${name}</strong>.`, { title: "No Password", tone: "warn" });
            return;
        }

        await showAlertModal(
            `Login password for <strong>${name}</strong>:<br>` +
            `<div style="margin-top:8px; padding:10px 12px; background:#f1f5f9; border-radius:6px; font-family:monospace; font-size:1rem; font-weight:700; color:#0f172a; text-align:center; user-select:all;">${password}</div>` +
            `<br><small>Keep this confidential. Share it only with the driver.</small>`,
            { title: "Driver Password", tone: "info" }
        );
    } catch (err) {
        console.error(err);
        await showAlertModal("Server communication fault error.", { title: "Connection Error", tone: "error" });
    }
}

async function deleteDriverProfile(id) {
    const confirmed = await showConfirmModal(
        "Are you sure you want to permanently delete this driver account asset record?",
        { title: "Delete Driver Profile", tone: "warn" }
    );
    if (!confirmed) return;

    try {
        const response = await fetch(`${DRIVER_API_URL}/${id}`, { method: "DELETE" });
        if (response.ok) {
            loadDriversTable();
        } else {
            await showAlertModal("Action rejected by backend.", { title: "Delete Failed", tone: "error" });
        }
    } catch (err) {
        console.error(err);
        await showAlertModal("Server communication fault error.", { title: "Connection Error", tone: "error" });
    }
}
function applyDriverFilters() {
    const searchValue = (document.getElementById("driverSearchBox")?.value || "").toLowerCase();
    const statusValue = document.getElementById("statusFilterSelect")?.value || "";

    const rows = document.querySelectorAll("#driverTableBody tr");

    rows.forEach(row => {
        const nameCell = row.querySelector(".driver-name-cell");
        const statusBadge = row.querySelector(".badge");

        if (!nameCell || !statusBadge) return; // skip loading/empty-state rows

        const nameText = nameCell.textContent.toLowerCase();
        const statusText = statusBadge.textContent.trim();

        const matchesSearch = !searchValue || nameText.includes(searchValue);
        const matchesStatus = !statusValue || statusText === statusValue;

        row.style.display = (matchesSearch && matchesStatus) ? "" : "none";
    });
}