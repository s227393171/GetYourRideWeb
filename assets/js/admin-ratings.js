const DRIVER_RATINGS_API = '/api/admin/driver-ratings';
let globalDriversCached = [];

async function loadDriverRatingsData() {
    try {
        const response = await fetch(DRIVER_RATINGS_API);
        if (!response.ok) throw new Error("Database sync dropped.");
        const rawData = await response.json();

       
        // Load all drivers from the API (show every driver in the database)
        globalDriversCached = rawData || [];

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
        // Load driver profile (includes documents and vehicle info)
        const profileResp = await fetch(`/api/admin/drivers/${driverId}`);
        if (!profileResp.ok) throw new Error('Profile fetch failed');
        const profile = await profileResp.json();

        // Inject profile info into modal
        document.getElementById('ddAvatar').innerText = (name.split(' ').map(p=>p[0]).join('').substring(0,2)).toUpperCase();
        document.getElementById('ddModalMeta').innerText = `${displayId} · ${profile.email || ''}`;
        document.getElementById('ddContact').innerText = profile.contactNumber || 'N/A';
        document.getElementById('ddVehicle').innerText = profile.vehicleMakeModel || 'Unassigned';
        document.getElementById('ddSeating').innerText = profile.seatingCapacity ? `${profile.seatingCapacity} Passengers` : 'N/A';
        document.getElementById('ddStatus').innerText = profile.applicationStatus || 'Active';
        document.getElementById('ddReg').innerText = profile.registrationNumber || 'N/A';
        document.getElementById('ddColor').innerText = profile.vehicleColor || 'N/A';

        // License preview/link
        const licensePreview = document.getElementById('ddLicensePreview');
        const licenseLink = document.getElementById('ddLicenseLink');
        if (profile.licenseImagePath) {
            licensePreview.innerHTML = `<img src="${profile.licenseImagePath}" alt="License" style="max-height:76px; max-width:100%; object-fit:contain;">`;
            licenseLink.href = profile.licenseImagePath;
            licenseLink.classList.remove('doc-link--disabled');
            licenseLink.removeAttribute('aria-disabled');
        } else {
            licensePreview.innerHTML = `<div style="color:#94a3b8;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 9h10M7 13h6"></path></svg><div style="margin-top:6px; font-weight:600;">No document uploaded</div></div>`;
            licenseLink.removeAttribute('href');
            licenseLink.classList.add('doc-link--disabled');
            licenseLink.setAttribute('aria-disabled','true');
        }

        // Registration preview/link
        const regPreview = document.getElementById('ddRegPreview');
        const regLink = document.getElementById('ddRegLink');
        if (profile.registrationFilePath) {
            regPreview.innerHTML = `<img src="${profile.registrationFilePath}" alt="Registration" style="max-height:76px; max-width:100%; object-fit:contain;">`;
            regLink.href = profile.registrationFilePath;
            regLink.classList.remove('doc-link--disabled');
            regLink.removeAttribute('aria-disabled');
        } else {
            regPreview.innerHTML = `<div style="color:#94a3b8;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path></svg><div style="margin-top:6px; font-weight:600;">No document uploaded</div></div>`;
            regLink.removeAttribute('href');
            regLink.classList.add('doc-link--disabled');
            regLink.setAttribute('aria-disabled','true');
        }

        // Load trips
        const response = await fetch(`/api/admin/drivers/${driverId}/trips`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const trips = await response.json();

        const tripsContainer = document.getElementById('ddTripsList');
        if (!trips || trips.length === 0) {
            tripsContainer.innerHTML = `<div style="text-align:center; color:#64748b; padding:18px;">No trips found for this driver.</div>`;
            return;
        }

        tripsContainer.innerHTML = trips.map(t => {
            const status = (t.status || 'SCHEDULED').toLowerCase();
            const statusCls = status === 'completed' ? 'status-badge status-completed' : (status === 'cancelled' ? 'status-badge status-cancelled' : 'status-badge status-pending');
            const ratingHtml = t.rating != null ? `<div style="color:#f59e0b; font-weight:700;">★ ${t.rating.toFixed(1)}</div><div style="font-style:italic; color:#334155;">"${t.review || ''}"</div>` : (status === 'cancelled' ? '<div style="color:#64748b;">No review — trip was cancelled</div>' : '<div style="color:#64748b;">Upcoming trip — not yet completed</div>');
            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px;">${t.departureStop || t.route || 'Route'} ➔ ${t.destinationStop || ''}</td>
                    <td style="padding:8px;">${t.departureTime || t.departure_time || t.date || 'N/A'}</td>
                    <td style="padding:8px;"><span class="${statusCls}">${t.status || (status === 'completed' ? 'Completed' : 'Scheduled')}</span></td>
                    <td style="padding:8px;">${t.rating != null ? t.rating + ' ★' : '—'}</td>
                </tr>
            `;
        }).join('');
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