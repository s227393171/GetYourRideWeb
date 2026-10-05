/* ============================================================
   topbar.js — Shared top-bar-right actions for every portal page.
   Builds: Settings icon, Help icon, divider, live orange clock,
   role-based portal label, red Logout button — and injects them
   into <div id="topbar-actions"></div>.
   Build once, used everywhere. No per-page copy/paste.
   ============================================================ */
/* Generic client-side table filter used by the shared search boxes.
   Hides rows in the given <tbody> that don't contain the search text.
   Safe no-op if the table isn't on the page. */
window.gyrFilterTable = function (tbodyId, term) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const q = (term || '').trim().toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    let visible = 0;
    rows.forEach(function (row) {
        // Skip placeholder/empty-state rows (single cell spanning the table).
        if (row.querySelector('td[colspan]')) return;
        const match = row.textContent.toLowerCase().indexOf(q) !== -1;
        row.style.display = (q === '' || match) ? '' : 'none';
        if (q === '' || match) visible++;
    });

    // Show a "no matches" row when a non-empty search hides everything.
    let noRow = tbody.querySelector('.gyr-no-match-row');
    if (q !== '' && visible === 0) {
        if (!noRow) {
            noRow = document.createElement('tr');
            noRow.className = 'gyr-no-match-row';
            noRow.innerHTML = '<td colspan="12" style="text-align:center; padding:24px; color:var(--text-secondary,#64748b);">No matches found.</td>';
            tbody.appendChild(noRow);
        }
        noRow.style.display = '';
    } else if (noRow) {
        noRow.style.display = 'none';
    }
};

(function () {
    'use strict';

    const mount = document.getElementById('topbar-actions');
    if (!mount) return; // page opted out (e.g. login)

    // ---------- Portal label from role/session, else folder ----------
    function getPortalLabel() {
        // Prefer an explicit stored role from login/session.
        let role = '';
        try {
            role = (localStorage.getItem('userRole') ||
                    localStorage.getItem('role') ||
                    sessionStorage.getItem('userRole') || '').toUpperCase();
        } catch (e) { /* ignore */ }

        if (role.indexOf('ADMIN') !== -1) return 'Admin Portal';
        if (role.indexOf('COORDINATOR') !== -1) return 'Coordinator Portal';
        if (role.indexOf('DRIVER') !== -1) return 'Driver Portal';

        // Fallback: infer from the URL folder.
        const path = window.location.pathname.toLowerCase();
        if (path.indexOf('/admin/') !== -1) return 'Admin Portal';
        if (path.indexOf('/coordinator/') !== -1) return 'Coordinator Portal';
        if (path.indexOf('/driver/') !== -1) return 'Driver Portal';
        return 'GetYourRide Portal';
    }

    // ---------- Icons (inline SVG so no icon-font dependency) ----------
    const gearSvg =
        '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
    const helpSvg =
        '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    const logoutSvg =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>';

    // ---------- Build markup ----------
    mount.classList.add('topbar-actions');
    mount.innerHTML =
        '<div class="tb-icon-group">' +
            '<button type="button" class="tb-icon-btn" id="tbSettings" title="Settings" aria-label="Settings">' + gearSvg + '</button>' +
            '<button type="button" class="tb-icon-btn" id="tbHelp" title="Help" aria-label="Help">' + helpSvg + '</button>' +
        '</div>' +
        '<div class="tb-divider" aria-hidden="true"></div>' +
        '<span class="tb-clock" id="tbClock" aria-label="Current time">00:00:00</span>' +
        '<span class="tb-portal-label" id="tbPortalLabel">' + getPortalLabel() + '</span>' +
        '<button type="button" class="tb-logout" id="tbLogout" aria-label="Log out">' +
            logoutSvg + '<span>Logout</span>' +
        '</button>';

    // ---------- Live clock (starts immediately, ticks every second) ----------
    const clockEl = document.getElementById('tbClock');
    function tick() {
        if (!clockEl) return;
        const n = new Date();
        const p = function (x) { return String(x).padStart(2, '0'); };
        clockEl.textContent = p(n.getHours()) + ':' + p(n.getMinutes()) + ':' + p(n.getSeconds());
    }
    tick();
    setInterval(tick, 1000);

    // ---------- Settings ----------
    document.getElementById('tbSettings').addEventListener('click', function () {
        if (typeof window.openSettingsModal === 'function') {
            window.openSettingsModal();
        } else if (typeof window.gyrOpenSettings === 'function') {
            window.gyrOpenSettings();
        }
    });

    // ---------- Help / Support ----------
    document.getElementById('tbHelp').addEventListener('click', function () {
        // Prefer a page-provided support opener.
        if (typeof window.openSupportModal === 'function') {
            window.openSupportModal();
            return;
        }
        // Else show an existing support modal element if present.
        const sm = document.getElementById('supportModal');
        if (sm) {
            sm.classList.add('show', 'active');
            sm.style.setProperty('display', 'flex', 'important');
            return;
        }
        // Fallback: a lightweight support dialog.
        alert('Support Help\n\nTransit Control Line: +27 (0) 41 504 1111\nEmail: support@getyourride.com');
    });

    // ---------- Logout ----------
    document.getElementById('tbLogout').addEventListener('click', function () {
        // Reuse a page's existing logout flow (confirmation modal) if present.
        if (typeof window.handleLogout === 'function') {
            window.handleLogout();
            return;
        }
        if (confirm('Log out of your session?')) {
            try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* ignore */ }
            // Resolve login path relative to current folder depth.
            const path = window.location.pathname.toLowerCase();
            const inSub = path.indexOf('/admin/') !== -1 ||
                          path.indexOf('/coordinator/') !== -1 ||
                          path.indexOf('/driver/') !== -1;
            window.location.href = inSub ? '../Login.html' : 'Login.html';
        }
    });
})();
