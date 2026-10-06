const BOOKINGS_API_URL = '/api/admin/bookings';
const PROFILE_API_URL = '/api/admin/profile';
let activeAdminProfile = null;

window.openSupportModal = function () {
    document.getElementById('supportModal')?.classList.add('active');
};
window.closeSupportModal = function () {
    document.getElementById('supportModal')?.classList.remove('active');
};

function toggleProfileMenu(e) {
    if (e) e.stopPropagation();
    else if (window.event) window.event.stopPropagation();

    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}


window.addEventListener('click', function (e) {
    const profileFooter = document.querySelector('.sidebar-profile-footer');
    if (profileFooter && !profileFooter.contains(e.target)) {
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) profileDropdown.classList.remove('show');
    }
});


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

    // Admin dashboard hero date chip
    const heroDate = document.getElementById('dashHeroDate');
    if (heroDate) {
        heroDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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

        // Fill the rating progress ring based on the real average (out of 5).
        const ring = document.getElementById('ratingRingValue');
        if (ring && data.averageRating != null) {
            const circumference = 2 * Math.PI * 30; // r=30 -> ~188.5
            const pct = Math.max(0, Math.min(Number(data.averageRating) / 5, 1));
            ring.style.strokeDashoffset = String(circumference * (1 - pct));
        }
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

// Render a given list of drivers into the dashboard's compact recent list
function renderRecentRows(list, footerLabel) {
    const listEl = document.getElementById('recentProfilesBody');
    const footerText = document.getElementById('recentFooterText');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!list || list.length === 0) {
        listEl.innerHTML = `<li class="recent-list-empty">No matching drivers.</li>`;
        if (footerText) footerText.textContent = footerLabel || 'No results';
        return;
    }

    list.forEach(driver => {
        const status = driver.__status;
        let statusLabel, statusCls, actionHtml;
        const idParam = driver.driverId != null ? driver.driverId : '';

        if (status === 'approved') {
            statusLabel = 'Approved'; statusCls = 'approved';
            actionHtml = `<a href="driver-details.html?id=${idParam}" class="recent-item-link">View</a>`;
        } else if (status === 'rejected') {
            statusLabel = 'Rejected'; statusCls = 'rejected';
            actionHtml = `<a href="driver-details.html?id=${idParam}" class="recent-item-link">View</a>`;
        } else {
            statusLabel = 'Pending'; statusCls = 'pending';
            actionHtml = `<a href="review-application.html?id=${idParam}" class="btn-review btn-review-sm">Review</a>`;
        }

        const studentNumber = driver.studentNumber || (driver.driverId != null ? `DRV-${driver.driverId}` : '&mdash;');
        const submissionDate = formatSubmissionDate(driver.joinDate);

        const item = document.createElement('li');
        item.className = 'recent-item';
        item.innerHTML = `
            <div class="recent-avatar">${recentInitials(driver.fullName)}</div>
            <div class="recent-item-main">
                <div class="recent-driver-name">${driver.fullName || 'Unknown Driver'}</div>
                <div class="recent-item-meta">
                    <span class="recent-driver-email">${driver.email || ''}</span>
                    <span class="recent-meta-dot">&bull;</span>
                    <span>${studentNumber}</span>
                    <span class="recent-meta-dot">&bull;</span>
                    <span>${submissionDate}</span>
                </div>
            </div>
            <span class="status-pill ${statusCls}">${statusLabel}</span>
            <div class="recent-item-action">${actionHtml}</div>
        `;
        listEl.appendChild(item);
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
            tableBody.innerHTML = `<li class="recent-list-empty">No recent driver activity.</li>`;
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
        tableBody.innerHTML = `<li class="recent-list-empty">Unable to load recent drivers.</li>`;
        if (footerText) footerText.textContent = 'No recent activity';
    }
}


window.addEventListener('load', async () => {
    const dateInput = document.getElementById('manifestDateFilter');
    if (dateInput) dateInput.valueAsDate = new Date();

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