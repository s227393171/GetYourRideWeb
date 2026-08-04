document.addEventListener("DOMContentLoaded", async () => {
    const apiBaseUrl = "/api/coordinator";

    const routeSelect = document.getElementById("ddlRouteAsset");
    const shuttleSelect = document.getElementById("ddlShuttleAsset");
    const driverSelect = document.getElementById("ddlDriverAsset");
    const scheduleForm = document.getElementById("frmCreateSchedule");

    // Detect edit mode from the URL: create-schedule.html?id=123
    const urlParams = new URLSearchParams(window.location.search);
    const editScheduleId = urlParams.get("id");

    await populateDropdowns();

    if (editScheduleId) {
        await loadScheduleIntoForm(editScheduleId);
    }

    async function populateDropdowns() {
        try {
            // Fetch stops, shuttles, and drivers independently so one failure doesn't block the rest
            const results = await Promise.allSettled([
                fetch(`${apiBaseUrl}/stops`),
                fetch(`${apiBaseUrl}/shuttles`),
                fetch(`${apiBaseUrl}/drivers`)
            ]);

            const [stopsResult, shuttlesResult, driversResult] = results;

            // 1. Populate Stops / Routes
            if (stopsResult.status === "fulfilled" && stopsResult.value.ok) {
                const stops = await stopsResult.value.json();
                if (routeSelect && Array.isArray(stops)) {
                    const routeOptions = stops.flatMap(from =>
                        stops
                            .filter(to => from.stopId !== to.stopId)
                            .map(to => {
                                const label = `${from.stopName} -> ${to.stopName}`;
                                return `<option value="${label}">${label}</option>`;
                            })
                    );
                    routeSelect.innerHTML = routeOptions.join('');
                }
            } else {
                console.error("Failed to load stops asset:", stopsResult.reason || stopsResult.value?.statusText);
            }

            // 2. Populate Shuttles
            if (shuttlesResult.status === "fulfilled" && shuttlesResult.value.ok) {
                const shuttles = await shuttlesResult.value.json();
                if (shuttleSelect && Array.isArray(shuttles)) {
                    shuttleSelect.innerHTML = shuttles.map(s =>
                        `<option value="${s.shuttleId}">${s.shuttleName} (${s.licensePlate})</option>`
                    ).join('');
                }
            } else {
                console.error("Failed to load shuttles asset:", shuttlesResult.reason || shuttlesResult.value?.statusText);
            }

            // 3. Populate Drivers
            if (driversResult.status === "fulfilled" && driversResult.value.ok) {
                const drivers = await driversResult.value.json();
                if (driverSelect && Array.isArray(drivers)) {
                    driverSelect.innerHTML = drivers.map(d =>
                        `<option value="${d.driverId}">${d.fullName}</option>`
                    ).join('');
                }
            } else {
                console.error("Failed to load drivers asset:", driversResult.reason || driversResult.value?.statusText);
            }

        } catch (error) {
            console.error("Unexpected error populating form assets:", error);
            alert("Error communicating with database server. Please check your backend connection.");
        }
    }

    // --------------------------------------------------------------------
    // EDIT MODE: fetch the existing schedule and pre-fill the form
    // --------------------------------------------------------------------
    async function loadScheduleIntoForm(scheduleId) {
        try {
            const response = await fetch(`${apiBaseUrl}/schedules`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const schedules = await response.json();
            const schedule = schedules.find(
                s => String(s.scheduleId ?? s.scheduleID ?? s.id) === String(scheduleId)
            );

            if (!schedule) {
                alert("Schedule not found.");
                window.location.href = "schedule-shuttles.html";
                return;
            }

            // Match the route dropdown value (built as "From -> To")
            const fromStop = schedule.fromStop || "";
            const toStop = schedule.toStop || "";
            const routeValue = `${fromStop} -> ${toStop}`;
            if (routeSelect) {
                const match = Array.from(routeSelect.options).find(
                    opt => opt.value.trim().toLowerCase() === routeValue.trim().toLowerCase()
                );
                if (match) routeSelect.value = match.value;
            }

            const shuttleId = schedule.shuttleId ?? schedule.shuttleID;
            if (shuttleSelect && shuttleId != null) shuttleSelect.value = shuttleId;

            const driverId = schedule.driverId ?? schedule.driverID;
            if (driverSelect && driverId != null) driverSelect.value = driverId;

            const dateInput = document.getElementById("txtScheduleDate") || document.getElementById("runDate");
            const timeInput = document.getElementById("txtDepartureTime") || document.getElementById("clockTime");
            if (dateInput) dateInput.value = schedule.scheduleDate || "";
            if (timeInput) timeInput.value = schedule.departureTime || "";

            // Update page chrome to reflect edit mode
            const heading = document.querySelector(".form-header h2");
            if (heading) heading.textContent = "Edit Fleet Route Dispatch";

            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = "Save Changes";

        } catch (error) {
            console.error("Error loading schedule for edit:", error);
            alert("Failed to load schedule details.");
        }
    }

    if (scheduleForm) {
        scheduleForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            // Determine inputs (handles single dropdown vs split route inputs)
            const routeFromInput = document.getElementById("routeFrom");
            const routeToInput = document.getElementById("routeTo");

            let fromStop = "";
            let toStop = "";

            if (routeFromInput && routeToInput) {
                fromStop = routeFromInput.value.trim();
                toStop = routeToInput.value.trim();
            } else if (routeSelect && routeSelect.value) {
                const parts = routeSelect.value.split(" -> ");
                fromStop = parts[0] || "";
                toStop = parts[1] || "";
            }

            const dateInput = document.getElementById("txtScheduleDate") || document.getElementById("runDate");
            const timeInput = document.getElementById("txtDepartureTime") || document.getElementById("clockTime");
            const selectedShuttle = shuttleSelect?.value || document.getElementById("shuttleSelect")?.value;
            const selectedDriver = driverSelect?.value || document.getElementById("driverSelect")?.value;

            if (!fromStop || !toStop || !selectedShuttle || !selectedDriver || !dateInput?.value || !timeInput?.value) {
                alert("Please ensure all required fields are populated before saving.");
                return;
            }

            const payload = {
                FromStop: fromStop,
                ToStop: toStop,
                ScheduleDate: dateInput.value,
                DepartureTime: timeInput.value,
                ShuttleID: parseInt(selectedShuttle, 10),
                DriverID: parseInt(selectedDriver, 10)
            };

            // Use PUT + schedule id when editing, POST when creating
            const url = editScheduleId
                ? `${apiBaseUrl}/schedules/${editScheduleId}`
                : `${apiBaseUrl}/schedules`;
            const method = editScheduleId ? "PUT" : "POST";

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const result = await response.json().catch(() => ({}));

                if (response.ok && (result.success ?? true)) {
                    alert(editScheduleId ? "Schedule updated successfully." : "Fleet route dispatch successfully created.");
                    window.location.href = "schedule-shuttles.html";
                } else {
                    alert(`Failed to save dispatch allocation: ${result.message || "Unknown error occurred."}`);
                }
            } catch (error) {
                console.error("Network communication drop:", error);
                alert("Could not process submit packet. Confirm backend server connectivity.");
            }
        });
    }
});