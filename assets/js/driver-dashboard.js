const BOOKINGS_API_URL = '/api/driver/bookings';
const PROFILE_API_URL = '/api/driver/profile';
let activeDriverProfile = null;
let loggedInDriverEmail = null; // FIX: shared across functions so bookings can be filtered per-driver

// ==========================================================================
// 1. Fetch Dynamic User Session Metrics from Database
// ==========================================================================
async function loadDriverProfile() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email');

        if (!loggedInEmail) {
            loggedInEmail = localStorage.getItem('userEmail') || 'driver@ride.com';
        }

        loggedInDriverEmail = loggedInEmail;

        const targetUrl = `${window.location.origin}${PROFILE_API_URL}?email=${encodeURIComponent(loggedInEmail)}`;

        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Profile response status not ok.');

        activeDriverProfile = await response.json();

        document.getElementById('driverNameLabel').innerText = activeDriverProfile.fullName;
        document.getElementById('driverEmailLabel').innerText = activeDriverProfile.email;
    } catch (error) {
        console.error('Error fetching driver details:', error);
        document.getElementById('driverNameLabel').innerText = "Session User Offline";
        document.getElementById('driverEmailLabel').innerText = "connecting to database...";
    }
}

// ==========================================================================
// 2. Fetch Assigned Manifest bookings from Database
// ==========================================================================
async function loadDriverDashboard() {
    const tableBody = document.getElementById('bookingsTableBody');

    try {
        const emailToUse = loggedInDriverEmail || activeDriverProfile?.email;
        const targetUrl = emailToUse
            ? `${window.location.origin}${BOOKINGS_API_URL}?email=${encodeURIComponent(emailToUse)}`
            : `${window.location.origin}${BOOKINGS_API_URL}`;

        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Network fault.');

        const data = await response.json();
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="loading-state">No scheduled bookings found for today.</td></tr>`;
            return;
        }

        data.forEach(booking => {
            const row = document.createElement('tr');

            let statusClass = 'status-booked';
            if (booking.status.toLowerCase() === 'boarded') statusClass = 'status-boarded';
            if (booking.status.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

            row.innerHTML = `
                <td>
                    <div class="student-profile">
                        <div class="avatar-placeholder"></div>
                        <span>${booking.studentName}</span>
                    </div>
                </td>
                <td><span class="student-num">${booking.studentNumber}</span></td>
                <td>${booking.shuttle}</td>

                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: #1e293b;">${booking.departureFrom}</span>
                        <span style="color: #94a3b8; font-size: 12px;">➔</span>
                        <span style="font-weight: 600; color: #64748b;">${booking.arrivalAt}</span>
                    </div>
                </td>

                <td><strong>${booking.departureTime}</strong></td>
                <td>${booking.bookingDate}</td>
                <td><span class="badge ${statusClass}">${booking.status}</span></td>
                <td class="actions-cell">&#8942;</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching dashboard records:', error);
        tableBody.innerHTML = `<tr><td colspan="8" class="error-state">Failed to load system bookings data.</td></tr>`;
    }
}

// ==========================================================================
// REAL-TIME SEARCHING & DATE FILTER ENGINE
// ==========================================================================
function filterTable() {
    const input = document.getElementById("tableSearch").value.toUpperCase();
    const rows = document.getElementById("bookingsTableBody").getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const nameCell = rows[i].getElementsByTagName("td")[0];
        if (nameCell) {
            const txtValue = nameCell.textContent || nameCell.innerText;
            rows[i].style.display = txtValue.toUpperCase().indexOf(input) > -1 ? "" : "none";
        }
    }
}

function filterByDate() {
    const filterValue = document.getElementById("manifestDateFilter").value;
    // FIX: replaced native alert() with the custom popup
    showInfoPopup("Manifest Filtered", `Showing matches for date: ${filterValue}`);
}

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('liveClock').innerText = now.toLocaleTimeString();
    }, 1000);
}

// ==========================================================================
// GENERIC CUSTOM POPUP (replaces native alert())
// Built dynamically so no extra HTML markup is required in the page.
// ==========================================================================
function ensureInfoPopupMarkup() {
    if (document.getElementById('infoPopupModal')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'infoPopupModal';
    wrapper.className = 'modal-backdrop';
    wrapper.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:1000; align-items:center; justify-content:center;';

    wrapper.innerHTML = `
        <div class="modal-card cute-logout-card" style="background:#ffffff; padding:32px; border-radius:20px; width:100%; max-width:400px; text-align:center; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); animation: scaleUp 0.25s ease-out;">
            <div id="infoPopupIcon" style="width:56px; height:56px; margin:0 auto 16px; border-radius:50%; background:#eff6ff; display:flex; align-items:center; justify-content:center; color:#3b82f6;"></div>
            <h3 id="infoPopupTitle" style="margin:0 0 8px 0; color:#1e293b; font-size:20px; font-weight:700;"></h3>
            <p id="infoPopupMessage" style="color:#64748b; font-size:14px; margin:0 0 24px 0;"></p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button onclick="closeInfoPopup()" style="flex:1; padding:12px 16px; border-radius:10px; border:none; background:#3b82f6; color:#ffffff; font-weight:600; cursor:pointer; transition:background 0.2s;">Got it</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
}

// Small inline SVG icon set — avoids emoji, renders consistently across platforms
const POPUP_ICONS = {
    info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
};

function showInfoPopup(title, message, iconKey = 'info') {
    ensureInfoPopupMarkup();
    document.getElementById('infoPopupTitle').innerText = title;
    document.getElementById('infoPopupMessage').innerText = message;
    document.getElementById('infoPopupIcon').innerHTML = POPUP_ICONS[iconKey] || POPUP_ICONS.info;
    document.getElementById('infoPopupModal').style.display = 'flex';
}

function closeInfoPopup() {
    const modal = document.getElementById('infoPopupModal');
    if (modal) modal.style.display = 'none';
}

// ==========================================================================
// INTERFACE MODAL WINDOW CONTROLLERS
// ==========================================================================
function toggleProfileMenu() {
    document.getElementById('profileDropdown').classList.toggle('show');
}

function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('profileDropdown').classList.remove('show');
    if (activeDriverProfile) {
        document.getElementById('modalFullName').innerText = activeDriverProfile.fullName;
        document.getElementById('modalEmail').innerText = activeDriverProfile.email;
        document.getElementById('modalIdNumber').innerText = activeDriverProfile.idNumber;
    }
}

function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }

defineModalToggle('Settings');
defineModalToggle('Support');

function defineModalToggle(name) {
    window[`open${name}Modal`] = () => document.getElementById(`${name.toLowerCase()}Modal`).classList.add('active');
    window[`close${name}Modal`] = () => document.getElementById(`${name.toLowerCase()}Modal`).classList.remove('active');
}

// ==========================================================================
// LOGOUT — now driven by the custom "logoutModal" popup instead of confirm()
// ==========================================================================
function handleLogout() {
    // FIX: was window.confirm(); now opens the custom logout popup
    openLogoutModal();
}

function openLogoutModal() {
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

window.addEventListener('click', function (e) {
    const trigger = document.querySelector('.profile-trigger-area');
    if (trigger && !trigger.contains(e.target)) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

// ==========================================================================
// Structural initialization triggers
// ==========================================================================
window.onload = async function () {
    startLiveClock();
    const dateInput = document.getElementById('manifestDateFilter');
    if (dateInput) dateInput.valueAsDate = new Date();
    await loadDriverProfile();   // FIX: must run first so loggedInDriverEmail is set
    await loadDriverDashboard();
};

window.openSettingsModal = function () {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('active');

        if (localStorage.getItem('portalTheme') && document.getElementById('themeSelect')) {
            document.getElementById('themeSelect').value = localStorage.getItem('portalTheme');
        }
        if (localStorage.getItem('portalRefresh') && document.getElementById('refreshSelect')) {
            document.getElementById('refreshSelect').value = localStorage.getItem('portalRefresh');
        }
    }
};

window.closeSettingsModal = function () {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        const themeVal = document.getElementById('themeSelect')?.value || 'light';
        const refreshVal = document.getElementById('refreshSelect')?.value || 'manual';

        localStorage.setItem('portalTheme', themeVal);
        localStorage.setItem('portalRefresh', refreshVal);

        if (themeVal === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        modal.classList.remove('active');
    }
};

window.openSupportModal = function () {
    document.getElementById('supportModal')?.classList.add('active');
};
window.closeSupportModal = function () {
    document.getElementById('supportModal')?.classList.remove('active');
};