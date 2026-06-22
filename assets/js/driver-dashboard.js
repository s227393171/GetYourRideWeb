const BOOKINGS_API_URL = '/api/driver/bookings';
const PROFILE_API_URL = '/api/driver/profile';
let activeDriverProfile = null;

// 1. Fetch Dynamic User Session Metrics from Database
async function loadDriverProfile() {
    try {
        // 1. Look directly at the URL bar (e.g., dashboard.html?email=jordan@ride.com)
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email');

        // 2. Fallback only if someone goes directly to dashboard.html without logging in
        if (!loggedInEmail) {
            loggedInEmail = 'driver@ride.com';
        }

        // 3. Request the profile from the backend
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

// 2. Fetch Assigned Manifest bookings from Database
async function loadDriverDashboard() {
    const tableBody = document.getElementById('bookingsTableBody');

    try {
        const targetUrl = `${window.location.origin}${BOOKINGS_API_URL}`;
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

            let routeClass = 'route-campus';
            if (booking.routeName.toUpperCase().includes('DOWNTOWN')) routeClass = 'route-downtown';
            if (booking.routeName.toUpperCase().includes('MED')) routeClass = 'route-med';

            row.innerHTML = `
                <td>
                    <div class="student-profile">
                        <div class="avatar-placeholder"></div>
                        <span>${booking.studentName}</span>
                    </div>
                </td>
                <td><span class="student-num">${booking.studentNumber}</span></td>
                <td>${booking.shuttle}</td>
                <td><span class="route-tag ${routeClass}">${booking.routeName}</span></td>
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
    alert(`Filtering manifest list to matches for date: ${filterValue}`);
}

function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('liveClock').innerText = now.toLocaleTimeString();
    }, 1000);
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
defineModalToggle('Settings'); defineModalToggle('Support');

// Helper generator utility
function defineModalToggle(name) {
    window[`open${name}Modal`] = () => document.getElementById(`${name.toLowerCase()}Modal`).classList.add('active');
    window[`close${name}Modal`] = () => document.getElementById(`${name.toLowerCase()}Modal`).classList.remove('active');
}

function handleLogout() {
    if (confirm("Are you sure you want to sign out of the GetYourRide portal workspace?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
    }
}

window.addEventListener('click', function (e) {
    const trigger = document.querySelector('.profile-trigger-area');
    if (trigger && !trigger.contains(e.target)) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

// Structural initialization triggers
window.onload = async function () {
    startLiveClock();
    const dateInput = document.getElementById('manifestDateFilter');
    if (dateInput) dateInput.valueAsDate = new Date();
    await loadDriverProfile();
    await loadDriverDashboard();
};