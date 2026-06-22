// Controls the absolute menu overlay inside dashboard.html
function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('adminGlobalDropdown').classList.toggle('show');
}

function executeLogout() {
    if (confirm("Log out of Admin Session?")) {
        window.location.href = "../Login.html";
    }
}

window.addEventListener('click', function () {
    const dropdown = document.getElementById('adminGlobalDropdown');
    if (dropdown) dropdown.classList.remove('show');
});