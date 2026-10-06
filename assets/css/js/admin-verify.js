const UNVERIFIED_API = '/api/admin/unverified-drivers';
const VERIFIED_STUDENTS_API = '/api/admin/verified-student-drivers';
const VERIFY_ACTION_API = '/api/admin/verify-driver';
const VERIFY_PAGE_SIZE = 8;

let combinedApplications = [];   // pending + approved, pending first
let currentFilter = 'all';       // all | pending | approved | rejected
let currentSearch = '';
let currentPage = 0;

function verifyInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function verifyFormatDate(value) {
    if (!value) return '&mdash;';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '&mdash;';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* An application counts as "waiting a while" (priority) if pending and the
   join/submission date is more than 7 days ago. Highlighted with an amber bar. */
function isPriority(driver) {
    if (driver.__status !== 'pending') return false;
    if (!driver.joinDate) return false;
    const d = new Date(driver.joinDate);
    if (isNaN(d.getTime())) return false;
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days > 7;
}

/* ---------- Load both lists, combine, pending first ---------- */
async function loadVerificationData() {
    try {
        const [pendingRes, approvedRes] = await Promise.all([
            fetch(UNVERIFIED_API),
            fetch(VERIFIED_STUDENTS_API)
        ]);

        const pending = pendingRes.ok ? await pendingRes.json() : [];
        const approved = approvedRes.ok ? await approvedRes.json() : [];

        const pendingList = (Array.isArray(pending) ? pending : []).map(d => ({ ...d, __status: 'pending' }));
        const approvedList = (Array.isArray(approved) ? approved : []).map(d => ({ ...d, __status: 'approved' }));

        // Pending always on top; within each group, newest first by driverId.
        pendingList.sort((a, b) => (b.driverId || 0) - (a.driverId || 0));
        approvedList.sort((a, b) => (b.driverId || 0) - (a.driverId || 0));
        combinedApplications = [...pendingList, ...approvedList];

        // Stat cards
        const pendingStat = document.getElementById('statVerifyPending');
        const approvedStat = document.getElementById('statVerifyApproved');
        if (pendingStat) pendingStat.textContent = pendingList.length;
        if (approvedStat) approvedStat.textContent = approvedList.length;

        currentPage = 0;
        renderVerificationTable();
    } catch (err) {
        console.error(err);
        const body = document.getElementById('verificationTableBody');
        if (body) {
            body.innerHTML = `<tr><td colspan="5" style="color:#ef4444; text-align:center; padding:24px; font-weight:600;">Failed to load driver applications.</td></tr>`;
        }
    }
}

/* ---------- Filter + search ---------- */
function getFilteredApplications() {
    let list = combinedApplications;

    if (currentFilter !== 'all') {
        list = list.filter(d => d.__status === currentFilter);
    }

    if (currentSearch) {
        const term = currentSearch.toUpperCase();
        list = list.filter(d =>
            (d.fullName && d.fullName.toUpperCase().includes(term)) ||
            (d.studentNumber && d.studentNumber.toUpperCase().includes(term)) ||
            (d.email && d.email.toUpperCase().includes(term))
        );
    }

    return list;
}

function setVerifyFilter(filter, btnEl) {
    currentFilter = filter;
    currentPage = 0;
    document.querySelectorAll('#verifyFilterTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderVerificationTable();
}

function searchUnverified() {
    const input = document.getElementById('verifySearchInput');
    currentSearch = input ? input.value.trim() : '';
    currentPage = 0;
    renderVerificationTable();
}

/* ---------- Render ---------- */
function renderVerificationTable() {
    const tableBody = document.getElementById('verificationTableBody');
    const footerText = document.getElementById('verifyFooterText');
    const pagination = document.getElementById('verifyPagination');
    if (!tableBody) return;

    const list = getFilteredApplications();
    const total = list.length;

    tableBody.innerHTML = '';

    if (total === 0) {
        const label = currentFilter === 'rejected'
            ? 'No rejected applications.'
            : (currentSearch ? 'No matching applications.' : 'No driver applications yet.');
        tableBody.innerHTML =
            `<tr><td colspan="5" style="text-align:center; padding:44px 20px; color:var(--text-secondary,#64748b);">` +
            `<div style="font-size:30px; margin-bottom:8px;">🗂️</div>` +
            `<div style="font-weight:600;">${label}</div></td></tr>`;
        if (footerText) footerText.textContent = 'Showing 0 of 0 applications';
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(total / VERIFY_PAGE_SIZE);
    if (currentPage > totalPages - 1) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const start = currentPage * VERIFY_PAGE_SIZE;
    const end = Math.min(start + VERIFY_PAGE_SIZE, total);
    const visible = list.slice(start, end);

    visible.forEach(driver => {
        const isPending = driver.__status === 'pending';
        const priority = isPriority(driver);

        let statusLabel, statusCls, actionHtml;
        if (driver.__status === 'approved') {
            statusLabel = 'Approved'; statusCls = 'approved';
            actionHtml = `<a href="review-application.html?id=${driver.studentNumber}" class="btn-details">Details</a>`;
        } else if (driver.__status === 'rejected') {
            statusLabel = 'Rejected'; statusCls = 'rejected';
            actionHtml = `<a href="review-application.html?id=${driver.studentNumber}" class="btn-details">Details</a>`;
        } else {
            statusLabel = 'Pending'; statusCls = 'pending';
            actionHtml = `<a href="review-application.html?id=${driver.studentNumber}" class="btn-review-profile">Verify Profile</a>`;
        }

        const row = document.createElement('tr');
        if (priority) row.className = 'verify-priority';
        row.innerHTML = `
            <td>
                <div class="recent-driver-cell">
                    <div class="recent-avatar">${verifyInitials(driver.fullName)}</div>
                    <div>
                        <div class="recent-driver-name">${driver.fullName || 'Unknown Driver'}${priority ? ' <span class="priority-flag" title="Waiting over a week">● Needs attention</span>' : ''}</div>
                        <div class="recent-driver-email">${driver.email || ''}</div>
                    </div>
                </div>
            </td>
            <td><span class="verify-student-num">${driver.studentNumber || '&mdash;'}</span></td>
            <td class="recent-muted">${verifyFormatDate(driver.joinDate)}</td>
            <td><span class="status-pill ${statusCls}">${statusLabel}</span></td>
            <td class="recent-actions">${actionHtml}</td>
        `;
        tableBody.appendChild(row);
    });

    if (footerText) {
        footerText.textContent = `Showing ${start + 1} to ${end} of ${total} applications`;
    }
    renderVerifyPagination(totalPages);
}

function renderVerifyPagination(totalPages) {
    const pagination = document.getElementById('verifyPagination');
    if (!pagination) return;
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.innerHTML = '&lsaquo;';
    prev.disabled = currentPage === 0;
    prev.onclick = () => { if (currentPage > 0) { currentPage--; renderVerificationTable(); } };
    pagination.appendChild(prev);

    for (let i = 0; i < totalPages; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = (i + 1).toString();
        if (i === currentPage) btn.classList.add('active');
        btn.onclick = () => { currentPage = i; renderVerificationTable(); };
        pagination.appendChild(btn);
    }

    const next = document.createElement('button');
    next.type = 'button';
    next.innerHTML = '&rsaquo;';
    next.disabled = currentPage >= totalPages - 1;
    next.onclick = () => { if (currentPage < totalPages - 1) { currentPage++; renderVerificationTable(); } };
    pagination.appendChild(next);
}

window.onload = () => {
    loadVerificationData();
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
