const BOOKINGS_API_URL = '/api/admin/bookings';
const PROFILE_API_URL = '/api/admin/profile';
let activeAdminProfile = null;

function toggleDropdown(e) {
    if (e) e.stopPropagation();
    const globalDropdown = document.getElementById('adminGlobalDropdown');
    if (globalDropdown) globalDropdown.classList.toggle('show');
}


function toggleProfileMenu(e) {
    if (e) e.stopPropagation();
    else if (window.event) window.event.stopPropagation();

    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}


window.addEventListener('click', function (e) {
    const topDropdown = document.getElementById('adminGlobalDropdown');
    if (topDropdown) topDropdown.classList.remove('show');

    const profileFooter = document.querySelector('.sidebar-profile-footer');
    if (profileFooter && !profileFooter.contains(e.target)) {
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) profileDropdown.classList.remove('show');
    }
});


const POPUP_ICONS = {
    info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    logout: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
};

let pendingConfirmAction = null;

function ensureConfirmPopupMarkup() {
    if (document.getElementById('confirmPopupModal')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'confirmPopupModal';
    wrapper.className = 'modal-backdrop';
    wrapper.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:1000; align-items:center; justify-content:center;';

    wrapper.innerHTML = `
        <div class="modal-card cute-logout-card" style="background:#ffffff; padding:32px; border-radius:20px; width:100%; max-width:400px; text-align:center; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); animation: scaleUp 0.25s ease-out;">
            <div id="confirmPopupIcon" style="width:56px; height:56px; margin:0 auto 16px; border-radius:50%; background:#fef2f2; display:flex; align-items:center; justify-content:center; color:#ef4444;"></div>
            <h3 id="confirmPopupTitle" style="margin:0 0 8px 0; color:#1e293b; font-size:20px; font-weight:700;"></h3>
            <p id="confirmPopupMessage" style="color:#64748b; font-size:14px; margin:0 0 24px 0;"></p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button onclick="closeConfirmPopup()" style="flex:1; padding:12px 16px; border-radius:10px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; font-weight:600; cursor:pointer; transition:background 0.2s;">Cancel</button>
                <button id="confirmPopupActionBtn" style="flex:1; padding:12px 16px; border-radius:10px; border:none; background:#ef4444; color:#ffffff; font-weight:600; cursor:pointer; transition:background 0.2s;">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
}

function showConfirmPopup(title, message, onConfirm, iconKey = 'warning') {
    ensureConfirmPopupMarkup();
    document.getElementById('confirmPopupTitle').innerText = title;
    document.getElementById('confirmPopupMessage').innerText = message;
    document.getElementById('confirmPopupIcon').innerHTML = POPUP_ICONS[iconKey] || POPUP_ICONS.warning;

    pendingConfirmAction = onConfirm;
    const actionBtn = document.getElementById('confirmPopupActionBtn');
    actionBtn.onclick = () => {
        closeConfirmPopup();
        if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
    };

    document.getElementById('confirmPopupModal').style.display = 'flex';
}

function closeConfirmPopup() {
    const modal = document.getElementById('confirmPopupModal');
    if (modal) modal.style.display = 'none';
    pendingConfirmAction = null;
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


async function loadAdminProfile() {
    
    if (document.getElementById('coordinatorNameLabel')) return;

    const nameLabel = document.getElementById('adminNameLabel');
    const emailLabel = document.getElementById('adminEmailLabel');

    try {
        const urlParams = new URLSearchParams(window.location.search);
        let loggedInEmail = urlParams.get('email') || 'admin@getyourride.com';

        const targetUrl = `${window.location.origin}${PROFILE_API_URL}?email=${encodeURIComponent(loggedInEmail)}`;

        const response = await fetch(targetUrl);
        if (response.ok) {
            const raw = await response.json();

            
            activeAdminProfile = {
                fullName: raw.fullName || "Admin User",
                email: raw.email ?? loggedInEmail,
                employeeId: raw.employeeId ?? null,
                userID: raw.userId ?? 1,
                role: raw.role ?? "Admin"
            };

            if (nameLabel) nameLabel.innerText = activeAdminProfile.fullName;
            if (emailLabel) emailLabel.innerText = activeAdminProfile.email;
            return;
        }
        throw new Error('API route offline.');
    } catch (error) {
        console.warn('Using fallback data:', error);

        
        activeAdminProfile = {
            fullName: "Admin User",
            email: "admin@getyourride.com",
            employeeId: null,
            userID: 1,
            role: "Admin"
        };

        if (nameLabel) nameLabel.innerText = activeAdminProfile.fullName;
        if (emailLabel) emailLabel.innerText = activeAdminProfile.email;
    }
}

async function loadCoordinatorSessionProfile() {
    
    if (!document.getElementById('coordinatorNameLabel')) return;

    try {
       
        const response = await fetch("/api/coordinator/profile");

        if (response.ok) {
            
            window.activeCoordinatorProfile = await response.json();
            const data = window.activeCoordinatorProfile;

            
            const nameLabel = document.getElementById("coordinatorNameLabel");
            const emailLabel = document.getElementById("coordinatorEmailLabel");

            if (nameLabel) nameLabel.textContent = data.fullName || `${data.fName} ${data.lName}`;
            if (emailLabel) emailLabel.textContent = data.email;

            
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

window.openProfileModal = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    
    const dropdownMenu = document.getElementById("profileDropdown");
    if (dropdownMenu) {
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = "none";
    }

    
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.setProperty("display", "flex", "important");
    } else {
        console.error("Could not locate profile display container element markup.");
        return;
    }

    
    const profileData = activeAdminProfile || window.activeCoordinatorProfile;

    if (profileData) {
     
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


async function loadDriverDashboard() {

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


function setGreetingAndDate() {
    const heading = document.getElementById('greetingHeading');
    const dateEl = document.getElementById('bannerDate');
    const now = new Date();
    const hour = now.getHours();

    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';

    const nameEl = document.getElementById('adminNameLabel');
    const firstName = (nameEl && nameEl.textContent && !nameEl.textContent.includes('Loading'))
        ? nameEl.textContent.split(' ')[0]
        : '';

    if (heading) {
        heading.textContent = firstName ? `${greeting}, ${firstName}` : `${greeting}`;
    }
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}


async function loadDashboardStats() {
    const pendingEl = document.getElementById('statPendingApplications');
    if (!pendingEl) return; 

    try {
        const response = await fetch(`${window.location.origin}/api/admin/dashboard/summary`);
        if (!response.ok) throw new Error('Summary endpoint not ok.');
        const data = await response.json();

        pendingEl.textContent = data.pendingApplications ?? '—';
        document.getElementById('statActiveDrivers').textContent = data.activeDrivers ?? '—';
        document.getElementById('statAverageRating').textContent = data.averageRating != null ? Number(data.averageRating).toFixed(2) : '—';
        document.getElementById('statTripsToday').textContent = data.tripsToday ?? '—';
    } catch (error) {
        console.warn('Dashboard summary unavailable, showing placeholders:', error);
    }
}


window.addEventListener('load', async () => {
    
    if (localStorage.getItem('portalTheme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const dateInput = document.getElementById('manifestDateFilter');
    if (dateInput) dateInput.valueAsDate = new Date();

    startLiveClock();

    
    await Promise.all([
        loadAdminProfile(),
        loadCoordinatorSessionProfile()
    ]);

    if (document.getElementById('bookingsTableBody')) {
        await loadDriverDashboard();
    }

    setGreetingAndDate();
    await loadDashboardStats();

  
    setTimeout(setGreetingAndDate, 800);
});