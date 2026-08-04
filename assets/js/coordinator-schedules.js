const COORDINATOR_PROFILE_API_URL = '/api/coordinator/profile';
window.activeCoordinatorProfile = null;

// Tracks whether the shared modal is in "create" or "edit" mode, and which
// schedule is being edited. Reset every time the modal is opened fresh.
let activeEditScheduleId = null;

// Clean loading lifecycle hooks
document.addEventListener("DOMContentLoaded", () => {
    console.log("[INIT] GetYourRide Scheduler System Initialized.");
    loadCoordinatorProfile();
    loadSchedulesTable();
    populateFormDropdowns();
});

// ==========================================================================
// POPUP SYSTEM (replaces alert()/confirm() — same pattern used across the
// admin portal, so feedback styling stays consistent app-wide).
// ==========================================================================
const POPUP_SVG_ICONS = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    warning: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
};

function ensurePopupRoot() {
    let root = document.getElementById("popupRoot");
    if (!root) {
        root = document.createElement("div");
        root.id = "popupRoot";
        document.body.appendChild(root);
    }
    return root;
}

function showToast(message, type = "success") {
    const root = ensurePopupRoot();

    const colors = {
        success: { bg: "#f0fdf4", border: "#22c55e", text: "#14532d", icon: "success" },
        error: { bg: "#fef2f2", border: "#ef4444", text: "#7f1d1d", icon: "error" }
    };
    const c = colors[type] || colors.success;

    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 3000;
        background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
        padding: 14px 18px; border-radius: 10px; display: flex; align-items: center; gap: 10px;
        font-weight: 600; font-size: 14px; box-shadow: 0 10px 20px -8px rgba(0,0,0,0.15);
        max-width: 360px; opacity: 0; transform: translateY(-10px); transition: all 0.25s ease;
    `;
    toast.innerHTML = `<span style="display:flex; flex-shrink:0;">${POPUP_SVG_ICONS[c.icon]}</span><span>${message}</span>`;
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
            <div style="width:56px; height:56px; border-radius:50%; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 14px auto;">
                ${POPUP_SVG_ICONS.warning}
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

// ==========================================================================
// EXPLICIT HTML MODAL CONTROLLERS
// ==========================================================================
window.openScheduleModalContainer = function () {
    console.log("[MODAL] Create form window requested.");
    activeEditScheduleId = null; // fresh create, not an edit
    const modal = document.getElementById("scheduleModal");
    if (modal) {
        document.getElementById("frmScheduleAsset")?.reset();
        setScheduleModalMode("create");
        modal.style.setProperty("display", "flex", "important");
    }
};

window.closeScheduleModalContainer = function () {
    activeEditScheduleId = null;
    const modal = document.getElementById("scheduleModal");
    if (modal) {
        modal.style.setProperty("display", "none", "important");
    }
};

// Swaps the modal's heading/submit label between create and edit, if those
// elements exist on the page. Safe no-ops if the IDs aren't present.
function setScheduleModalMode(mode) {
    const title = document.getElementById("scheduleModalTitle");
    const submitBtn = document.getElementById("btnScheduleFormSubmit");
    if (title) title.textContent = mode === "edit" ? "Edit Scheduled Route" : "Create New Schedule";
    if (submitBtn) submitBtn.textContent = mode === "edit" ? "Save Changes" : "Create Schedule";
}

// ==========================================================================
// DATA FETCHERS & DROPDOWNS (MAPPED TO YOUR PROGRAM.CS OBJECTS)
// ==========================================================================
async function populateFormDropdowns() {
    // 1. Load Routes
    try {
        const res = await fetch("/api/coordinator/routes");
        if (res.ok) {
            const routes = await res.json();
            document.getElementById("ddlRouteAsset").innerHTML =
                `<option value="">-- Select Route Corridor --</option>` +
                routes.map(r => {
                    const name = r.routeName || r.RouteName || `${r.fromStop || ''} -> ${r.toStop || ''}`;
                    return `<option value="${name}">${name}</option>`;
                }).join('');
        }
    } catch (err) { console.error("Routes display processing error:", err); }

    // 2. Load Shuttles
    try {
        const res = await fetch("/api/coordinator/shuttles");
        if (res.ok) {
            const shuttles = await res.json();
            document.getElementById("ddlShuttleAsset").innerHTML =
                `<option value="">-- Select Vehicle Asset --</option>` +
                shuttles.map(s => {
                    const id = s.shuttleId ?? s.shuttleID ?? s.vehicleId ?? s.id;
                    const name = s.shuttleName || s.vehicleName || "Shuttle";
                    const plate = s.licensePlate || s.registrationNumber || "";
                    return `<option value="${id}">${name} (${plate})</option>`;
                }).join('');
        }
    } catch (err) { console.error("Shuttles drop-down parsing error:", err); }

    // 3. Load Drivers (Filters out student drivers if backend returns role)
    try {
        const res = await fetch("/api/coordinator/drivers");
        if (res.ok) {
            let drivers = await res.json();

            // Filter to shuttle drivers only if role exists
            if (drivers.length > 0 && drivers[0].role) {
                drivers = drivers.filter(d => d.role === "SHUTTLE_DRIVER");
            }

            document.getElementById("ddlDriverAsset").innerHTML =
                `<option value="">-- Select Roster Operator --</option>` +
                drivers.map(d => {
                    const id = d.driverId ?? d.driverID ?? d.id;
                    const name = d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim();
                    return `<option value="${id}">${name}</option>`;
                }).join('');
        }
    } catch (err) { console.error("Drivers collection loading error:", err); }
}

// ==========================================================================
// TRANSACTION FORM SUBMISSION HANDLER (handles both Create and Edit)
// ==========================================================================
window.handleScheduleFormSubmit = async function (e) {
    e.preventDefault();

    const routeSelect = document.getElementById("ddlRouteAsset");
    const shuttleSelect = document.getElementById("ddlShuttleAsset");
    const driverSelect = document.getElementById("ddlDriverAsset");
    const rawDate = document.getElementById("txtScheduleDate").value;
    const rawTime = document.getElementById("txtDepartureTime").value;

    if (!routeSelect.value || !shuttleSelect.value || !driverSelect.value || !rawDate || !rawTime) {
        showToast("Please complete all configuration fields before saving.", "error");
        return;
    }

    const shuttleId = parseInt(shuttleSelect.value);
    const driverId = parseInt(driverSelect.value);

    if (isNaN(shuttleId) || isNaN(driverId)) {
        showToast("Invalid Shuttle or Driver selection.", "error");
        return;
    }

    // Split "2nd Avenue -> Forest Hill" into FromStop and ToStop
    const routeParts = routeSelect.value.split("->").map(s => s.trim());
    const fromStop = routeParts[0] || routeSelect.value;
    const toStop = routeParts[1] || "";

    // Matches ScheduleDirectDto C# record
    const payload = {
        FromStop: fromStop,
        ToStop: toStop,
        ScheduleDate: rawDate.replace(/\//g, "-"), // Ensure yyyy-MM-dd format
        DepartureTime: rawTime,
        ShuttleID: shuttleId,
        DriverID: driverId
    };

    const isEdit = activeEditScheduleId !== null;
    const url = isEdit
        ? `/api/coordinator/schedules/${activeEditScheduleId}`
        : "/api/coordinator/schedules";
    const method = isEdit ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeScheduleModalContainer();
            loadSchedulesTable();
            showToast(isEdit ? "Schedule updated successfully." : "Schedule created successfully.", "success");
        } else {
            const data = await response.json().catch(() => ({}));
            showToast("Save operational assignment failed: " + (data.message || "Invalid setup."), "error");
        }
    } catch (err) {
        console.error("Network write fault:", err);
        showToast("A network error occurred while saving the schedule.", "error");
    }
};

// ==========================================================================
// EDIT — opens the same modal used for Create, pre-filled with the row's data
// ==========================================================================
window.editSchedule = function (schedule) {
    const scheduleId = schedule.scheduleId ?? schedule.scheduleID ?? schedule.id;
    window.location.href = `create-schedule.html?id=${scheduleId}`;
};

// ==========================================================================
// DELETE — confirmation popup, then removes the schedule
// ==========================================================================
window.deleteSchedule = function (scheduleId, routeLabel) {
    showConfirm(`Delete the schedule for "${routeLabel}"? This can't be undone.`, async () => {
        try {
            const response = await fetch(`/api/coordinator/schedules/${scheduleId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                loadSchedulesTable();
                showToast("Schedule deleted.", "success");
            } else {
                showToast("Failed to delete the schedule.", "error");
            }
        } catch (err) {
            console.error("Network delete fault:", err);
            showToast("A network error occurred while deleting the schedule.", "error");
        }
    });
};

// ==========================================================================
// BACKGROUND METRIC TRACKERS
// ==========================================================================
async function loadSchedulesTable() {
    try {
        const response = await fetch("/api/coordinator/schedules");
        if (!response.ok) return;
        const schedules = await response.json();
        const tbody = document.getElementById("scheduleTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (schedules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">No active transit routes logged.</td></tr>`;
            return;
        }

        // Keep the raw records around so editSchedule() can be called with
        // the full object from a simple index lookup (avoids re-fetching).
        window.__loadedSchedules = schedules;

        schedules.forEach((s, index) => {
            const routeDisplay = s.routeName || `${s.fromStop || ''} → ${s.toStop || ''}`;
            const scheduleId = s.scheduleId ?? s.scheduleID ?? s.id;

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding:14px;"><strong>${routeDisplay}</strong></td>
                    <td style="padding:14px; color:#334155;"><i class="fa-solid fa-calendar-days" style="color:#64748b; margin-right:6px;"></i>${s.scheduleDate}</td>
                    <td style="padding:14px;"><strong>${s.departureTime}</strong></td>
                    <td style="padding:14px;"><span style="color:#0284c7; font-weight:500;"><i class="fa-solid fa-bus" style="margin-right:6px;"></i>${s.shuttleName || 'Unassigned'}</span></td>
                    <td style="padding:14px; color:#475569;"><i class="fa-solid fa-user-tie" style="margin-right:6px;"></i>${s.driverName || 'Unassigned'}</td>
                    <td style="padding:14px; text-align:center;">
                        <button type="button" class="action-icon-btn" title="Edit schedule" onclick="editSchedule(window.__loadedSchedules[${index}])"><i class="fa-solid fa-pen" style="color:#f97316;"></i></button>
                        <button type="button" class="action-icon-btn" title="Delete schedule" onclick="deleteSchedule('${scheduleId}', '${routeDisplay.replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash" style="color:#ef4444;"></i></button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

async function loadCoordinatorProfile() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email') || 'coord@getyourride.com';
        const response = await fetch(`/api/coordinator/profile?email=${encodeURIComponent(loggedInEmail)}`);
        if (response.ok) {
            activeCoordinatorProfile = await response.json();
            if (document.getElementById('coordinatorNameLabel')) document.getElementById('coordinatorNameLabel').innerText = activeCoordinatorProfile.fullName;
            if (document.getElementById('coordinatorEmailLabel')) document.getElementById('coordinatorEmailLabel').innerText = activeCoordinatorProfile.email;
        }
    } catch (err) { console.error(err); }
}