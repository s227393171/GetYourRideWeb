// driver-details.js
// Fetches driver profile and trips and populates the Driver Details page.

async function fetchJson(url) {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} - ${url}`);
    return resp.json();
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function createRoleBadge(role) {
    if (!role) return '';
    // Format the raw role value from the database (e.g. STUDENT_DRIVER -> Student Driver)
    const normalized = String(role).replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase());
    return `<span style="display:inline-block; margin-left:10px; background:#eef2ff; color:#334155; padding:6px 10px; border-radius:999px; font-weight:700; font-size:13px;">${normalized}</span>`;
}

function mapStatusToBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return { cls: 'status-badge status-completed', label: 'Completed', color:'#10b981' };
    if (s === 'cancelled' || s === 'canceled') return { cls: 'status-badge status-cancelled', label: 'Cancelled', color:'#ef4444' };
    if (s === 'scheduled') return { cls: 'status-badge status-scheduled', label: 'Scheduled', color:'#3b82f6' };
    return { cls: 'status-badge status-unknown', label: status || 'Unknown', color:'#64748b' };
}

async function checkAssetExists(url) {
    if (!url) return false;
    try {
        const resp = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

function formatDateTime(raw) {
    try {
        const d = new Date(raw);
        if (isNaN(d)) return raw || 'N/A';
        return d.toLocaleString();
    } catch (e) { return raw || 'N/A'; }
}

async function init() {
    const id = getQueryParam('id');
    if (!id) {
        document.getElementById('driverName').innerText = 'Driver not specified';
        return;
    }

    try {
        const profile = await fetchJson(`/api/admin/drivers/${id}`);
        const trips = await fetchJson(`/api/admin/drivers/${id}/trips`);

        const nameEl = document.getElementById('driverName');
        const metaEl = document.getElementById('driverMeta');
        const avgBadge = document.getElementById('avgRatingBadge');

        const fullName = profile.fullName || profile.driverName || 'Unknown Driver';
        nameEl.innerText = fullName;
        const role = profile.role || profile.userRole || '';
        metaEl.innerHTML = `${profile.studentNumber || profile.idNumber || profile.driverId || ''} · ${profile.email || ''} ${createRoleBadge(role)}`;

        const avg = parseFloat(profile.averageRating ?? profile.avgRating ?? 0) || 0;
        avgBadge.innerText = avg > 0 ? `${avg.toFixed(1)} ★` : 'No rating yet';

        document.getElementById('contactNumber').innerText = profile.contactNumber || 'N/A';
        document.getElementById('driverStatus').innerText = profile.applicationStatus || profile.status || 'Active';
        document.getElementById('vehicleInfo').innerText = profile.vehicleMakeModel || profile.vehicle || 'Unassigned';
        document.getElementById('seatingCapacity').innerText = profile.seatingCapacity ? `${profile.seatingCapacity} Passengers` : 'N/A';
        document.getElementById('registrationNumber').innerText = profile.registrationNumber || profile.registration || 'N/A';
        document.getElementById('vehicleColor').innerText = profile.vehicleColor || profile.color || 'N/A';

        // Documents: only show documents card for student drivers
        const documentsCard = document.getElementById('documentsCard');
        const roleUpper = (role || '').toUpperCase();
        if (roleUpper === 'SHUTTLE_DRIVER' || roleUpper === 'SHUTTLE') {
            // remove documents card entirely
            documentsCard.style.display = 'none';
        } else {
            const licensePreview = document.getElementById('licensePreview');
            const licenseLink = document.getElementById('licenseLink');
            const regPreview = document.getElementById('regPreview');
            const regLink = document.getElementById('regLink');

            // check existence before rendering
            const licensePath = profile.licenseImagePath || profile.license || profile.driverLicensePath || '';
            const regPath = profile.registrationFilePath || profile.registrationFile || profile.vehicleRegistrationPath || '';

            if (await checkAssetExists(licensePath)) {
                licensePreview.innerHTML = `<img src="${licensePath}" alt="License" style="max-height:76px; max-width:100%; object-fit:contain;">`;
                licenseLink.href = licensePath;
                licenseLink.classList.remove('doc-link--disabled');
            } else {
                licensePreview.innerHTML = `<div style="color:#94a3b8;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 9h10M7 13h6"></path></svg><div style="margin-top:6px; font-weight:600;">No document uploaded</div></div>`;
                licenseLink.removeAttribute('href');
                licenseLink.classList.add('doc-link--disabled');
            }

            if (await checkAssetExists(regPath)) {
                regPreview.innerHTML = `<img src="${regPath}" alt="Registration" style="max-height:76px; max-width:100%; object-fit:contain;">`;
                regLink.href = regPath;
                regLink.classList.remove('doc-link--disabled');
            } else {
                regPreview.innerHTML = `<div style="color:#94a3b8;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path></svg><div style="margin-top:6px; font-weight:600;">No document uploaded</div></div>`;
                regLink.removeAttribute('href');
                regLink.classList.add('doc-link--disabled');
            }
        }

        // Trips
        const tripsList = document.getElementById('tripsList');
        if (!trips || trips.length === 0) {
            tripsList.innerHTML = `<div style="color:#64748b; padding:12px;">No trips found for this driver.</div>`;
        } else {
            tripsList.innerHTML = trips.map(t => {
                const statusRaw = t.status || t.tripStatus || '';
                const statusNormalized = String(statusRaw).toLowerCase();
                const badge = mapStatusToBadge(statusRaw);

                // Determine rating / review display consistently from status + aggregated rating
                let ratingBlock = '';
                if (t.rating != null) {
                    const firstReview = (t.reviews || '').split('|||').filter(Boolean)[0] || '';
                    ratingBlock = `<div style="color:#f59e0b; font-weight:700;">★ ${parseFloat(t.rating).toFixed(1)}</div>` + (firstReview ? `<div style="font-style:italic; color:#334155;">"${firstReview}"</div>` : '');
                } else if (statusNormalized === 'cancelled' || statusNormalized === 'canceled') {
                    ratingBlock = `<div style="color:#64748b;">No review — trip was cancelled</div>`;
                } else if (statusNormalized === 'completed') {
                    ratingBlock = `<div style="color:#64748b;">No review — trip completed</div>`;
                } else {
                    ratingBlock = `<div style="color:#64748b;">Upcoming trip — not yet completed</div>`;
                }

                const when = formatDateTime(t.departureTime || t.departure_time || t.date || t.createdAt || t.timestamp);
                const route = `${t.departureStop || t.origin || t.route || 'Route'} → ${t.destinationStop || t.destination || ''}`;

                return `
                    <div style="border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; gap:12px;">
                        <div style="flex:1;">
                            <div style="font-weight:700;">${route}</div>
                            <div style="color:var(--text-muted); font-size:13px; margin-top:6px;">${when}</div>
                            <div style="margin-top:8px;">${ratingBlock}</div>
                        </div>
                        <div style="min-width:110px; display:flex; align-items:flex-start; justify-content:flex-end;">
                            <div style="padding:6px 10px; border-radius:999px; background:${badge.color}; color:#ffffff; font-weight:700; font-size:13px;">${badge.label}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

    } catch (err) {
        console.error(err);
        document.getElementById('driverName').innerText = 'Error loading driver';
        document.getElementById('driverMeta').innerText = '';
    }
}

window.addEventListener('DOMContentLoaded', init);
