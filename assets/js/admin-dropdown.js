const BOOKINGS_API_URL = '/api/admin/bookings';
const PROFILE_API_URL = '/api/admin/profile';
let activeAdminProfile = null;

// Controls the absolute menu overlay inside dashboard.html
function toggleDropdown(e) {
    if (e) e.stopPropagation();
    const globalDropdown = document.getElementById('adminGlobalDropdown');
    if (globalDropdown) globalDropdown.classList.toggle('show');
}

// Controls the sidebar profile dropup menu toggle
function toggleProfileMenu(e) {
    if (e) e.stopPropagation();
    else if (window.event) window.event.stopPropagation();

    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function executeLogout() {
    if (confirm("Log out of Admin Session?")) {
        window.location.href = "../Login.html";
    }
}

// Global window event listener to close menus on external clicks
window.addEventListener('click', function (e) {
    const topDropdown = document.getElementById('adminGlobalDropdown');
    if (topDropdown) topDropdown.classList.remove('show');

    const profileFooter = document.querySelector('.sidebar-profile-footer');
    if (profileFooter && !profileFooter.contains(e.target)) {
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) profileDropdown.classList.remove('show');
    }
});

// ==========================================================================
// ADMIN SETTINGS & SUPPORT MODAL EVENT HANDLERS
// ==========================================================================
window.openSettingsModal = function () {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('active');

        // Load any previously saved settings using synchronized keys
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

        // Save preferences
        localStorage.setItem('portalTheme', themeVal);
        localStorage.setItem('portalRefresh', refreshVal);

        // Apply theme color flip instantly
        if (themeVal === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Remove active display class
        modal.classList.remove('active');
    }
};

window.openSupportModal = function () {
    document.getElementById('supportModal')?.classList.add('active');
};

window.closeSupportModal = function () {
    document.getElementById('supportModal')?.classList.remove('active');
};

function handleLogout() {
    if (confirm("Are you sure you want to sign out of the GetYourRide portal workspace?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
    }
}

// Runs a continuous digital interval clock calculation 
function startLiveClock() {
    setInterval(() => {
        const clockElement = document.getElementById('liveClock');
        if (clockElement) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            clockElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }, 1000);
}

// Initialize clock loop routine on document runtime activation
document.addEventListener('DOMContentLoaded', startLiveClock);

async function loadAdminProfile() {
    // 🛡️ SAFEGUARD: If this is the Coordinator Portal, exit instantly and let coordinator data load safely
    if (document.getElementById('coordinatorNameLabel')) return;

    const nameLabel = document.getElementById('adminNameLabel');
    const emailLabel = document.getElementById('adminEmailLabel');

    try {
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email') || 'admin@getyourride.com';

        const targetUrl = `${window.location.origin}${PROFILE_API_URL}?email=${encodeURIComponent(loggedInEmail)}`;

        const response = await fetch(targetUrl);
        if (response.ok) {
            activeAdminProfile = await response.json();
            if (nameLabel) nameLabel.innerText = `${activeAdminProfile.fName} ${activeAdminProfile.lName}`;
            if (emailLabel) emailLabel.innerText = activeAdminProfile.email;
            return;
        }
        throw new Error('API route offline.');
    } catch (error) {
        console.warn('Using fallback data:', error);

        // This fallback matches your SQL schema seed data directly!
        activeAdminProfile = {
            fName: "Admin",
            lName: "User",
            email: "admin@getyourride.com",
            studentNumber: null,
            userID: 1,
            role: "Admin"
        };

        if (nameLabel) nameLabel.innerText = `${activeAdminProfile.fName} ${activeAdminProfile.lName}`;
        if (emailLabel) emailLabel.innerText = activeAdminProfile.email;
    }
}

async function loadDriverDashboard() {
    // 🛡️ SAFEGUARD: Do not search for bookings table if we are on the Coordinator homepage
    if (document.getElementById('coordinatorNameLabel')) return;

    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) return;

    try {
        const targetUrl = `${window.location.origin}${BOOKINGS_API_URL}`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Network fault.');

        const data = await response.json();
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="loading-state">No scheduled system bookings found for today.</td></tr>`;
            return;
        }

        data.forEach(booking => {
            const row = document.createElement('tr');
            let statusClass = 'status-booked';
            if (booking.status.toLowerCase() === 'boarded') statusClass = 'status-boarded';
            if (booking.status.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

            row.innerHTML = `
                <td><div class="student-profile"><div class="avatar-placeholder"></div><span>${booking.studentName}</span></div></td>
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

// Global page initialization trigger safely executing tasks
window.addEventListener('load', async () => {
    // Check if dark mode was previously saved and apply it immediately
    if (localStorage.getItem('portalTheme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Your existing page initializers below this line...
    const dateInput = document.getElementById('manifestDateFilter');
    if (dateInput) dateInput.valueAsDate = new Date();

    await loadAdminProfile();
    if (document.getElementById('bookingsTableBody')) {
        await loadDriverDashboard();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // Call the profile loader function on boot load
    loadCoordinatorSessionProfile();
});

async function loadCoordinatorSessionProfile() {
    try {
        // 🚌 Fetching the active coordinator user profile data context from session cache
        const response = await fetch("/api/coordinator/profile");

        if (response.ok) {
            // Assign explicitly to window frame context so data persists globally
            window.activeCoordinatorProfile = await response.json();
            const data = window.activeCoordinatorProfile;

            // 1. Update the sidebar profile footer details
            const nameLabel = document.getElementById("coordinatorNameLabel");
            const emailLabel = document.getElementById("coordinatorEmailLabel");

            if (nameLabel) nameLabel.textContent = data.fullName || `${data.fName} ${data.lName}`;
            if (emailLabel) emailLabel.textContent = data.email;

            // 2. Update the profile view modal input fields if they exist on the page
            const modalStaffNum = document.querySelector("#profileModal input[value='COORD-2026-88']");
            const modalEmail = document.querySelector("#profileModal input[value='coordinator@ride.com']");
            const modalHeadingName = document.querySelector("#profileModal h4");

            if (modalHeadingName) modalHeadingName.textContent = data.fullName || `${data.fName} ${data.lName}`;
            if (modalStaffNum && data.staffNumber) modalStaffNum.value = data.staffNumber;
            if (modalEmail && data.email) modalEmail.value = data.email;

        } else {
            console.warn("Session context not found. Redirecting to unauthorized safety fallback state.");
        }
    } catch (err) {
        console.error("Failed to stream active session context variables from database:", err);
    }
}
// ==========================================================================
// UNIFIED PROFILE MODAL LIFECYCLE HANDLERS
// ==========================================================================
window.openProfileModal = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // 1. Close and hide dropdown visual tray layout cleanly
    const dropdownMenu = document.getElementById("profileDropdown");
    if (dropdownMenu) {
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = "none";
    }

    // 2. Open modal display card layer (using class lists and inline blocks)
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.setProperty("display", "flex", "important");
    } else {
        console.error("Could not locate profile display container element markup.");
        return;
    }

    // 3. Extract loaded dataset profile context (Admin or explicit Coordinator window)
    const profileData = activeAdminProfile || window.activeCoordinatorProfile;

    if (profileData) {
        // Map elements to text containers dynamically
        const modalFullName = document.getElementById('modalFullName');
        if (modalFullName) {
            modalFullName.innerText = profileData.fullName || `${profileData.fName} ${profileData.lName}`;
        }

        const modalEmail = document.getElementById('modalEmail');
        if (modalEmail) {
            modalEmail.innerText = profileData.email;
        }

        const modalIdNumber = document.getElementById('modalIdNumber');
        if (modalIdNumber) {
            modalIdNumber.innerText = profileData.studentNumber || profileData.employeeId || profileData.staffNumber || `COORD-${profileData.userID || profileData.userId}`;
        }

        const modalRole = document.getElementById('modalRole');
        const modalAssignedRole = document.getElementById('modalAssignedRole');
        const displayRole = profileData.role === "Admin" ? "Head System Administrator" : (profileData.role || "Shuttle Coordinator");

        if (modalRole) modalRole.innerText = displayRole;
        if (modalAssignedRole) modalAssignedRole.innerText = displayRole;
    } else {
        // Safe UI Fallback strings if profile queries are pending network response windows
        const sidebarName = document.getElementById("coordinatorNameLabel")?.innerText || "Shuttle Coordinator";
        const sidebarEmail = document.getElementById("coordinatorEmailLabel")?.innerText || "coordinator@ride.com";

        if (document.getElementById('modalFullName')) document.getElementById('modalFullName').innerText = sidebarName;
        if (document.getElementById('modalEmail')) document.getElementById('modalEmail').innerText = sidebarEmail;
        if (document.getElementById('modalIdNumber')) document.getElementById('modalIdNumber').innerText = "COORD-2026-88";
        if (document.getElementById('modalRole')) document.getElementById('modalRole').innerText = "Shuttle Coordinator";
    }
};

window.closeProfileModal = function () {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.setProperty("display", "none", "important");
    }
};