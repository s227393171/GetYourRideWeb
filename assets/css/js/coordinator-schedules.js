const COORDINATOR_PROFILE_API_URL = '/api/coordinator/profile';
window.activeCoordinatorProfile = null;


let activeEditScheduleId = null;


document.addEventListener("DOMContentLoaded", () => {
    console.log("[INIT] GetYourRide Scheduler System Initialized.");
    loadCoordinatorProfile();
    loadSchedulesTable();
    populateFormDropdowns();
});

const POPUP_SVG_ICONS = {

    info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    question: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
};


(function injectPopupStyles() {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes popupSlideIn {
            from { opacity: 0; transform: translateY(-16px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popupSlideOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-16px) scale(0.96); }
        }
        @keyframes popupBounceIn {
            0% { opacity: 0; transform: scale(0.7); }
            50% { transform: scale(1.03); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes popupFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .popup-toast {
            animation: popupSlideIn 0.3s ease forwards;
        }
        .popup-toast.hiding {
            animation: popupSlideOut 0.25s ease forwards;
        }
        .popup-backdrop {
            animation: popupFadeIn 0.2s ease forwards;
        }
        .popup-dialog {
            animation: popupBounceIn 0.35s ease forwards;
        }
        .popup-btn {
            transition: all 0.15s ease;
        }
        .popup-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .popup-btn:active {
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();

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
        info: { bg: "#eef4ff", border: "#a5b4fc", text: "#3730a3", icon: "info", glow: "rgba(99,102,241,0.15)" },
        success: { bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46", icon: "success", glow: "rgba(16,185,129,0.15)" },
        error: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "error", glow: "rgba(239,68,68,0.15)" },
        warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", icon: "warning", glow: "rgba(245,158,11,0.15)" }
    };
    const c = colors[type] || colors.success;

    const toast = document.createElement("div");
    toast.className = "popup-toast";
    toast.style.cssText = `
        position: fixed; top: 24px; right: 24px; z-index: 9999;
        background: ${c.bg}; border: 1.5px solid ${c.border}; color: ${c.text};
        padding: 16px 20px; border-radius: 14px; display: flex; align-items: center; gap: 12px;
        font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 8px 24px -4px ${c.glow}, 0 4px 8px -2px rgba(0,0,0,0.08);
        max-width: 380px; line-height: 1.4;
    `;
    toast.innerHTML = `
        <span style="display:flex; flex-shrink:0; opacity:0.9;">${POPUP_SVG_ICONS[c.icon]}</span>
        <span>${message}</span>
    `;
    root.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}


function showPopup(message, type = "info", onDismiss = null) {
    const root = ensurePopupRoot();

    const colors = {
        info: { icon: "#6366f1", iconBg: "#e0e7ff" },
        success: { icon: "#10b981", iconBg: "#d1fae5" },
        error: { icon: "#ef4444", iconBg: "#fee2e2" },
        warning: { icon: "#f59e0b", iconBg: "#fef3c7" }
    };
    const c = colors[type] || colors.info;

    const backdrop = document.createElement("div");
    backdrop.className = "popup-backdrop";
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
        z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    backdrop.innerHTML = `
        <div class="popup-dialog" style="background:#fff; padding:32px; border-radius:20px; width:100%; max-width:360px; text-align:center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2);">
            <div style="width:60px; height:60px; border-radius:50%; background:${c.iconBg}; color:${c.icon}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
                ${POPUP_SVG_ICONS[type] || POPUP_SVG_ICONS.info}
            </div>
            <p style="margin:0 0 24px 0; color:#334155; font-size:15px; font-weight:500; line-height:1.5;">${message}</p>
            <button class="popup-btn" id="popupOkBtn" style="
                padding: 11px 32px; border-radius: 10px; border: none;
                background: linear-gradient(135deg, ${c.icon}, ${c.icon}dd);
                color: #fff; font-weight: 600; font-size: 14px; cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">Got it</button>
        </div>
    `;
    root.appendChild(backdrop);

    backdrop.querySelector("#popupOkBtn").addEventListener("click", () => {
        backdrop.remove();
        if (onDismiss) onDismiss();
    });
}


function showConfirm(message, onConfirm, options = {}) {
    const root = ensurePopupRoot();

    const type = options.type || "warning";
    const confirmText = options.confirmText || "Yes, Confirm";
    const cancelText = options.cancelText || "Cancel";

    const colors = {
        warning: { icon: "#f59e0b", iconBg: "#fef3c7", btnBg: "#f59e0b" },
        error: { icon: "#ef4444", iconBg: "#fee2e2", btnBg: "#ef4444" },
        info: { icon: "#6366f1", iconBg: "#e0e7ff", btnBg: "#6366f1" },
        success: { icon: "#10b981", iconBg: "#d1fae5", btnBg: "#10b981" }
    };
    const c = colors[type] || colors.warning;

    const backdrop = document.createElement("div");
    backdrop.className = "popup-backdrop";
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
        z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    backdrop.innerHTML = `
        <div class="popup-dialog" style="background:#fff; padding:32px; border-radius:20px; width:100%; max-width:400px; text-align:center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2);">
            <div style="width:60px; height:60px; border-radius:50%; background:${c.iconBg}; color:${c.icon}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
                ${POPUP_SVG_ICONS.question}
            </div>
            <p style="margin:0 0 24px 0; color:#334155; font-size:15px; font-weight:500; line-height:1.5;">${message}</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button class="popup-btn" id="popupCancelBtn" style="
                    flex:1; padding:11px 16px; border-radius:10px;
                    border:1.5px solid #e2e8f0; background:#f8fafc; color:#475569;
                    font-weight:600; font-size:14px; cursor:pointer;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">${cancelText}</button>
                <button class="popup-btn" id="popupConfirmBtn" style="
                    flex:1; padding:11px 16px; border-radius:10px; border:none;
                    background: linear-gradient(135deg, ${c.btnBg}, ${c.btnBg}dd);
                    color:#fff; font-weight:600; font-size:14px; cursor:pointer;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">${confirmText}</button>
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


window.openScheduleModalContainer = function () {
    console.log("[MODAL] Create form window requested.");
    activeEditScheduleId = null;
    const modal = document.getElementById("scheduleModal");
    if (modal) {
        document.getElementById("frmScheduleAsset")?.reset();
        setScheduleModalMode("create");
        modal.style.setProperty("display", "flex", "important");
    } else {
        showPopup("The schedule form could not be opened. Please refresh the page and try again.", "error");
    }
};

window.closeScheduleModalContainer = function () {
    activeEditScheduleId = null;
    const modal = document.getElementById("scheduleModal");
    if (modal) {
        modal.style.setProperty("display", "none", "important");
    }
};

function setScheduleModalMode(mode) {
    const title = document.getElementById("scheduleModalTitle");
    const submitBtn = document.getElementById("btnScheduleFormSubmit");
    if (title) title.textContent = mode === "edit" ? "Edit Scheduled Route" : "Create New Schedule";
    if (submitBtn) submitBtn.textContent = mode === "edit" ? "Save Changes" : "Create Schedule";
}


async function populateFormDropdowns() {
    let routesLoaded = false, shuttlesLoaded = false, driversLoaded = false;

    
    try {
        const res = await fetch("/api/coordinator/routes");
        if (res.ok) {
            const routes = await res.json();
            const ddl = document.getElementById("ddlRouteAsset");
            if (ddl) {
                ddl.innerHTML =
                    `<option value="">-- Select Route Corridor --</option>` +
                    routes.map(r => {
                        const name = r.routeName || r.RouteName || `${r.fromStop || ''} -> ${r.toStop || ''}`;
                        return `<option value="${name}">${name}</option>`;
                    }).join('');
                routesLoaded = true;
            }
        } else {
            showToast("Could not load route options from server.", "warning");
        }
    } catch (err) {
        console.error("Routes loading error:", err);
        showToast("Network error loading routes.", "error");
    }

    
    try {
        const res = await fetch("/api/coordinator/shuttles");
        if (res.ok) {
            const shuttles = await res.json();
            const ddl = document.getElementById("ddlShuttleAsset");
            if (ddl) {
                ddl.innerHTML =
                    `<option value="">-- Select Vehicle Asset --</option>` +
                    shuttles.map(s => {
                        const id = s.shuttleId ?? s.shuttleID ?? s.vehicleId ?? s.id;
                        const name = s.shuttleName || s.vehicleName || "Shuttle";
                        const plate = s.licensePlate || s.registrationNumber || "";
                        return `<option value="${id}">${name} (${plate})</option>`;
                    }).join('');
                shuttlesLoaded = true;
            }
        } else {
            showToast("Could not load shuttle options from server.", "warning");
        }
    } catch (err) {
        console.error("Shuttles loading error:", err);
        showToast("Network error loading shuttles.", "error");
    }

    
    try {
        const res = await fetch("/api/coordinator/drivers");
        if (res.ok) {
            let drivers = await res.json();

            if (drivers.length > 0 && drivers[0].role) {
                drivers = drivers.filter(d => d.role === "SHUTTLE_DRIVER");
            }

            const ddl = document.getElementById("ddlDriverAsset");
            if (ddl) {
                ddl.innerHTML =
                    `<option value="">-- Select Roster Operator --</option>` +
                    drivers.map(d => {
                        const id = d.driverId ?? d.driverID ?? d.id;
                        const name = d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim();
                        return `<option value="${id}">${name}</option>`;
                    }).join('');
                driversLoaded = true;
            }
        } else {
            showToast("Could not load driver options from server.", "warning");
        }
    } catch (err) {
        console.error("Drivers loading error:", err);
        showToast("Network error loading drivers.", "error");
    }

    
    if (routesLoaded && shuttlesLoaded && driversLoaded) {
        showToast("Form options loaded successfully.", "success");
    }
}


window.handleScheduleFormSubmit = async function (e) {
    e.preventDefault();

    const routeSelect = document.getElementById("ddlRouteAsset");
    const shuttleSelect = document.getElementById("ddlShuttleAsset");
    const driverSelect = document.getElementById("ddlDriverAsset");
    const rawDate = document.getElementById("txtScheduleDate").value;
    const rawTime = document.getElementById("txtDepartureTime").value;

    
    if (!routeSelect.value) {
        showPopup("Please select a <strong>route corridor</strong> before saving.", "warning");
        return;
    }
    if (!shuttleSelect.value) {
        showPopup("Please select a <strong>vehicle/shuttle</strong> before saving.", "warning");
        return;
    }
    if (!driverSelect.value) {
        showPopup("Please select a <strong>driver</strong> before saving.", "warning");
        return;
    }
    if (!rawDate) {
        showPopup("Please choose a <strong>schedule date</strong> before saving.", "warning");
        return;
    }
    if (!rawTime) {
        showPopup("Please set a <strong>departure time</strong> before saving.", "warning");
        return;
    }

    const shuttleId = parseInt(shuttleSelect.value);
    const driverId = parseInt(driverSelect.value);

    if (isNaN(shuttleId) || isNaN(driverId)) {
        showPopup("The selected shuttle or driver has an invalid ID. Please re-select from the dropdown.", "error");
        return;
    }

   
    const routeParts = routeSelect.value.split("->").map(s => s.trim());
    const fromStop = routeParts[0] || routeSelect.value;
    const toStop = routeParts[1] || "";

    const payload = {
        FromStop: fromStop,
        ToStop: toStop,
        ScheduleDate: rawDate.replace(/\//g, "-"),
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
            showToast(
                isEdit ? "Schedule updated successfully!" : "New schedule created successfully!",
                "success"
            );
        } else {
            const data = await response.json().catch(() => ({}));
            showPopup(
                `Could not save the schedule:<br><strong>${data.message || "Unknown server error."}</strong>`,
                "error"
            );
        }
    } catch (err) {
        console.error("Network write fault:", err);
        showPopup("A network error occurred while saving. Please check your connection and try again.", "error");
    }
};


window.editSchedule = function (schedule) {
    const scheduleId = schedule.scheduleId ?? schedule.scheduleID ?? schedule.id;
    if (!scheduleId) {
        showPopup("Could not determine the schedule ID. Please refresh and try again.", "error");
        return;
    }
    showToast("Opening schedule for editing...", "info");
    setTimeout(() => {
        window.location.href = `create-schedule.html?id=${scheduleId}`;
    }, 400);
};


window.deleteSchedule = function (scheduleId, routeLabel) {
    showConfirm(
        `Are you sure you want to delete the schedule for <strong>"${routeLabel}"</strong>? This action cannot be undone.`,
        async () => {
            try {
                const response = await fetch(`/api/coordinator/schedules/${scheduleId}`, {
                    method: "DELETE"
                });

                if (response.ok) {
                    loadSchedulesTable();
                    showToast("Schedule deleted successfully.", "success");
                } else {
                    const data = await response.json().catch(() => ({}));
                    showPopup(
                        `Failed to delete the schedule:<br><strong>${data.message || "Server rejected the request."}</strong>`,
                        "error"
                    );
                }
            } catch (err) {
                console.error("Network delete fault:", err);
                showPopup("A network error occurred while deleting. Please check your connection.", "error");
            }
        },
        { type: "error", confirmText: "Delete Schedule", cancelText: "Keep It" }
    );
};

async function loadSchedulesTable() {
    try {
        const response = await fetch("/api/coordinator/schedules");
        if (!response.ok) {
            showToast("Could not load schedules from server.", "error");
            return;
        }
        const schedules = await response.json();
        const tbody = document.getElementById("scheduleTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (schedules.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:40px; color:#94a3b8;">
                        <div style="font-size:32px; margin-bottom:8px;">▪</div>
                        <p style="margin:0; font-weight:500;">No schedules found</p>
                        <p style="margin:4px 0 0 0; font-size:13px; color:#a1a1aa;">Click "Create Schedule" to add your first route.</p>
                    </td>
                </tr>`;
            return;
        }

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
    } catch (err) {
        console.error("Schedule table load error:", err);
        showPopup("Failed to load the schedules table. Please refresh the page.", "error");
    }
}


async function loadCoordinatorProfile() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email') || 'coord@getyourride.com';
        const response = await fetch(`/api/coordinator/profile?email=${encodeURIComponent(loggedInEmail)}`);

        if (response.ok) {
            activeCoordinatorProfile = await response.json();
            if (document.getElementById('coordinatorNameLabel')) {
                document.getElementById('coordinatorNameLabel').innerText = activeCoordinatorProfile.fullName;
            }
            if (document.getElementById('coordinatorEmailLabel')) {
                document.getElementById('coordinatorEmailLabel').innerText = activeCoordinatorProfile.email;
            }
        } else {
            showToast("Could not load coordinator profile.", "warning");
        }
    } catch (err) {
        console.error("Profile load error:", err);
        showToast("Network error loading your profile.", "error");
    }
}
function applyScheduleFilters() {
    const searchValue = (document.getElementById("scheduleSearchBox")?.value || "").toLowerCase();
    const dateValue = document.getElementById("scheduleDateFilter")?.value || "";

    const rows = document.querySelectorAll("#scheduleTableBody tr");

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 5) return; // skip loading/empty-state row

        const routeText = cells[0].textContent.toLowerCase();
        const dateText = cells[1].textContent.trim();
        const shuttleText = cells[3].textContent.toLowerCase();
        const operatorText = cells[4].textContent.toLowerCase();

        const matchesSearch = !searchValue ||
            routeText.includes(searchValue) ||
            shuttleText.includes(searchValue) ||
            operatorText.includes(searchValue);

        const matchesDate = !dateValue || dateText.includes(dateValue);

        row.style.display = (matchesSearch && matchesDate) ? "" : "none";
    });
}

function clearScheduleFilters() {
    document.getElementById("scheduleSearchBox").value = "";
    document.getElementById("scheduleDateFilter").value = "";
    applyScheduleFilters();
}
