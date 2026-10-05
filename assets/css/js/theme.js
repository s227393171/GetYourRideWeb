/* ============================================================
   theme.js — Shared theme + Settings logic for every page.
   - Applies theme via data-theme on <html>
   - Injects ONE identical Settings popup
   - Persists theme + refresh frequency in localStorage
   - Syncs across tabs via the "storage" event
   Note: a tiny inline script in each page's <head> applies the
   saved theme before paint to avoid a flash of the wrong theme.
   ============================================================ */
(function () {
    'use strict';

    const THEME_KEY = 'portalTheme';     // 'light' | 'dark'
    const REFRESH_KEY = 'portalRefresh'; // ms string | 'manual'

    function getTheme() {
        const t = localStorage.getItem(THEME_KEY);
        return t === 'dark' ? 'dark' : 'light';
    }

    function getRefresh() {
        return localStorage.getItem(REFRESH_KEY) || 'manual';
    }

    // Apply theme via [data-theme] on <html>. We intentionally do NOT add
    // the legacy body.dark-mode class, because old stylesheets contain
    // conflicting body.dark-mode rules with !important that fight the new
    // palette. [data-theme] in theme.css is now the single source of truth.
    function applyTheme(theme) {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
        if (document.body) {
            document.body.classList.remove('dark-mode');
        }
    }

    // ---------- Refresh frequency ----------
    let refreshTimer = null;
    function applyRefresh(value) {
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
        const ms = parseInt(value, 10);
        if (!isNaN(ms) && ms > 0) {
            refreshTimer = setInterval(function () {
                // Prefer a page-provided refresh hook; else reload.
                if (typeof window.portalRefreshData === 'function') {
                    window.portalRefreshData();
                } else {
                    window.location.reload();
                }
            }, ms);
        }
    }

    // ---------- Settings popup (injected once) ----------
    function buildSettingsModal() {
        if (document.getElementById('gyrSettingsOverlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'gyr-settings-overlay';
        overlay.id = 'gyrSettingsOverlay';
        overlay.innerHTML =
            '<div class="gyr-settings-card" role="dialog" aria-modal="true" aria-label="Settings">' +
                '<h3>' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' +
                    'Settings' +
                '</h3>' +
                '<label for="gyrThemeSelect">Dashboard Theme</label>' +
                '<select id="gyrThemeSelect">' +
                    '<option value="light">Light Mode</option>' +
                    '<option value="dark">Dark Mode</option>' +
                '</select>' +
                '<label for="gyrRefreshSelect">Refresh Frequency</label>' +
                '<select id="gyrRefreshSelect">' +
                    '<option value="manual">Manual Refresh</option>' +
                    '<option value="30000">Every 30 Seconds</option>' +
                    '<option value="60000">Every Minute</option>' +
                '</select>' +
                '<button type="button" class="gyr-settings-save" id="gyrSettingsSave">Save &amp; Close</button>' +
            '</div>';

        document.body.appendChild(overlay);

        // Live preview: changing the theme dropdown applies immediately
        overlay.querySelector('#gyrThemeSelect').addEventListener('change', function (e) {
            applyTheme(e.target.value);
        });

        overlay.querySelector('#gyrSettingsSave').addEventListener('click', saveAndClose);

        // Click outside the card closes (reverting unsaved theme preview)
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeSettings();
        });
    }

    function openSettings() {
        buildSettingsModal();
        const overlay = document.getElementById('gyrSettingsOverlay');
        // Sync dropdowns to current saved values
        const themeSel = document.getElementById('gyrThemeSelect');
        const refreshSel = document.getElementById('gyrRefreshSelect');
        if (themeSel) themeSel.value = getTheme();
        if (refreshSel) refreshSel.value = getRefresh();
        overlay.classList.add('show');
    }

    function closeSettings() {
        const overlay = document.getElementById('gyrSettingsOverlay');
        if (overlay) overlay.classList.remove('show');
        // Revert any unsaved live-preview back to the stored theme
        applyTheme(getTheme());
    }

    function saveAndClose() {
        const themeSel = document.getElementById('gyrThemeSelect');
        const refreshSel = document.getElementById('gyrRefreshSelect');
        const theme = themeSel ? themeSel.value : getTheme();
        const refresh = refreshSel ? refreshSel.value : getRefresh();

        localStorage.setItem(THEME_KEY, theme);
        localStorage.setItem(REFRESH_KEY, refresh);

        applyTheme(theme);
        applyRefresh(refresh);

        const overlay = document.getElementById('gyrSettingsOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    // ---------- Expose/override global hooks used by existing buttons ----------
    // Existing pages call openSettingsModal()/closeSettingsModal(); route them here.
    window.openSettingsModal = openSettings;
    window.closeSettingsModal = saveAndClose; // existing "Save & Close" buttons on old modals
    window.gyrOpenSettings = openSettings;

    // ---------- Cross-tab sync ----------
    window.addEventListener('storage', function (e) {
        if (e.key === THEME_KEY) {
            applyTheme(getTheme());
            const sel = document.getElementById('gyrThemeSelect');
            if (sel) sel.value = getTheme();
        }
        if (e.key === REFRESH_KEY) {
            applyRefresh(getRefresh());
        }
    });

    // ---------- Init ----------
    function init() {
        applyTheme(getTheme());   // ensure correct even if head script missed
        applyRefresh(getRefresh());
        buildSettingsModal();

        // Hide/neutralize any legacy per-page settings modal so there is
        // only ONE popup (the injected one). Old trigger buttons still call
        // openSettingsModal(), now routed to the shared popup.
        const legacy = document.getElementById('settingsModal');
        if (legacy) legacy.style.display = 'none';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Other scripts (admin-dropdown.js, driver-dashboard.js) re-add the legacy
    // body.dark-mode class on window 'load'. Strip it again afterwards so only
    // [data-theme] controls theming and old conflicting rules stay dormant.
    window.addEventListener('load', function () {
        if (document.body) document.body.classList.remove('dark-mode');
        applyTheme(getTheme());
    });
})();
