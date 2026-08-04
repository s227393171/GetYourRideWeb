const COORDINATOR_PROFILE_API_URL = '/api/coordinator/profile'; 
window.activeCoordinatorProfile = null;
function openProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "flex", "important");
}

function closeProfileModal() {
    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.setProperty("display", "none", "important");
}


if (document.getElementById('modalFullName')) document.getElementById('modalFullName').innerText = activeCoordinatorProfile.fullName;
if (document.getElementById('modalIdNumber')) document.getElementById('modalIdNumber').innerText = activeCoordinatorProfile.employeeId;
if (document.getElementById('modalEmail')) document.getElementById('modalEmail').innerText = activeCoordinatorProfile.email;
if (document.getElementById('modalRole')) document.getElementById('modalRole').innerText = activeCoordinatorProfile.role;


const viewProfileLink = document.getElementById("btnDropdownProfile");
if (viewProfileLink) {
    viewProfileLink.addEventListener("click", (e) => {
        e.preventDefault();
        openProfileModal();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    
    await loadCoordinatorProfile();

    
    loadSchedulesTable();
    populateFormDropdowns();

    
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


async function loadCoordinatorProfile() {
    try {
        
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email');

       
        if (!loggedInEmail) {
            loggedInEmail = 'coord@getyourride.com';
        }

        
        const targetUrl = `${window.location.origin}${COORDINATOR_PROFILE_API_URL}?email=${encodeURIComponent(loggedInEmail)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Profile response status not ok.');

        activeCoordinatorProfile = await response.json();

        
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
    
    document.getElementById("cardManageShuttles").addEventListener("click", () => {
        window.location.href = "manage-shuttles.html";
    });
    document.getElementById("cardManageDrivers").addEventListener("click", () => {
        alert("Moving to Manage Shuttle Drivers next!");
    });
    document.getElementById("cardScheduleShuttles").addEventListener("click", () => {
        alert("Moving to Schedule Shuttles after drivers are ready!");
    });

    
    const dropdown = document.getElementById("coordinatorDropdown");
    document.getElementById("profileTrigger").addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    });

    window.addEventListener("click", () => {
        dropdown.classList.remove("show");
    });

    
    document.getElementById("btnDropdownLogout").addEventListener("click", () => {
        if (confirm("Log out of Coordinator Session?")) {
            window.location.href = "../Login.html";
        }
    });

 
    document.getElementById("btnDropdownProfile").addEventListener("click", () => {
        document.getElementById("profileModal").classList.add("show");
    });
    document.getElementById("btnCloseProfile").addEventListener("click", () => {
        document.getElementById("profileModal").classList.remove("show");
    });

   
    document.getElementById("btnSidebarSupport").addEventListener("click", () => {
        document.getElementById("supportModal").classList.add("show");
    });
    document.getElementById("btnCloseSupport").addEventListener("click", () => {
        document.getElementById("supportModal").classList.remove("show");
    });
});
document.addEventListener('DOMContentLoaded', () => {
   
    const profileTrigger = document.getElementById('profileTrigger');
    const dropdown = document.getElementById('coordinatorDropdown');

    if (profileTrigger && dropdown) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    }

    
    window.addEventListener('click', () => {
        if (dropdown) dropdown.style.display = 'none';
    });

 
    const btnProfile = document.getElementById('btnDropdownProfile');
    const profileModal = document.getElementById('profileModal');
    const btnCloseProfile = document.getElementById('btnCloseProfile');

    if (btnProfile && profileModal && btnCloseProfile) {
        btnProfile.addEventListener('click', () => profileModal.style.display = 'flex');
        btnCloseProfile.addEventListener('click', () => profileModal.style.display = 'none');
    }

  
    const btnSupport = document.getElementById('btnSidebarSupport');
    const supportModal = document.getElementById('supportModal');
    const btnCloseSupport = document.getElementById('btnCloseSupport');

    if (btnSupport && supportModal && btnCloseSupport) {
        btnSupport.addEventListener('click', () => supportModal.style.display = 'flex');
        btnCloseSupport.addEventListener('click', () => supportModal.style.display = 'none');
    }
});