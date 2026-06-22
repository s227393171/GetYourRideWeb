const DRIVER_RATINGS_API = '/api/admin/driver-ratings';
let globalDriversCached = [];

async function loadDriverRatingsData() {
    try {
        const response = await fetch(DRIVER_RATINGS_API);
        if (!response.ok) throw new Error("Database sync dropped.");
        globalDriversCached = await response.json();
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
        starsHtml += (i <= roundedRating) ? `<span class="star-color">★</span>` : `<span style="color: #cbd5e1;">★</span>`;
    }
    return starsHtml;
}

function renderRatingsTable(driversList) {
    const tableBody = document.getElementById('driverRatingsTableBody');
    tableBody.innerHTML = '';

    if (driversList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No active records found.</td></tr>`;
        return;
    }

    driversList.forEach(driver => {
        const row = document.createElement('tr');
        let actionCellHtml = `<button class="btn-action" onclick="alert('Opening logs for ${driver.fullName}')">View Details</button>`;
        let flagAlertText = "";

        if (driver.averageRating < 3.0) {
            actionCellHtml = `<button class="btn-action review-required" onclick="alert('Flagged audit initialized for ${driver.fullName}')">Review Driver</button>`;
            flagAlertText = `<span style="color:#ef4444; display:block; font-size:10px; font-weight:700; margin-top:2px;">⚠️ Performance Flag</span>`;
        }

        const initials = driver.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; background:#1e293b; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600;">${initials}</div>
                    <div><strong>${driver.fullName}</strong><span class="driver-meta">Joined ${driver.joinDateText}</span>${flagAlertText}</div>
                </div>
            </td>
            <td><span style="color:#64748b; font-weight:500;">${driver.studentNumber}</span></td>
            <td><span class="rating-highlight">${driver.averageRating.toFixed(1)}</span> ${generateStarRatingHtml(driver.averageRating)}</td>
            <td>${driver.totalTrips.toLocaleString()}</td>
            <td>${driver.totalRatingsCount.toLocaleString()}</td>
            <td>${actionCellHtml}</td>
        `;
        tableBody.appendChild(row);
    });
    document.getElementById('showingEntriesCount').innerText = `Showing ${driversList.length} operational record entries`;
}

function calculateSummaryMetrics(drivers) {
    document.getElementById('metricActiveDrivers').innerText = drivers.length;
    let totalTrips = 0, sumRatings = 0, criticalFlags = 0;

    drivers.forEach(d => {
        totalTrips += d.totalTrips;
        sumRatings += d.averageRating;
        if (d.averageRating < 3.0) criticalFlags++;
    });

    const averageScore = drivers.length > 0 ? (sumRatings / drivers.length) : 0;
    document.getElementById('metricAverageRating').innerText = averageScore.toFixed(2);
    document.getElementById('metricTotalTrips').innerText = totalTrips.toLocaleString();
    document.getElementById('metricFlagsCount').innerText = String(criticalFlags).padStart(2, '0');
}

function searchDrivers() {
    const term = document.getElementById('globalSearchInput').value.toUpperCase();
    renderRatingsTable(globalDriversCached.filter(d => d.fullName.toUpperCase().includes(term) || d.studentNumber.toUpperCase().includes(term)));
}

// Global UI Navigation Controllers
function toggleDropdown(e) { e.stopPropagation(); document.getElementById('adminGlobalDropdown').classList.toggle('show'); }
function executeLogout() { if (confirm("Log out of Admin Session?")) window.location.href = "../Login.html"; }
window.addEventListener('click', function () { const d = document.getElementById('adminGlobalDropdown'); if (d) d.classList.remove('show'); });

window.onload = () => { loadDriverRatingsData(); };