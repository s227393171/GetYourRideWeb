const DRIVER_RATINGS_API = '/api/admin/driver-ratings';
let globalDriversCached = [];

async function loadDriverRatingsData() {
    try {
        const response = await fetch(DRIVER_RATINGS_API);
        if (!response.ok) throw new Error("Database sync dropped.");
        const rawData = await response.json();

        // This screen is dedicated to STUDENT DRIVERS only — exclude
        // shuttle drivers and any other roles.
        globalDriversCached = (rawData || []).filter(d => {
            const role = (d.role || '').toUpperCase();
            return role === 'STUDENT_DRIVER' || role === 'STUDENT';
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
        const role = (driver.role || '').toUpperCase();
        const avgRating = parseFloat(driver.averageRating ?? driver.avgRating ?? 0);
        const trips = driver.totalTrips ?? driver.trips ?? 0;
        const totalRatings = driver.totalRatingsCount ?? driver.totalRatings ?? 0;
        const joinDate = driver.joinDateText || driver.joinedDate || "N/A";
        const driverId = driver.driverId || driver.id;

        const safeName = name.replace(/'/g, "\\'");

        // role badge HTML
        let roleLabel = 'Unknown';
        const roleUpper = (role || '').toUpperCase();
        if (roleUpper === 'SHUTTLE_DRIVER' || roleUpper === 'SHUTTLE') roleLabel = 'Shuttle Driver';
        else if (roleUpper === 'STUDENT_DRIVER' || roleUpper === 'STUDENT') roleLabel = 'Student Driver';
        else if (roleUpper) roleLabel = roleUpper.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase());

        const roleBadgeHtml = `<span class="role-badge" style="margin-left:8px; background:#eef2ff; color:#334155; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px;">${roleLabel}</span>`;

        // Navigate to dedicated driver details page instead of opening an in-page modal
        let actionCellHtml = `<a class="btn-review-profile" href="driver-details.html?id=${driverId}">View Details</a>`;
        let flagAlertText = "";

        if (avgRating > 0 && avgRating < 3.0) {
            actionCellHtml = `<button class="btn-review-driver" onclick="triggerAudit(this, '${safeName}')">Review Driver</button>`;
            flagAlertText = `<span style="color:#ef4444; display:block; font-size:10px; font-weight:700; margin-top:2px;">⚠️ Rating Alert</span>`;
        }

        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        row.innerHTML = `
            <td>
                <div class="recent-driver-cell">
                    <div class="recent-avatar">${initials}</div>
                    <div>
                        <div class="recent-driver-name">${name}${roleBadgeHtml}</div>
                        <div class="recent-muted" style="font-size:11px;">Joined ${joinDate}</div>
                        ${flagAlertText}
                    </div>
                </div>
            </td>
            <td><span class="verify-student-num">${displayId}</span></td>
            <!-- role column removed per undo request -->
            <td><span class="rating-highlight">${avgRating.toFixed(1)}</span> ${generateStarRatingHtml(avgRating)}</td>
            <td class="recent-muted">${trips.toLocaleString()}</td>
            <td class="recent-muted">${totalRatings.toLocaleString()}</td>
            <td class="recent-actions">${actionCellHtml}</td>
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
    const flagsEl = document.getElementById('metricPoorFlags');

    if (activeEl) activeEl.innerText = drivers.length;

    let totalTrips = 0, sumRatings = 0, ratedDriverCount = 0, poorFlags = 0;

    drivers.forEach(d => {
        const avg = parseFloat(d.averageRating ?? d.avgRating ?? 0);
        const trips = d.totalTrips ?? d.trips ?? 0;

        totalTrips += trips;
        if (avg > 0) {
            sumRatings += avg;
            ratedDriverCount++;
            if (avg < 3.0) poorFlags++;
        }
    });

    const averageScore = ratedDriverCount > 0 ? (sumRatings / ratedDriverCount) : 0;

    if (avgRatingEl) avgRatingEl.innerText = averageScore.toFixed(2);
    if (tripsEl) tripsEl.innerText = totalTrips.toLocaleString();
    if (flagsEl) flagsEl.innerText = String(poorFlags).padStart(2, '0');
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

function handleLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
    document.getElementById('profileDropdown')?.classList.remove('show');
}
function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}
function confirmLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
}