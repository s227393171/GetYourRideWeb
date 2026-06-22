// Local dev running ports mapping URLs
// By removing 'http://localhost:5000', the browser automatically requests from your active running port!
const BOOKINGS_API_URL = '/api/driver/bookings';
const PROFILE_API_URL = '/api/driver/profile';
// Keeps tracking reference of active record context loaded directly from database entity
let activeDriverProfile = null;

// 1. Fetch User Session Metrics from the Backend MySQL instance
async function loadDriverProfile() {
    try {
        const response = await fetch(PROFILE_API_URL);
        if (!response.ok) throw new Error('Database down.');

        activeDriverProfile = await response.json();

        // Dynamically populates tracking targets layout elements
        document.getElementById('driverNameLabel').innerText = activeDriverProfile.fullName;
        document.getElementById('driverEmailLabel').innerText = activeDriverProfile.email;
    } catch (error) {
        console.error('Error fetching driver details:', error);
        document.getElementById('driverNameLabel').innerText = "Session User Offline";
    }
}

// 2. Fetch Assigned Manifest bookings from the Backend MySQL instance
async function loadDriverDashboard() {
    const tableBody = document.getElementById('bookingsTableBody');

    try {
        const response = await fetch(BOOKINGS_API_URL);
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
                <td>Shuttle Alpha</td>
                <td><span class="route-tag ${routeClass}">${booking.routeName}</span></td>
                <td><strong>${booking.departureTime}</strong></td>
                <td>Oct 24, 2026</td>
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

// Dropdown Toggles UI Layer Controllers
function toggleProfileMenu() {
    document.getElementById('profileDropdown').classList.toggle('show');
}

function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('profileDropdown').classList.remove('show');

    // Safety check ensuring data object hydrated completely out of async pipeline tasks before population
    if (activeDriverProfile) {
        document.getElementById('modalFullName').innerText = activeDriverProfile.fullName;
        document.getElementById('modalEmail').innerText = activeDriverProfile.email;
        document.getElementById('modalIdNumber').innerText = activeDriverProfile.idNumber;
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function handleLogout() {
    if (confirm("Are you sure you want to sign out of the GetYourRide portal workspace?")) {
        window.location.href = "../Login.html";
    }
}

// Window interceptor checking click distributions to clear flyouts
window.addEventListener('click', function (e) {
    const trigger = document.querySelector('.profile-trigger-area');
    if (trigger && !trigger.contains(e.target)) {
        document.getElementById('profileDropdown').classList.remove('show');
    }
});

// Structural initialization lifecycles entry workflow triggers
window.onload = async function () {
    await loadDriverProfile();
    await loadDriverDashboard();
};