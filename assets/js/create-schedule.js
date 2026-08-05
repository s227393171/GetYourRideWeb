document.addEventListener("DOMContentLoaded", async () => {
    const apiBaseUrl = "/api/coordinator";

    const routeSelect = document.getElementById("ddlRouteAsset");
    const shuttleSelect = document.getElementById("ddlShuttleAsset");
    const driverSelect = document.getElementById("ddlDriverAsset");
    const scheduleForm = document.getElementById("frmCreateSchedule");
    const dateInputEl = document.getElementById("txtScheduleDate");
     if (dateInputEl) {
    dateInputEl.min = new Date().toISOString().split("T")[0];
    }
    const timeInputEl = document.getElementById("txtDepartureTime");
    if (timeInputEl) {
        timeInputEl.min = "06:00";
        timeInputEl.max = "22:00";
    }

    const urlParams = new URLSearchParams(window.location.search);
    const editScheduleId = urlParams.get("id");


    const POPUP_SVG_ICONS = {
        info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        success: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        question: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };

   
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

    
    await populateDropdowns();

    if (editScheduleId) {
        await loadScheduleIntoForm(editScheduleId);
    }

    async function populateDropdowns() {
        try {
            const results = await Promise.allSettled([
                fetch(`${apiBaseUrl}/routes`),
                fetch(`${apiBaseUrl}/shuttles`),
                fetch(`${apiBaseUrl}/drivers`)
            ]);

            const [routesResult, shuttlesResult, driversResult] = results;


            
            if (routesResult.status === "fulfilled" && routesResult.value.ok) {
                const routes = await routesResult.value.json();
                if (routeSelect && Array.isArray(routes)) {
                    routeSelect.innerHTML = `<option value="">-- Select Route --</option>` +
                        routes.map(r => `<option value="${r.routeId}">${r.fromStop} → ${r.toStop}</option>`).join('');
                }
            } else {
                console.error("Failed to load routes:", routesResult.reason || routesResult.value?.statusText);
                showToast("Could not load route options.", "warning");
            }


            
            if (shuttlesResult.status === "fulfilled" && shuttlesResult.value.ok) {
                const shuttles = await shuttlesResult.value.json();
                if (shuttleSelect && Array.isArray(shuttles)) {
                    shuttleSelect.innerHTML = `<option value="">-- Select Shuttle --</option>` +
                        shuttles.map(s =>
                            `<option value="${s.shuttleId}">${s.shuttleName} (${s.licensePlate})</option>`
                        ).join('');
                }
            } else {
                console.error("Failed to load shuttles:", shuttlesResult.reason || shuttlesResult.value?.statusText);
                showToast("Could not load shuttle options.", "warning");
            }

            
            if (driversResult.status === "fulfilled" && driversResult.value.ok) {
                const drivers = await driversResult.value.json();
                if (driverSelect && Array.isArray(drivers)) {
                    driverSelect.innerHTML = `<option value="">-- Select Driver --</option>` +
                        drivers.map(d =>
                            `<option value="${d.driverId}">${d.fullName}</option>`
                        ).join('');
                }
            } else {
                console.error("Failed to load drivers:", driversResult.reason || driversResult.value?.statusText);
                showToast("Could not load driver options.", "warning");
            }

            if (routesResult.status === "fulfilled" && shuttlesResult.status === "fulfilled" && driversResult.status === "fulfilled") {

                showToast("Form options loaded successfully.", "success");
            }

        } catch (error) {
            console.error("Unexpected error populating form:", error);
            showPopup("Could not connect to the server. Please check your backend is running and try again.", "error");
        }
    }

    async function loadScheduleIntoForm(scheduleId) {
        try {
            const response = await fetch(`${apiBaseUrl}/schedules`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const schedules = await response.json();
            const schedule = schedules.find(
                s => String(s.scheduleId ?? s.scheduleID ?? s.id) === String(scheduleId)
            );

            if (!schedule) {
                showPopup("The schedule you're trying to edit could not be found. Redirecting back.", "error", () => {
                    window.location.href = "schedule-shuttles.html";
                });
                return;
            }

            // Set route by ID
            const routeId = schedule.routeId ?? schedule.routeID ?? schedule.RouteID;
            if (routeSelect && routeId != null) {
                routeSelect.value = routeId;
            }

            // Set shuttle by ID
            const shuttleId = schedule.shuttleId ?? schedule.shuttleID ?? schedule.ShuttleID;
            if (shuttleSelect && shuttleId != null) {
                shuttleSelect.value = shuttleId;
            }

            // Set driver by ID
            const driverId = schedule.driverId ?? schedule.driverID ?? schedule.DriverID;
            if (driverSelect && driverId != null) {
                driverSelect.value = driverId;
            }

            // Set date and time
            const dateInput = document.getElementById("txtScheduleDate") || document.getElementById("runDate");
            const timeInput = document.getElementById("txtDepartureTime") || document.getElementById("clockTime");
            if (dateInput) dateInput.value = schedule.scheduleDate || schedule.assignmentDate || "";
            if (timeInput) timeInput.value = schedule.departureTime || "";

            // Update heading and button
            const heading = document.querySelector(".form-header h2");
            if (heading) heading.textContent = "Edit Fleet Route Dispatch";

            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = "Save Changes";

            showToast("Schedule loaded for editing.", "info");

        } catch (error) {
            console.error("Error loading schedule for edit:", error);
            showPopup("Failed to load schedule details. Please try again.", "error");
        }
    }
    
    if (scheduleForm) {
        scheduleForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const selectedRouteId = parseInt(routeSelect?.value || "0", 10);
            const selectedShuttle = parseInt(shuttleSelect?.value || "0", 10);
            const selectedDriver = parseInt(driverSelect?.value || "0", 10);

            const dateInput = document.getElementById("txtScheduleDate") || document.getElementById("runDate");
            const timeInput = document.getElementById("txtDepartureTime") || document.getElementById("clockTime");

       
            if (!routeSelect?.value || routeSelect.value === "") {
                showPopup("Please select a <strong>route</strong> before saving.", "warning");
                return;
            }

            if (!selectedShuttle || selectedShuttle === 0) {
                showPopup("Please select a <strong>shuttle vehicle</strong> before saving.", "warning");
                return;
            }

            if (!selectedDriver || selectedDriver === 0) {
                showPopup("Please select a <strong>driver</strong> before saving.", "warning");
                return;
            }

            if (!dateInput?.value) {
                showPopup("Please choose a <strong>schedule date</strong> before saving.", "warning");
                return;
            }

            const todayStr = new Date().toISOString().split("T")[0];
            if (dateInput.value < todayStr) {
                showPopup("You cannot schedule a shuttle for a <strong>past date</strong>. Please choose today or a later date.", "warning");
                return;
            }

            if (!timeInput?.value) {
                showPopup("Please set a <strong>departure time</strong> before saving.", "warning");
                return;
            }
            if (timeInput.value < "06:00" || timeInput.value > "22:00") {
                showPopup("Departure time must be between <strong>06:00</strong> and <strong>22:00</strong>.", "warning");
                return;
            }
            const payload = {
                RouteID: selectedRouteId,
                ScheduleDate: dateInput.value,
                DepartureTime: timeInput.value,
                ShuttleID: selectedShuttle,
                DriverID: selectedDriver
            };

            const url = editScheduleId
                ? `${apiBaseUrl}/schedules/${editScheduleId}`
                : `${apiBaseUrl}/schedules`;
            const method = editScheduleId ? "PUT" : "POST";

            
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Saving...";
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const result = await response.json().catch(() => ({}));

                if (response.ok && (result.success ?? true)) {
                    const successMsg = editScheduleId
                        ? "Schedule updated successfully!"
                        : "New route dispatch created successfully!";
                    showPopup(successMsg, "success", () => {
                        window.location.href = "schedule-shuttles.html";
                    });
                } else {
                    showPopup(
                        `Could not save the schedule:<br><strong>${result.message || "Unknown server error."}</strong>`,
                        "error"
                    );
                }
            } catch (error) {
                console.error("Network communication error:", error);
                showPopup("A network error occurred. Please check your connection and try again.", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = editScheduleId ? "Save Changes" : "Create Schedule";
                }
            }
        });
    }
});
