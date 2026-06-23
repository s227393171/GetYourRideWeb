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