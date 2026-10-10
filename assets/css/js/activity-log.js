// Simple activity log using localStorage for Coordinator actions
(function(){
    'use strict';

    const KEY = 'gyrActivityLog';

    function read() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function write(arr) {
        try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
    }

    // type: 'assigned'|'scheduled'|'maintenance'|'update'|'driver_added'|'shuttle_added'
    window.logActivity = function(type, message) {
        if (!message) return;
        const list = read();
        list.unshift({ type: type || 'update', message: String(message), ts: new Date().toISOString() });
        // cap to 200 entries
        if (list.length > 200) list.length = 200;
        write(list);
        try { console.debug('[ActivityLog] logged', type, message); } catch(e) {}
        try { window.dispatchEvent(new Event('gyrActivityChanged')); } catch(e) {}
    };

    window.getRecentActivity = function(limit) {
        const list = read();
        return (list || []).slice(0, limit || 8);
    };

    window.clearActivityLog = function() { write([]); };

})();
