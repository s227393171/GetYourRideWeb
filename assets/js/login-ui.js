// small UI behavior for login page: show/hide password and fetch stats
(function(){
    const pwdShow = document.getElementById('pwdShow');
    const pwdInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    const statActive = document.getElementById('statActive');
    const statPending = document.getElementById('statPending');
    const statAvg = document.getElementById('statAvg');

    if (pwdShow && pwdInput) {
        pwdShow.addEventListener('click', () => {
            if (pwdInput.type === 'password') { pwdInput.type = 'text'; pwdShow.textContent = 'Hide'; }
            else { pwdInput.type = 'password'; pwdShow.textContent = 'Show'; }
        });
    }

    async function loadStats(){
        try {
            const [approvedRes, pendingRes, ratingsRes] = await Promise.all([
                fetch('/api/admin/verified-student-drivers'),
                fetch('/api/admin/unverified-drivers'),
                fetch('/api/admin/driver-ratings')
            ]);
            const [approved, pending, ratings] = await Promise.all([approvedRes.json(), pendingRes.json(), ratingsRes.json()]);
            if (statActive) statActive.textContent = Array.isArray(approved)? approved.length : '—';
            if (statPending) statPending.textContent = Array.isArray(pending)? pending.length : '—';
            if (statAvg && Array.isArray(ratings)) {
                const vals = ratings.map(r=>Number(r.avg_rating||r.average_rating||r.rating)).filter(n=>!Number.isNaN(n));
                statAvg.textContent = vals.length? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
            }
        } catch (e) { console.warn('stats load failed', e); }
    }

    if (document.querySelector('.brand-panel')) loadStats();
})();
