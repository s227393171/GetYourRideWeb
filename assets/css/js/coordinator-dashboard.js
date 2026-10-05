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


if (activeCoordinatorProfile) {
    if (document.getElementById('modalFullName')) document.getElementById('modalFullName').innerText = activeCoordinatorProfile.fullName;
    if (document.getElementById('modalIdNumber')) document.getElementById('modalIdNumber').innerText = activeCoordinatorProfile.employeeId;
    if (document.getElementById('modalEmail')) document.getElementById('modalEmail').innerText = activeCoordinatorProfile.email;
    if (document.getElementById('modalRole')) document.getElementById('modalRole').innerText = activeCoordinatorProfile.role;
}


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


/* ============================================================
   "Today at a glance" summary box (coordinator dashboard)
   ============================================================ */
(function () {
    const SUMMARY_API = '/api/coordinator/summary';
    const card = document.getElementById('glanceCard');
    if (!card) return; // only runs on the dashboard

    const els = {
        emptyHeader: document.getElementById('glanceEmptyHeader'),
        emptyState: document.getElementById('glanceEmptyState'),
        summary: document.getElementById('glanceSummary'),
        error: document.getElementById('glanceError'),
        retry: document.getElementById('glanceRetry'),
        updated: document.getElementById('glanceUpdated'),
        stats: document.getElementById('glanceStats'),
        status: document.getElementById('glanceStatus'),
        shuttles: document.getElementById('glShuttles'),
        drivers: document.getElementById('glDrivers'),
        trips: document.getElementById('glTrips'),
        next: document.getElementById('glNext'),
        unassigned: document.getElementById('glUnassigned')
    };

    let glanceTimer = null;

    function show(el) { if (el) el.hidden = false; }
    function hide(el) { if (el) el.hidden = true; }

    function nowHHMM() {
        const d = new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function showSkeleton() {
        hide(els.emptyHeader);
        hide(els.emptyState);
        hide(els.error);
        show(els.summary);
        els.updated.textContent = 'Updating…';
        [els.shuttles, els.drivers, els.trips, els.next, els.unassigned].forEach(function (n) {
            if (n) n.innerHTML = '<span class="glance-skel" style="width:36px;height:22px;"></span>';
            if (n) n.classList.remove('danger');
        });
        els.status.className = 'glance-status';
        els.status.innerHTML = '<span class="glance-skel" style="width:160px;height:14px;"></span>';
    }

    function showError() {
        hide(els.emptyHeader);
        hide(els.emptyState);
        hide(els.summary);
        show(els.error);
    }

    function showEmptyState() {
        // Truly nothing in the system — restore the original empty state.
        show(els.emptyHeader);
        show(els.emptyState);
        hide(els.summary);
        hide(els.error);
    }

    function render(data) {
        const shuttlesTotal = data.shuttlesTotal || 0;
        const shuttlesAvailable = data.shuttlesAvailable || 0;
        const driversOnShift = data.driversOnShift || 0;
        const tripsToday = data.tripsToday || 0;
        const unassigned = data.unassignedTrips || 0;
        const nextDeparture = data.nextDeparture || null;

        // Always show the glance summary when the endpoint responds
        // (real zeros are shown rather than hiding the whole box).
        hide(els.emptyHeader);
        hide(els.emptyState);
        hide(els.error);
        show(els.summary);

        els.shuttles.textContent = shuttlesAvailable + ' / ' + shuttlesTotal;
        els.drivers.textContent = driversOnShift;
        els.trips.textContent = tripsToday;
        els.next.textContent = nextDeparture ? nextDeparture : 'None';

        els.unassigned.textContent = unassigned;
        els.unassigned.classList.toggle('danger', unassigned > 0);

        if (unassigned > 0) {
            els.status.className = 'glance-status warn';
            els.status.innerHTML =
                '<span>' + unassigned + (unassigned === 1 ? ' trip still needs a driver' : ' trips still need a driver') + '</span>' +
                '<a href="schedule-shuttles.html">Assign drivers →</a>';
        } else {
            els.status.className = 'glance-status ok';
            els.status.innerHTML = '<span>All trips have drivers</span>';
        }

        els.updated.textContent = 'Updated ' + nowHHMM();
    }

    async function loadGlance(isAuto) {
        if (!isAuto) showSkeleton();
        try {
            const res = await fetch(window.location.origin + SUMMARY_API);
            if (!res.ok) throw new Error('summary status ' + res.status);
            const data = await res.json();
            console.log('[Glance] summary data:', data);
            render(data);
        } catch (err) {
            console.error('Glance summary failed:', err);
            // On an auto-refresh failure keep showing the last good data;
            // only replace the box with the error state on first/manual load.
            if (!isAuto) showError();
        }
    }

    // Auto-refresh using the Settings "Refresh Frequency" (localStorage).
    function scheduleAutoRefresh() {
        if (glanceTimer) { clearInterval(glanceTimer); glanceTimer = null; }
        const saved = localStorage.getItem('portalRefresh'); // 'manual' | ms string
        let ms = 30000; // default every 30s
        if (saved === 'manual') { ms = 0; }
        else if (saved && !isNaN(parseInt(saved, 10))) { ms = parseInt(saved, 10); }
        if (ms > 0) {
            glanceTimer = setInterval(function () { loadGlance(true); }, ms);
        }
    }

    // Let theme.js's refresh hook also refresh this box.
    window.portalRefreshData = function () { loadGlance(true); };

    if (els.retry) {
        els.retry.addEventListener('click', function (e) {
            e.preventDefault();
            loadGlance(false);
        });
    }

    // React if the refresh frequency changes in another tab / Settings.
    window.addEventListener('storage', function (e) {
        if (e.key === 'portalRefresh') scheduleAutoRefresh();
    });

    loadGlance(false);
    scheduleAutoRefresh();
})();
