const UNVERIFIED_API = '/api/admin/unverified-drivers';
const VERIFIED_STUDENTS_API = '/api/admin/verified-student-drivers';
const VERIFY_ACTION_API = '/api/admin/verify-driver';
const PREVIEW_COUNT = 5;
let cachedUnverified = [];
let cachedVerified = [];
let pendingExpanded = false;
let verifiedExpanded = false;

// Visual helper — initials for the avatar circle (display only)
function verifyInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

async function loadVerificationQueue() {
    try {
        const response = await fetch(UNVERIFIED_API);
        cachedUnverified = await response.json();
        renderVerificationTable(cachedUnverified);
        const pendingStat = document.getElementById('statVerifyPending');
        if (pendingStat) pendingStat.textContent = (cachedUnverified || []).length;
    } catch (err) {
        console.error(err);
        document.getElementById('verificationTableBody').innerHTML =
            `<tr><td colspan="4" style="color:red; text-align:center; padding:20px; font-weight:600;">Failed to pull pipeline queue.</td></tr>`;
    }
}

function renderVerificationTable(list) {
    const tableBody = document.getElementById('verificationTableBody');
    const wrap = document.getElementById('verificationShowMoreWrap');
    const btn = document.getElementById('verificationShowMoreBtn');
    tableBody.innerHTML = '';

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748b; font-weight:500;">🎉 No pending files need verification.</td></tr>`;
        if (wrap) wrap.style.display = 'none';
        return;
    }

    const visible = pendingExpanded ? list : list.slice(0, PREVIEW_COUNT);

    visible.forEach(driver => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="recent-driver-cell">
                    <div class="recent-avatar">${verifyInitials(driver.fullName)}</div>
                    <div>
                        <div class="recent-driver-name">${driver.fullName}</div>
                        <div class="recent-driver-email">${driver.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="verify-student-num">${driver.studentNumber}</span></td>
            <td><span class="status-pill pending">Pending</span></td>
            <td class="recent-actions">
                <a href="review-application.html?id=${driver.studentNumber}" class="btn-review-profile">Verify Profile</a>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (wrap && btn) {
        if (list.length > PREVIEW_COUNT) {
            wrap.style.display = 'block';
            btn.textContent = pendingExpanded ? 'Show less' : `Show more (${list.length - PREVIEW_COUNT} more)`;
        } else {
            wrap.style.display = 'none';
        }
    }
}

function togglePendingList() {
    pendingExpanded = !pendingExpanded;
    renderVerificationTable(cachedUnverified);
}

// Filter tabs: show/hide the Pending and Verified sections
function setVerifyFilter(filter, btnEl) {
    document.querySelectorAll('#verifyFilterTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const pendingGroup = document.getElementById('pendingGroup');
    const verifiedGroup = document.getElementById('verifiedGroup');
    if (!pendingGroup || !verifiedGroup) return;

    if (filter === 'pending') {
        pendingGroup.style.display = '';
        verifiedGroup.style.display = 'none';
    } else if (filter === 'approved') {
        pendingGroup.style.display = 'none';
        verifiedGroup.style.display = '';
    } else if (filter === 'rejected') {
        // No rejected data source — hide both tables
        pendingGroup.style.display = 'none';
        verifiedGroup.style.display = 'none';
    } else {
        // all
        pendingGroup.style.display = '';
        verifiedGroup.style.display = '';
    }
}

async function loadVerifiedStudents() {
    try {
        const response = await fetch(VERIFIED_STUDENTS_API);
        cachedVerified = await response.json();
        renderVerifiedTable(cachedVerified);
        const approvedStat = document.getElementById('statVerifyApproved');
        if (approvedStat) approvedStat.textContent = (cachedVerified || []).length;
    } catch (err) {
        console.error(err);
        document.getElementById('verifiedTableBody').innerHTML =
            `<tr><td colspan="4" style="color:red; text-align:center; padding:20px; font-weight:600;">Failed to load verified drivers.</td></tr>`;
    }
}

function renderVerifiedTable(list) {
    const tableBody = document.getElementById('verifiedTableBody');
    const wrap = document.getElementById('verifiedShowMoreWrap');
    const btn = document.getElementById('verifiedShowMoreBtn');
    tableBody.innerHTML = '';

    if (!list || list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748b; font-weight:500;">No verified student drivers yet.</td></tr>`;
        if (wrap) wrap.style.display = 'none';
        return;
    }

    const visible = verifiedExpanded ? list : list.slice(0, PREVIEW_COUNT);

    visible.forEach(driver => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="recent-driver-cell">
                    <div class="recent-avatar">${verifyInitials(driver.fullName)}</div>
                    <div>
                        <div class="recent-driver-name">${driver.fullName}</div>
                        <div class="recent-driver-email">${driver.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="verify-student-num">${driver.studentNumber}</span></td>
            <td><span class="status-pill approved">Verified</span></td>
        `;
        tableBody.appendChild(row);
    });

    if (wrap && btn) {
        if (list.length > PREVIEW_COUNT) {
            wrap.style.display = 'block';
            btn.textContent = verifiedExpanded ? 'Show less' : `Show more (${list.length - PREVIEW_COUNT} more)`;
        } else {
            wrap.style.display = 'none';
        }
    }
}

function toggleVerifiedList() {
    verifiedExpanded = !verifiedExpanded;
    renderVerifiedTable(cachedVerified);
}


async function approveDriver(userId) {
    if (!confirm("Authorize credentials and grant driver application access privileges?")) return;
    try {
        const response = await fetch(VERIFY_ACTION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });
        if (response.ok) {
            alert("Driver successfully authorized.");
            loadVerificationQueue();
        }
    } catch (e) {
        console.error(e);
        alert("Execution pipeline communications failure.");
    }
}

function searchUnverified() {
    const term = document.getElementById('verifySearchInput').value.toUpperCase();
    if (term.length > 0) {
        const filtered = cachedUnverified.filter(u => u.fullName.toUpperCase().includes(term) || u.studentNumber.toUpperCase().includes(term));
        const tableBody = document.getElementById('verificationTableBody');
        const wrap = document.getElementById('verificationShowMoreWrap');
        if (wrap) wrap.style.display = 'none';
        tableBody.innerHTML = '';
        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748b;">No matches found.</td></tr>`;
            return;
        }
        filtered.forEach(driver => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="recent-driver-cell">
                        <div class="recent-avatar">${verifyInitials(driver.fullName)}</div>
                        <div>
                            <div class="recent-driver-name">${driver.fullName}</div>
                            <div class="recent-driver-email">${driver.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="verify-student-num">${driver.studentNumber}</span></td>
                <td><span class="status-pill pending">Pending</span></td>
                <td class="recent-actions"><a href="review-application.html?id=${driver.studentNumber}" class="btn-review-profile">Verify Profile</a></td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        renderVerificationTable(cachedUnverified);
    }
}


function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('adminGlobalDropdown').classList.toggle('show');
}

function executeLogout() {
    if (confirm("Log out of Admin Session?")) window.location.href = "../Login.html";
}

window.addEventListener('click', function () {
    const d = document.getElementById('adminGlobalDropdown');
    if (d) d.classList.remove('show');
});

window.onload = () => {
    loadVerificationQueue();
    loadVerifiedStudents();
};

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