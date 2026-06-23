const DRIVER_API_URL = "/api/coordinator/drivers";

document.addEventListener("DOMContentLoaded", () => {
    loadDriversTable();

    const modal = document.getElementById("driverFormModal");

    document.getElementById("btnOpenAddDriverModal").addEventListener("click", () => {
        document.getElementById("frmDriverAsset").reset();
        document.getElementById("txtDriverId").value = "";
        document.getElementById("modalDriverFormTitle").innerText = "Add New Driver Profile";
        modal.classList.add("show");
    });

    document.getElementById("btnCancelDriverModal").addEventListener("click", () => {
        modal.classList.remove("show");
    });
});

async function loadDriversTable() {
    try {
        const response = await fetch(DRIVER_API_URL);
        if (!response.ok) throw new Error("API Pipeline Connection Disconnected.");

        const drivers = await response.json();
        const tbody = document.getElementById("driverTableBody");
        tbody.innerHTML = "";

        if (drivers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">No registered drivers found in your database.</td></tr>`;
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

            // UI placeholders for variables not explicitly contained in the base user schema row
            let displayPhone = d.contactNumber || "(555) 012-4492";
            let displayShuttle = d.assignedShuttle || (statusText === "Active" ? "Shuttle #42 (West Loop)" : "Unassigned");

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
                <td>${displayPhone}</td>
                <td><span style="color:#475569;">🚌 ${displayShuttle}</span></td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td class="actions-cell">
                    <button class="action-icon-btn" onclick="openDriverEditModal(${d.userId}, '${d.fullName}', '${d.studentNumber}', '${d.email}')" title="Edit Profile">✏️</button>
                    <button class="action-icon-btn" onclick="deleteDriverProfile(${d.userId})" title="Delete Profile">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("txtTotalDrivers").innerText = drivers.length;
        document.getElementById("txtActiveDrivers").innerText = activeCount;
        document.getElementById("txtBreakDrivers").innerText = breakCount;
        document.getElementById("txtOffDutyDrivers").innerText = offDutyCount;

    } catch (err) {
        console.error("Critical rendering failure:", err);
    }
}

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
            document.getElementById("driverFormModal").classList.remove("show");
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

    document.getElementById("modalDriverFormTitle").innerText = "Edit Driver Profile Details";
    document.getElementById("driverFormModal").classList.add("show");
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
document.addEventListener("DOMContentLoaded", () => {
    loadDriversTable();

    const modal = document.getElementById("driverFormModal");
    
    // ADD THIS LINE to attach your form submit handling logic
    const driverForm = document.getElementById("frmDriverAsset");
    if (driverForm) {
        driverForm.addEventListener("submit", handleDriverFormSubmit);
    }

    document.getElementById("btnOpenAddDriverModal").addEventListener("click", () => {
        document.getElementById("frmDriverAsset").reset();
        document.getElementById("txtDriverId").value = "";
        document.getElementById("modalDriverFormTitle").innerText = "Add New Driver Profile";
        modal.classList.add("show");
    });

    document.getElementById("btnCancelDriverModal").addEventListener("click", () => {
        modal.classList.remove("show");
    });
});
