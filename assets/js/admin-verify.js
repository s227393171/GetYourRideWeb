const UNVERIFIED_API = '/api/admin/unverified-drivers';
const VERIFIED_STUDENTS_API = '/api/admin/verified-student-drivers';
const VERIFY_ACTION_API = '/api/admin/verify-driver';
const PREVIEW_COUNT = 5;
let cachedUnverified = [];
let cachedVerified = [];
let pendingExpanded = false;
let verifiedExpanded = false;

async function loadVerificationQueue() {
    try {
        const response = await fetch(UNVERIFIED_API);
        cachedUnverified = await response.json();
        renderVerificationTable(cachedUnverified);
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
            <td><strong>${driver.fullName}</strong></td>
            <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-weight:600;">${driver.studentNumber}</code></td>
            <td>${driver.email}</td>
            <td>
                <a href="review-application.html?id=${driver.studentNumber}" class="btn-action verify-approve" style="display: inline-block; text-decoration: none; text-align: center;">
                    Verify Profile
                </a>
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

async function loadVerifiedStudents() {
    try {
        const response = await fetch(VERIFIED_STUDENTS_API);
        cachedVerified = await response.json();
        renderVerifiedTable(cachedVerified);
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
            <td><strong>${driver.fullName}</strong></td>
            <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-weight:600;">${driver.studentNumber}</code></td>
            <td>${driver.email}</td>
            <td><span class="status-badge" style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">Verified</span></td>
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
                <td><strong>${driver.fullName}</strong></td>
                <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-weight:600;">${driver.studentNumber}</code></td>
                <td>${driver.email}</td>
                <td><a href="review-application.html?id=${driver.studentNumber}" class="btn-action verify-approve" style="display:inline-block; text-decoration:none; text-align:center;">Verify Profile</a></td>
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