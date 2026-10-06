/* ============================================================
   animations.js — Shared "bring it to life" layer.
   Count-up stat numbers, staggered table rows, animated star
   fill, button ripple. Reads what the existing code already
   rendered and animates it — no data/logic changes.
   Runs on load and re-applies when tables/stat values change,
   but each element animates only ONCE (so auto-refresh won't
   re-trigger annoyingly).
   ============================================================ */
(function () {
    'use strict';

    const reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Count-up numbers ---------- */
    // Targets the known stat-value elements across all portals.
    const STAT_SELECTOR = [
        '.dash-stat-value',
        '.metric-value',
        '.gyr-stat-value',
        '#statPendingApplications', '#statActiveDrivers',
        '#statAverageRating', '#statTripsToday',
        '#statVerifyPending', '#statVerifyApproved',
        '#metricActiveDrivers', '#metricAverageRating',
        '#metricTotalTrips', '#metricPoorFlags',
        '#glShuttles', '#glDrivers', '#glTrips', '#glUnassigned'
    ].join(',');

    function parseNumberParts(text) {
        // Extract a leading/!only number, preserve prefix/suffix and decimals.
        const m = String(text).match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
        if (!m) return null;
        const prefix = m[1] || '';
        const raw = m[2].replace(/,/g, '');
        const suffix = m[3] || '';
        const decimals = (raw.split('.')[1] || '').length;
        const hadComma = m[2].indexOf(',') !== -1;
        return { prefix, value: parseFloat(raw), suffix, decimals, hadComma };
    }

    function formatNumber(n, decimals, hadComma) {
        let s = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
        if (hadComma) {
            const parts = s.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            s = parts.join('.');
        }
        return s;
    }

    function countUp(el) {
        if (el.dataset.gyrCounted) return;
        const parts = parseNumberParts(el.textContent.trim());
        if (!parts || isNaN(parts.value)) return;      // skip "—", "None", etc.
        el.dataset.gyrCounted = '1';

        if (reduceMotion || parts.value === 0) {
            return; // leave the real value as-is
        }

        const target = parts.value;
        const duration = 900;
        const start = performance.now();

        function frame(now) {
            const t = Math.min((now - start) / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            const current = target * eased;
            el.textContent = parts.prefix + formatNumber(current, parts.decimals, parts.hadComma) + parts.suffix;
            if (t < 1) requestAnimationFrame(frame);
            else el.textContent = parts.prefix + formatNumber(target, parts.decimals, parts.hadComma) + parts.suffix;
        }
        requestAnimationFrame(frame);
    }

    function animateStats(root) {
        (root || document).querySelectorAll(STAT_SELECTOR).forEach(countUp);
    }

    /* ---------- Staggered table row entrance ---------- */
    function animateRows(tbody) {
        if (reduceMotion) return;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(function (row, i) {
            if (row.dataset.gyrRowAnim) return;
            if (row.querySelector('td[colspan]')) return; // skip placeholders
            row.dataset.gyrRowAnim = '1';
            row.style.animation = 'gyrRowIn 0.4s cubic-bezier(0.22,1,0.36,1) both';
            row.style.animationDelay = Math.min(i * 0.05, 0.4) + 's';
        });
    }

    function animateAllTables(root) {
        (root || document).querySelectorAll('tbody').forEach(animateRows);
    }

    /* ---------- Animated star fill ---------- */
    function animateStars(root) {
        if (reduceMotion) return;
        (root || document).querySelectorAll('.star-color').forEach(function (star, i) {
            if (star.dataset.gyrStar) return;
            star.dataset.gyrStar = '1';
            star.style.animation = 'gyrStarPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both';
            star.style.animationDelay = (i % 5) * 0.06 + 's';
        });
    }

    /* ---------- Run on load + observe for dynamically added content ---------- */
    function runAll() {
        animateStats(document);
        animateAllTables(document);
        animateStars(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(runAll, 150);
        });
    } else {
        setTimeout(runAll, 150);
    }

    // Tables/stats are often filled by async fetches after load — observe and
    // animate newly rendered content (each element still animates only once).
    const observer = new MutationObserver(function (mutations) {
        let touched = false;
        mutations.forEach(function (m) {
            if (m.addedNodes && m.addedNodes.length) touched = true;
        });
        if (touched) {
            // debounce
            clearTimeout(window.__gyrAnimTimer);
            window.__gyrAnimTimer = setTimeout(runAll, 120);
        }
    });
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ---------- Button ripple ---------- */
    document.addEventListener('click', function (e) {
        if (reduceMotion) return;
        const btn = e.target.closest(
            '.btn-review, .btn-review-profile, .btn-review-driver, .tb-logout, ' +
            '.top-logout-btn, .close-modal-btn, .gyr-settings-save, .filter-tab, ' +
            '.uc-link-text, .recent-view-all'
        );
        if (!btn) return;
        // Needs positioning context for the ripple.
        const cs = getComputedStyle(btn);
        if (cs.position === 'static') btn.style.position = 'relative';
        btn.style.overflow = 'hidden';

        const circle = document.createElement('span');
        circle.className = 'gyr-ripple';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        circle.style.width = circle.style.height = size + 'px';
        circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
        circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(circle);
        setTimeout(function () { circle.remove(); }, 600);
    });
})();
