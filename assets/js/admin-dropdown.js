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
        let loggedInEmail = localStorage.getItem('userEmail') || 'admin@getyourride.com';

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

    // Only overwrite when the element opts in via data-greeting.
    // The redesigned dashboard keeps a static "Overview Dashboard" title,
    // so those nodes omit the attribute and are left untouched.
    if (heading && heading.hasAttribute('data-greeting')) {
        heading.textContent = firstName ? `${greeting}, ${firstName}` : `${greeting}`;
    }
    if (dateEl && dateEl.hasAttribute('data-greeting')) {
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
        document.getElementById('statAverageRating').textContent = data.averageRating != null ? Number(data.averageRating).toFixed(1) : '—';
        document.getElementById('statTripsToday').textContent = data.tripsToday ?? '—';
    } catch (error) {
        console.warn('Dashboard summary unavailable, showing placeholders:', error);
    }
}


// ---------------------------------------------------------
// loadRecentDriverProfiles — populates the dashboard's
// "Recent Driver Profiles" table from the real `driver` table
// (Pending = unverified, Approved = verified student drivers),
// with a real submission date, working pagination and status-aware actions.
// ---------------------------------------------------------
// Show only the few most recent drivers as a snapshot — the full list
// lives on the Driver Verification screen (linked via "View All Applications").
const RECENT_SHOW_COUNT = 5;
let recentDriverListFull = [];

function recentInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// Render a given list of drivers into the dashboard's recent table
function renderRecentRows(list, footerLabel) {
    const tableBody = document.getElementById('recentProfilesBody');
    const footerText = document.getElementById('recentFooterText');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!list || list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No matching drivers.</td></tr>`;
        if (footerText) footerText.textContent = footerLabel || 'No results';
        return;
    }

    list.forEach(driver => {
        const status = driver.__status;
        let statusLabel, statusCls, actionHtml;
        const idParam = driver.driverId != null ? driver.driverId : '';

        if (status === 'approved') {
            statusLabel = 'Approved'; statusCls = 'approved';
            actionHtml = `<span class="action-text approved">Approved</span>`;
        } else if (status === 'rejected') {
            statusLabel = 'Rejected'; statusCls = 'rejected';
            actionHtml = `<span class="action-text rejected">Rejected</span>`;
        } else {
            statusLabel = 'Pending'; statusCls = 'pending';
            actionHtml = `<a href="review-application.html?id=${idParam}" class="btn-review">Review</a>`;
        }

        const studentNumber = driver.studentNumber || (driver.driverId != null ? `DRV-${driver.driverId}` : '&mdash;');
        const submissionDate = formatSubmissionDate(driver.joinDate);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="recent-driver-cell">
                    <div class="recent-avatar">${recentInitials(driver.fullName)}</div>
                    <div>
                        <div class="recent-driver-name">${driver.fullName || 'Unknown Driver'}</div>
                        <div class="recent-driver-email">${driver.email || ''}</div>
                    </div>
                </div>
            </td>
            <td class="recent-muted">${studentNumber}</td>
            <td class="recent-muted">${submissionDate}</td>
            <td><span class="status-pill ${statusCls}">${statusLabel}</span></td>
            <td class="recent-actions">${actionHtml}</td>
        `;
        tableBody.appendChild(row);
    });

    if (footerText) footerText.textContent = footerLabel || `Showing ${list.length}`;
}

// Dashboard search — filters the full driver list; empty term restores the recent snapshot
function searchDashboardProfiles() {
    const input = document.getElementById('dashboardSearchInput');
    const term = input ? input.value.trim().toUpperCase() : '';

    if (!term) {
        renderRecentRows(recentDriverListFull.slice(0, RECENT_SHOW_COUNT), `Showing ${Math.min(RECENT_SHOW_COUNT, recentDriverListFull.length)} most recent`);
        return;
    }

    const matches = recentDriverListFull.filter(d =>
        (d.fullName && d.fullName.toUpperCase().includes(term)) ||
        (d.studentNumber && d.studentNumber.toUpperCase().includes(term)) ||
        (d.email && d.email.toUpperCase().includes(term))
    );
    renderRecentRows(matches, `Showing ${matches.length} match${matches.length === 1 ? '' : 'es'}`);
}

function formatSubmissionDate(value) {
    if (!value) return '&mdash;';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '&mdash;';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadRecentDriverProfiles() {
    const tableBody = document.getElementById('recentProfilesBody');
    if (!tableBody) return;
    const footerText = document.getElementById('recentFooterText');

    try {
        // Pull real driver records from the same source the Driver Verification
        // screen uses (the `driver` table), since driverapplications may be empty.
        // Pending = unverified drivers; Approved = verified student drivers.
        const [pendingRes, approvedRes] = await Promise.all([
            fetch(`${window.location.origin}/api/admin/unverified-drivers`),
            fetch(`${window.location.origin}/api/admin/verified-student-drivers`)
        ]);

        const pendingList = pendingRes.ok ? await pendingRes.json() : [];
        const approvedList = approvedRes.ok ? await approvedRes.json() : [];

        const combined = [
            ...(Array.isArray(pendingList) ? pendingList.map(d => ({ ...d, __status: 'pending' })) : []),
            ...(Array.isArray(approvedList) ? approvedList.map(d => ({ ...d, __status: 'approved' })) : [])
        ];

        // Newest first (higher driverId = more recent signup)
        combined.sort((a, b) => (b.driverId || 0) - (a.driverId || 0));
        recentDriverListFull = combined;

        if (combined.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No recent driver activity.</td></tr>`;
            if (footerText) footerText.textContent = 'No recent activity';
            return;
        }

        // Respect an active search term if the user already typed one
        const searchInput = document.getElementById('dashboardSearchInput');
        if (searchInput && searchInput.value.trim()) {
            searchDashboardProfiles();
        } else {
            renderRecentRows(combined.slice(0, RECENT_SHOW_COUNT), `Showing ${Math.min(RECENT_SHOW_COUNT, combined.length)} most recent`);
        }
    } catch (error) {
        console.warn('Recent driver profiles unavailable:', error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">Unable to load recent drivers.</td></tr>`;
        if (footerText) footerText.textContent = 'No recent activity';
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
    await loadRecentDriverProfiles();

  
    setTimeout(setGreetingAndDate, 800);
});