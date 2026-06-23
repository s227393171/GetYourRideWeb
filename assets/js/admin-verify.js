const UNVERIFIED_API = '/api/admin/unverified-drivers';
const VERIFY_ACTION_API = '/api/admin/verify-driver';
let cachedUnverified = [];

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
    tableBody.innerHTML = '';

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#64748b; font-weight:500;">🎉 No pending files need verification.</td></tr>`;
        return;
    }

    list.forEach(driver => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${driver.fullName}</strong></td>
            <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-weight:600;">${driver.studentNumber}</code></td>
            <td>${driver.email}</td>
            <td>
                <a href="review-application.html?id=${driver.studentNumber}" class="btn-action verify-approve" style="display: inline-block; text-decoration: none; text-align: center;">
                    🛡️ Approve & Verify Profile
                </a>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Retaining your original approve function in case you use it anywhere else in your codebase
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
    renderVerificationTable(cachedUnverified.filter(u => u.fullName.toUpperCase().includes(term) || u.studentNumber.toUpperCase().includes(term)));
}

// Global UI Navigation Controllers
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
};