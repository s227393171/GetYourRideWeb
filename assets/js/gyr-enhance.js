/* ============================================================
   GetYourRide — Shared UI Enhancement Layer (dependency-free)
   ------------------------------------------------------------
   Progressive enhancement only. If this script fails to load
   or JS is disabled, every page still renders and functions
   exactly as before. It does NOT alter markup semantics,
   content, or existing behavior/handlers.

   Provides:
     - Scroll progress bar
     - Glass/blur navbar state on scroll
     - Scroll-reveal for sections & cards (IntersectionObserver)
     - Count-up animation for stat/metric numbers
   All effects respect prefers-reduced-motion.
   ============================================================ */
(function () {
    "use strict";

    var REDUCED = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- utilities ---------- */
    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn, { once: true });
        } else {
            fn();
        }
    }

    /* ---------- 1. Scroll progress bar ---------- */
    function initScrollProgress() {
        var bar = document.createElement("div");
        bar.className = "gyr-scroll-progress";
        document.body.appendChild(bar);

        // The app's dashboards scroll inside .main-content, standalone
        // pages scroll on window. Support both.
        var scroller = document.querySelector(".main-content");
        var target = scroller || window;

        function getMetrics() {
            if (scroller) {
                return {
                    top: scroller.scrollTop,
                    max: scroller.scrollHeight - scroller.clientHeight
                };
            }
            var doc = document.documentElement;
            return {
                top: window.scrollY || doc.scrollTop,
                max: doc.scrollHeight - doc.clientHeight
            };
        }

        var ticking = false;
        function update() {
            var m = getMetrics();
            var pct = m.max > 0 ? (m.top / m.max) * 100 : 0;
            bar.style.width = pct.toFixed(2) + "%";
            ticking = false;
        }
        function onScroll() {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }
        target.addEventListener("scroll", onScroll, { passive: true });
        update();
    }

    /* ---------- 2. Glass navbar on scroll ---------- */
    function initNavbarState() {
        var navbar = document.querySelector(".top-navbar");
        if (!navbar) return;

        var scroller = document.querySelector(".main-content") || window;
        function readTop() {
            return scroller === window
                ? (window.scrollY || document.documentElement.scrollTop)
                : scroller.scrollTop;
        }
        function apply() {
            navbar.classList.toggle("gyr-scrolled", readTop() > 8);
        }
        scroller.addEventListener("scroll", apply, { passive: true });
        apply();
    }

    /* ---------- 3. Scroll-reveal ---------- */
    var REVEAL_SELECTORS = [
        ".welcome-banner",
        ".gyr-welcome-banner",
        ".stats-row",
        ".gyr-stats-strip",
        ".metrics-grid",
        ".action-cards-grid",
        ".use-case-grid",
        ".table-card",
        ".review-card",
        ".metric-card",
        ".stat-card",
        ".gyr-stat-card",
        ".action-card",
        ".uc-card"
    ];

    function initReveal() {
        var nodes = [];
        REVEAL_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                // Skip if an ancestor is already a reveal target (avoid double)
                if (el.closest(".gyr-reveal")) return;
                nodes.push(el);
            });
        });

        if (!nodes.length) return;

        if (REDUCED || !("IntersectionObserver" in window)) {
            nodes.forEach(function (el) { el.classList.add("gyr-reveal", "gyr-in"); });
            return;
        }

        nodes.forEach(function (el, i) {
            el.classList.add("gyr-reveal");
            // subtle stagger for direct siblings in a grid
            var mod = i % 4;
            if (mod) el.classList.add("gyr-d" + mod);
        });

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("gyr-in");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

        nodes.forEach(function (el) { io.observe(el); });
    }

    /* ---------- 4. Count-up for stat numbers ---------- */
    var COUNT_SELECTORS = [
        ".stat-value",
        ".metric-value",
        ".gyr-stat-value",
        ".metric-card h3"
    ];

    function animateCount(el, target, decimals) {
        var duration = 900;
        var start = null;
        el.classList.add("gyr-counting");

        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            // easeOutCubic
            var eased = 1 - Math.pow(1 - p, 3);
            var val = target * eased;
            el.textContent = decimals
                ? val.toFixed(decimals)
                : Math.round(val).toString();
            if (p < 1) window.requestAnimationFrame(step);
            else el.textContent = decimals ? target.toFixed(decimals) : String(target);
        }
        window.requestAnimationFrame(step);
    }

    function parseNumeric(text) {
        // Only animate plain numbers (optionally with decimals). Leave
        // dashes, currency, times, and mixed strings untouched.
        var t = text.trim();
        if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(t)) return null;
        var clean = t.replace(/,/g, "");
        var num = parseFloat(clean);
        if (isNaN(num)) return null;
        var decimals = clean.indexOf(".") > -1 ? (clean.split(".")[1].length) : 0;
        return { num: num, decimals: decimals };
    }

    function initCounters() {
        if (REDUCED || !("IntersectionObserver" in window)) return;

        var els = [];
        COUNT_SELECTORS.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) { els.push(el); });
        });
        if (!els.length) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                io.unobserve(el);
                var parsed = parseNumeric(el.textContent);
                if (parsed) animateCount(el, parsed.num, parsed.decimals);
            });
        }, { threshold: 0.5 });

        els.forEach(function (el) { io.observe(el); });

        // Dashboards fill these numbers asynchronously (fetch). Re-run a
        // one-shot count when their text changes from a placeholder.
        els.forEach(function (el) {
            var mo = new MutationObserver(function () {
                var parsed = parseNumeric(el.textContent);
                if (parsed && !el.dataset.gyrCounted) {
                    el.dataset.gyrCounted = "1";
                    animateCount(el, parsed.num, parsed.decimals);
                }
            });
            mo.observe(el, { childList: true, characterData: true, subtree: true });
        });
    }

    /* ---------- boot ---------- */
    onReady(function () {
        try { initScrollProgress(); } catch (e) { }
        try { initNavbarState(); } catch (e) { }
        try { initReveal(); } catch (e) { }
        try { initCounters(); } catch (e) { }
    });
})();
