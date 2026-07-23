const DRIVER_RATINGS_API = '/api/admin/driver-ratings';
let globalDriversCached = [];

async function loadDriverRatingsData() {
    try {
        const response = await fetch(DRIVER_RATINGS_API);
        if (!response.ok) throw new Error("Database sync dropped.");
        const rawData = await response.json();

        // 🎯 FIX: Exclude student drivers dynamically
        globalDriversCached = (rawData || []).filter(driver => {
            const role = (driver.role || "").toUpperCase();
            const email = (driver.email || "").toLowerCase();
            if (role === "STUDENT_DRIVER" || role === "STUDENT") return false;
            if (/^s\d+@/i.test(email) || email.endsWith("@mandela.ac.za")) return false;
            return true;
        });

        renderRatingsTable(globalDriversCached);
        calculateSummaryMetrics(globalDriversCached);
    } catch (error) {
        console.error(error);
        document.getElementById('driverRatingsTableBody').innerHTML =
            `<tr><td colspan="6" style="color:red; text-align:center; font-weight:600; padding:20px;">API Connectivity Error.</td></tr>`;
    }
}

function generateStarRatingHtml(rating) {
    const roundedRating = Math.round(rating);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += (i <= roundedRating) ? `<span class="star-color" style="color: #f59e0b;">★</span>` : `<span style="color: #cbd5e1;">★</span>`;
    }
    return starsHtml;
}

function renderRatingsTable(driversList) {
    const tableBody = document.getElementById('driverRatingsTableBody');
    tableBody.innerHTML = '';

    if (!driversList || driversList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No active operational drivers found.</td></tr>`;
        return;
    }

    driversList.forEach(driver => {
        const row = document.createElement('tr');

        const name = driver.fullName || driver.driverName || "Unknown Driver";
        const displayId = driver.studentNumber || driver.idNumber || `DRV-${driver.driverId || driver.id}`;
        const avgRating = parseFloat(driver.averageRating ?? driver.avgRating ?? 0);
        const trips = driver.totalTrips ?? driver.trips ?? 0;
        const totalRatings = driver.totalRatingsCount ?? driver.totalRatings ?? 0;
        const joinDate = driver.joinDateText || driver.joinedDate || "N/A";
        const driverId = driver.driverId || driver.id;

        const safeName = name.replace(/'/g, "\\'");

        let actionCellHtml = `<button class="btn-action" onclick="openDriverDetailsModal(${driverId}, '${safeName}', '${displayId}', '${joinDate}')">View Details</button>`;
        let flagAlertText = "";

        if (avgRating > 0 && avgRating < 3.0) {
            actionCellHtml = `<button class="btn-action review-required" onclick="triggerAudit(this, '${safeName}')">Review Driver</button>`;
            flagAlertText = `<span style="color:#ef4444; display:block; font-size:10px; font-weight:700; margin-top:2px;">⚠️ Performance Flag</span>`;
        }

        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; background:#1e293b; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600;">${initials}</div>
                    <div><strong>${name}</strong><br><span class="driver-meta" style="font-size:11px; color:#64748b;">Joined ${joinDate}</span>${flagAlertText}</div>
                </div>
            </td>
            <td><span style="color:#64748b; font-weight:500;">${displayId}</span></td>
            <td><span class="rating-highlight" style="font-weight:bold;">${avgRating.toFixed(1)}</span> ${generateStarRatingHtml(avgRating)}</td>
            <td>${trips.toLocaleString()}</td>
            <td>${totalRatings.toLocaleString()}</td>
            <td>${actionCellHtml}</td>
        `;
        tableBody.appendChild(row);
    });

    const entriesEl = document.getElementById('showingEntriesCount');
    if (entriesEl) {
        entriesEl.innerText = `Showing ${driversList.length} operational record entries`;
    }
}

function calculateSummaryMetrics(drivers) {
    const activeEl = document.getElementById('metricActiveDrivers');
    const avgRatingEl = document.getElementById('metricAverageRating');
    const tripsEl = document.getElementById('metricTotalTrips');
    const flagsEl = document.getElementById('metricFlagsCount');

    if (activeEl) activeEl.innerText = drivers.length;

    let totalTrips = 0, sumRatings = 0, ratedDriverCount = 0, criticalFlags = 0;

    drivers.forEach(d => {
        const avg = parseFloat(d.averageRating ?? d.avgRating ?? 0);
        const trips = d.totalTrips ?? d.trips ?? 0;

        totalTrips += trips;
        if (avg > 0) {
            sumRatings += avg;
            ratedDriverCount++;
        }
        if (avg > 0 && avg < 3.0) criticalFlags++;
    });

    const averageScore = ratedDriverCount > 0 ? (sumRatings / ratedDriverCount) : 0;

    if (avgRatingEl) avgRatingEl.innerText = averageScore.toFixed(2);
    if (tripsEl) tripsEl.innerText = totalTrips.toLocaleString();
    if (flagsEl) flagsEl.innerText = String(criticalFlags).padStart(2, '0');
}

function searchDrivers() {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;
    const term = input.value.toUpperCase();
    const filtered = globalDriversCached.filter(d => {
        const name = (d.fullName || d.driverName || "").toUpperCase();
        const idNum = (d.studentNumber || d.idNumber || d.employeeId || "").toUpperCase();
        return name.includes(term) || idNum.includes(term);
    });
    renderRatingsTable(filtered);
}

// Global UI Navigation Controllers
function toggleDropdown(e) { e.stopPropagation(); document.getElementById('adminGlobalDropdown')?.classList.toggle('show'); }
function executeLogout() { if (confirm("Log out of Admin Session?")) window.location.href = "../Login.html"; }

window.addEventListener('click', function () {
    const d = document.getElementById('adminGlobalDropdown');
    if (d) d.classList.remove('show');
});

window.onload = () => { loadDriverRatingsData(); };

function showAuditToast(driverName) {
    const existing = document.getElementById("toastNotification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "toastNotification";
    toast.className = "toast-banner toast-warning";
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">⚠️</span>
            <div>
                <strong>Flagged Audit Initialized</strong>
                <p>Performance review triggered for <b>${driverName}</b></p>
            </div>
        </div>
        <button onclick="this.parentElement.remove()" class="toast-close">✕</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function triggerAudit(buttonElement, driverName) {
    buttonElement.style.pointerEvents = 'none';
    buttonElement.style.opacity = '0.7';
    buttonElement.innerHTML = `⏳ Initializing Audit...`;

    setTimeout(() => {
        buttonElement.className = "badge-status badge-audit-active";
        buttonElement.innerHTML = `🛡️ Audit Active`;
        showAuditToast(driverName);
    }, 900);
}

async function openDriverDetailsModal(driverId, name, displayId, joinDate) {
    document.getElementById("ddModalName").innerText = name;
    document.getElementById("ddModalMeta").innerText = `${displayId} · Joined ${joinDate}`;

    const tbody = document.getElementById("ddModalTripsBody");
    tbody.innerHTML = `<tr><td colspan="4" style="padding:12px; text-align:center; color:#64748b;">Loading trips...</td></tr>`;

    const modal = document.getElementById("driverDetailsModal");
    modal.classList.add("show");

    try {
        const response = await fetch(`/api/admin/drivers/${driverId}/trips`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const trips = await response.json();

        if (!trips || trips.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding:12px; text-align:center; color:#64748b;">No trips found for this driver.</td></tr>`;
            return;
        }

        tbody.innerHTML = trips.map(t => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px;">${t.departureStop || t.route || 'Route'} ➔ ${t.destinationStop || ''}</td>
                <td style="padding:8px;">${t.departureTime || t.date || 'N/A'}</td>
                <td style="padding:8px;"><span class="badge">${t.status || 'SCHEDULED'}</span></td>
                <td style="padding:8px;">${t.rating != null ? t.rating + " ★" : "—"}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Error loading driver trips:", err);
        tbody.innerHTML = `<tr><td colspan="4" style="padding:12px; text-align:center; color:#ef4444;">⚠️ Unable to load trip history.</td></tr>`;
    }
}

function closeDriverDetailsModal() {
    document.getElementById("driverDetailsModal").classList.remove("show");
}

function handleOverlayClick(e) {
    if (e.target.id === "driverDetailsModal") {
        closeDriverDetailsModal();
    }
}