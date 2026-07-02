const COORDINATOR_PROFILE_API_URL = '/api/coordinator/profile'; // Your endpoint
// 🚌 FIX: Change 'let' to 'window.' so other scripts can read this data context
window.activeCoordinatorProfile = null;
// Add these control functions to your file
function openProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "flex", "important");
}

function closeProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "none", "important");
}

// Inside your loadCoordinatorProfile() function, make sure these assignments exist:
if (document.getElementById('modalFullName')) document.getElementById('modalFullName').innerText = activeCoordinatorProfile.fullName;
if (document.getElementById('modalIdNumber')) document.getElementById('modalIdNumber').innerText = activeCoordinatorProfile.employeeId;
if (document.getElementById('modalEmail')) document.getElementById('modalEmail').innerText = activeCoordinatorProfile.email;
if (document.getElementById('modalRole')) document.getElementById('modalRole').innerText = activeCoordinatorProfile.role;

// Inside your DOMContentLoaded listener, ensure the link is wired up:
const viewProfileLink = document.getElementById("btnDropdownProfile");
if (viewProfileLink) {
    viewProfileLink.addEventListener("click", (e) => {
        e.preventDefault();
        openProfileModal();
    });
}
// Run everything safely on DOM Content Loaded
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Run profile session load first
    await loadCoordinatorProfile();

    // 2. Initialize your regular dashboard components
    loadSchedulesTable();
    populateFormDropdowns();

    // 3. Modal UI Management Wireframes
    const modal = document.getElementById("scheduleModal");

    const openBtn = document.getElementById("btnOpenScheduleModal");
    if (openBtn) {
        openBtn.addEventListener("click", () => {
            document.getElementById("frmScheduleAsset").reset();
            modal.style.setProperty("display", "flex", "important");
        });
    }

    const cancelBtn = document.getElementById("btnCancelModal");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            modal.style.setProperty("display", "none", "important");
        });
    }

    const formAsset = document.getElementById("frmScheduleAsset");
    if (formAsset) {
        formAsset.addEventListener("submit", handleScheduleFormSubmit);
    }
});

// ✅ Dynamic URL Session Parser Function
async function loadCoordinatorProfile() {
    try {
        // 1. Look directly at the browser URL bar (e.g., schedule-shuttles.html?email=coord@getyourride.com)
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email');

        // 2. Fallback default if someone types the address manually without logging in
        if (!loggedInEmail) {
            loggedInEmail = 'coord@getyourride.com';
        }

        // 3. Request profile information from C# API backend
        const targetUrl = `${window.location.origin}${COORDINATOR_PROFILE_API_URL}?email=${encodeURIComponent(loggedInEmail)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Profile response status not ok.');

        activeCoordinatorProfile = await response.json();

        // 4. Safely push data properties out to your sidebar layout components
        if (document.getElementById('coordinatorNameLabel')) {
            document.getElementById('coordinatorNameLabel').innerText = activeCoordinatorProfile.fullName;
        }
        if (document.getElementById('coordinatorEmailLabel')) {
            document.getElementById('coordinatorEmailLabel').innerText = activeCoordinatorProfile.email;
        }
    } catch (error) {
        console.error('Error fetching coordinator session profile info:', error);
        if (document.getElementById('coordinatorNameLabel')) {
            document.getElementById('coordinatorNameLabel').innerText = "Session Offline";
        }
        if (document.getElementById('coordinatorEmailLabel')) {
            document.getElementById('coordinatorEmailLabel').innerText = "reconnecting...";
        }
    }
}
document.addEventListener("DOMContentLoaded", () => {
    // Nav Card Triggers
    document.getElementById("cardManageShuttles").addEventListener("click", () => {
        window.location.href = "manage-shuttles.html";
    });
    document.getElementById("cardManageDrivers").addEventListener("click", () => {
        alert("Moving to Manage Shuttle Drivers next!");
    });
    document.getElementById("cardScheduleShuttles").addEventListener("click", () => {
        alert("Moving to Schedule Shuttles after drivers are ready!");
    });

    // Profile Dropdown Mechanics
    const dropdown = document.getElementById("coordinatorDropdown");
    document.getElementById("profileTrigger").addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    });

    window.addEventListener("click", () => {
        dropdown.classList.remove("show");
    });

    // Logout Trigger
    document.getElementById("btnDropdownLogout").addEventListener("click", () => {
        if (confirm("Log out of Coordinator Session?")) {
            window.location.href = "../Login.html";
        }
    });

    // Profile Modal Controllers
    document.getElementById("btnDropdownProfile").addEventListener("click", () => {
        document.getElementById("profileModal").classList.add("show");
    });
    document.getElementById("btnCloseProfile").addEventListener("click", () => {
        document.getElementById("profileModal").classList.remove("show");
    });

    // Support Modal Controllers
    document.getElementById("btnSidebarSupport").addEventListener("click", () => {
        document.getElementById("supportModal").classList.add("show");
    });
    document.getElementById("btnCloseSupport").addEventListener("click", () => {
        document.getElementById("supportModal").classList.remove("show");
    });
});
document.addEventListener('DOMContentLoaded', () => {
    // 1. Profile Dropdown Logic
    const profileTrigger = document.getElementById('profileTrigger');
    const dropdown = document.getElementById('coordinatorDropdown');

    if (profileTrigger && dropdown) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Close dropdown when clicking anywhere else
    window.addEventListener('click', () => {
        if (dropdown) dropdown.style.display = 'none';
    });

    // 2. Profile Modal Logic
    const btnProfile = document.getElementById('btnDropdownProfile');
    const profileModal = document.getElementById('profileModal');
    const btnCloseProfile = document.getElementById('btnCloseProfile');

    if (btnProfile && profileModal && btnCloseProfile) {
        btnProfile.addEventListener('click', () => profileModal.style.display = 'flex');
        btnCloseProfile.addEventListener('click', () => profileModal.style.display = 'none');
    }

    // 3. Support Modal Logic
    const btnSupport = document.getElementById('btnSidebarSupport');
    const supportModal = document.getElementById('supportModal');
    const btnCloseSupport = document.getElementById('btnCloseSupport');

    if (btnSupport && supportModal && btnCloseSupport) {
        btnSupport.addEventListener('click', () => supportModal.style.display = 'flex');
        btnCloseSupport.addEventListener('click', () => supportModal.style.display = 'none');
    }
});