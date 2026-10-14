// Save as: assets/css/js/admin-review-reject.js  (replaces the previous version)
// Loaded AFTER admin-review.js. It:
//   1. replaces the Reject behaviour with a reason modal, then opens a popup to email the driver by hand,
//   2. checks the driver's documents and, if one is missing, greys out Approve,
//      shows a warning banner with a quick "Reject: documents missing" button,
//      and shows a popup if the admin clicks Approve anyway.
(function () {
    const REASONS = [
        "Driver's licence is missing or unreadable",
        "Vehicle registration document is missing or unreadable",
        "Required documents are missing or unreadable",
        "Details don't match the documents provided",
        "Vehicle doesn't meet requirements",
        "Other"
    ];

    let missingDocs = [];   // names of documents that are missing or can't be opened

    function notify(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type);
        else alert(message);
    }

    // URL looks like review-application.html?id=DRV-10  ->  10
    function getDriverId() {
        const id = new URLSearchParams(window.location.search).get('id') || '';
        return Number(id.replace(/\D/g, ''));
    }

    /* ------------------------------------------------------------------ */
    /*  Reject modal                                                       */
    /* ------------------------------------------------------------------ */
    function showRejectModal(onConfirm, preset) {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;';
        backdrop.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:16px;width:100%;max-width:460px;box-shadow:0 20px 25px -5px rgba(0,0,0,.15);">
                <h3 style="margin:0 0 6px;color:#1e293b;font-size:18px;">Reject application</h3>
                <p style="margin:0 0 16px;color:#64748b;font-size:14px;">Next you will be able to email the driver this reason. They will also see it in the app and can fix the problem and re-apply.</p>
                <label style="font-size:13px;font-weight:600;color:#334155;">Reason</label>
                <select id="rejReason" style="width:100%;padding:10px;margin:6px 0 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#1e293b;">
                    ${REASONS.map(r => `<option>${r}</option>`).join('')}
                </select>
                <label style="font-size:13px;font-weight:600;color:#334155;">Note to the driver (optional)</label>
                <textarea id="rejNote" rows="3" maxlength="300" placeholder="e.g. Please upload a clearer photo of the front of your licence."
                    style="width:100%;padding:10px;margin:6px 0 8px;border:1px solid #cbd5e1;border-radius:8px;resize:vertical;box-sizing:border-box;background:#fff;color:#1e293b;"></textarea>
                <div id="rejError" style="color:#dc2626;font-size:13px;min-height:18px;margin-bottom:10px;"></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="rejCancel" style="padding:10px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:600;cursor:pointer;">Go back</button>
                    <button id="rejConfirm" style="padding:10px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;">Reject application</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        const reasonEl = backdrop.querySelector('#rejReason');
        const noteEl = backdrop.querySelector('#rejNote');
        const errEl = backdrop.querySelector('#rejError');
        const cancelBtn = backdrop.querySelector('#rejCancel');
        const confirmBtn = backdrop.querySelector('#rejConfirm');
        let busy = false;

        if (preset) {
            if (preset.reason) reasonEl.value = preset.reason;
            if (preset.note) noteEl.value = preset.note;
        }

        const close = () => backdrop.remove();
        cancelBtn.addEventListener('click', () => { if (!busy) close(); });
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop && !busy) close(); });

        confirmBtn.addEventListener('click', async () => {
            const reason = reasonEl.value;
            const note = noteEl.value.trim();
            errEl.textContent = '';

            if (reason === 'Other' && !note) {
                errEl.textContent = 'Please explain the reason in the note.';
                noteEl.style.borderColor = '#ef4444';
                return;
            }

            busy = true;
            confirmBtn.disabled = true;
            cancelBtn.disabled = true;
            confirmBtn.textContent = 'Rejecting...';

            const result = await onConfirm({ reason, note });

            if (result.ok) {
                close();
            } else {
                busy = false;
                confirmBtn.disabled = false;
                cancelBtn.disabled = false;
                confirmBtn.textContent = 'Reject application';
                errEl.textContent = result.message;
            }
        });
    }

    function rejectApplication(preset) {
        const driverId = getDriverId();
        if (!driverId) {
            notify('Could not read the driver ID from the page address.', 'error');
            return;
        }

        showRejectModal(async ({ reason, note }) => {
            const fullReason = note ? `${reason}: ${note}` : reason;
            try {
                const res = await fetch(`/api/admin/drivers/${driverId}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'Rejected',
                        reason: fullReason,
                        reviewedBy: localStorage.getItem('userEmail') || 'admin'
                    })
                });
                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.success) {
                    return { ok: false, message: data.message || 'Could not reject the application.' };
                }

                notify('Application rejected. Now email the driver.', 'success');

                const goToList = () => { window.location.href = 'verify-drivers.html'; };
                if (window.DriverEmail) {
                    window.DriverEmail.showModal({
                        driverId,
                        email: data.driverEmail,
                        firstName: data.driverFirstName,
                        reason: fullReason
                    }, goToList);
                } else {
                    // driver-email.js is not loaded on this page
                    setTimeout(goToList, 1500);
                }
                return { ok: true };
            } catch (err) {
                console.error('Reject failed:', err);
                return { ok: false, message: 'Could not reach the server. Try again.' };
            }
        }, preset);
    }

    /* ------------------------------------------------------------------ */
    /*  Missing documents                                                  */
    /* ------------------------------------------------------------------ */

    // Pre-fills the reject modal with a sensible reason for what is missing
    function missingDocsPreset() {
        const lic = missingDocs.includes("Driver's licence");
        const reg = missingDocs.includes('Vehicle registration document');
        if (lic && reg) {
            return { reason: REASONS[2], note: "Please upload: " + missingDocs.join(' and ') + '.' };
        }
        if (lic) {
            return { reason: REASONS[0], note: "Please upload a clear photo of your driver's licence." };
        }
        return { reason: REASONS[1], note: 'Please upload your vehicle registration document.' };
    }

    function rejectBecauseOfMissingDocs() {
        rejectApplication(missingDocsPreset());
    }

    // Popup shown when the admin clicks Approve while documents are missing
    function showMissingDocsPopup() {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;';
        backdrop.innerHTML = `
            <div style="background:#fff;padding:28px;border-radius:16px;width:100%;max-width:420px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,.15);">
                <div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;">!</div>
                <h3 style="margin:0 0 8px;color:#1e293b;font-size:18px;">This driver can't be approved yet</h3>
                <p style="margin:0 0 10px;color:#64748b;font-size:14px;">These documents are missing or can't be opened:</p>
                <ul id="missingList" style="list-style:none;padding:0;margin:0 0 16px;color:#b91c1c;font-weight:600;font-size:14px;"></ul>
                <p style="margin:0 0 20px;color:#64748b;font-size:13px;">Reject the application so the driver is told what to upload and can re-apply.</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="mdClose" style="flex:1;padding:11px 14px;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:600;cursor:pointer;">Close</button>
                    <button id="mdReject" style="flex:1;padding:11px 14px;border-radius:10px;border:none;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;">Reject: documents missing</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        const list = backdrop.querySelector('#missingList');
        missingDocs.forEach(name => {
            const li = document.createElement('li');
            li.textContent = '• ' + name;
            list.appendChild(li);
        });

        const close = () => backdrop.remove();
        backdrop.querySelector('#mdClose').addEventListener('click', close);
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
        backdrop.querySelector('#mdReject').addEventListener('click', () => {
            close();
            rejectBecauseOfMissingDocs();
        });
    }

    // Does the document exist on the server? (empty path or a 404 both count as missing)
    async function fileExists(path) {
        if (!path || !String(path).trim()) return false;
        let url = String(path).trim();
        if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) url = '/' + url;
        try {
            const res = await fetch(url, { method: 'HEAD' });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    // Greys out Approve and shows a banner while documents are missing
    function applyDocumentState() {
        const approveBtn = document.querySelector('#actionTray .btn-success');
        const tray = document.getElementById('actionTray');
        const oldBanner = document.getElementById('docMissingBanner');
        if (oldBanner) oldBanner.remove();

        if (missingDocs.length === 0) {
            if (approveBtn) {
                approveBtn.removeAttribute('aria-disabled');
                approveBtn.style.opacity = '';
                approveBtn.style.cursor = '';
                approveBtn.title = '';
            }
            return;
        }

        if (approveBtn) {
            approveBtn.setAttribute('aria-disabled', 'true');
            approveBtn.style.opacity = '0.45';
            approveBtn.style.cursor = 'not-allowed';
            approveBtn.title = "Can't approve: " + missingDocs.join(' and ') + ' missing';
        }

        if (tray) {
            const banner = document.createElement('div');
            banner.id = 'docMissingBanner';
            banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 14px;padding:14px 16px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:14px;';

            const text = document.createElement('div');
            text.innerHTML = '<strong>Missing documents:</strong> ';
            text.appendChild(document.createTextNode(missingDocs.join(' and ') + '. This driver can\'t be approved until they are provided.'));
            banner.appendChild(text);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Reject: documents missing';
            btn.style.cssText = 'padding:9px 14px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;';
            btn.addEventListener('click', rejectBecauseOfMissingDocs);
            banner.appendChild(btn);

            tray.parentNode.insertBefore(banner, tray);
        }
    }

    // For a driver who was rejected before: show when and why, and whether new documents arrived
    async function showReReviewBanner(driverId) {
        try {
            const res = await fetch('/api/admin/rejected-drivers');
            if (!res.ok) return;
            const list = await res.json();
            const info = Array.isArray(list) ? list.find(x => x.driverId === driverId) : null;
            const tray = document.getElementById('actionTray');
            if (!info || !tray) return;

            const old = document.getElementById('reReviewBanner');
            if (old) old.remove();

            const banner = document.createElement('div');
            banner.id = 'reReviewBanner';
            banner.style.cssText = 'margin:0 0 14px;padding:14px 16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:14px;line-height:1.5;';

            const title = document.createElement('strong');
            title.textContent = 'Re-review: ';
            banner.appendChild(title);

            const when = info.reviewedAt ? ' on ' + info.reviewedAt : '';
            banner.appendChild(document.createTextNode(
                'this application was rejected' + when +
                (info.rejectionReason ? ' (reason: ' + info.rejectionReason + ').' : '.') + ' '));

            const status = document.createElement('strong');
            if (info.documentsUpdated) {
                status.style.color = '#047857';
                status.textContent = 'New documents were uploaded since then.';
            } else {
                status.style.color = '#b45309';
                status.textContent = 'No new documents have been uploaded since then.';
            }
            banner.appendChild(status);

            tray.parentNode.insertBefore(banner, tray);
        } catch (err) {
            console.warn('Could not load previous rejection details:', err);
        }
    }

    // Your existing page code replaces the Approve/Reject buttons with a pink
    // "This application was rejected" bar. For a re-review we want the buttons back, so
    // hide that bar and show the buttons, and keep doing so if the page code redraws them.
    function showReReviewActions() {
        const tray = document.getElementById('actionTray');
        const notice = document.getElementById('approvedNotice');
        if (tray && tray.style.display !== 'flex') tray.style.display = 'flex';
        if (notice && notice.style.display !== 'none') notice.style.display = 'none';
    }

    function keepReReviewActions() {
        showReReviewActions();
        const observer = new MutationObserver(showReReviewActions);
        ['actionTray', 'approvedNotice'].forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { attributes: true, childList: true, subtree: true, characterData: true });
        });
    }

    async function checkDocuments() {
        const driverId = getDriverId();
        if (!driverId) return;

        try {
            const res = await fetch(`/api/admin/drivers/${driverId}`);
            if (!res.ok) return;
            const d = await res.json();

            // Nothing to approve if the driver is already approved
            if (d.isVerified || d.applicationStatus === 'Approved') return;

            // Previously rejected: explain why and whether new files have arrived
            if (d.applicationStatus === 'Rejected') {
                showReReviewBanner(driverId);
                keepReReviewActions();   // bring back Approve / Reject for the re-review
            }

            const [licenceOk, registrationOk] = await Promise.all([
                fileExists(d.licenseImagePath),
                fileExists(d.registrationFilePath)
            ]);

            missingDocs = [];
            if (!licenceOk) missingDocs.push("Driver's licence");
            if (!registrationOk) missingDocs.push('Vehicle registration document');

            applyDocumentState();
        } catch (err) {
            // If the check itself fails, don't block the page. The server still refuses
            // to approve a driver with missing documents.
            console.warn('Document check failed:', err);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Hook into the existing buttons                                     */
    /* ------------------------------------------------------------------ */
    const originalUpdate = window.updateApplicationStatus;
    window.updateApplicationStatus = function (status) {
        const s = String(status).toLowerCase();

        if (s.startsWith('reject')) {
            return rejectApplication();
        }

        if (s.startsWith('approv') && missingDocs.length > 0) {
            showMissingDocsPopup();
            return;
        }

        if (typeof originalUpdate === 'function') {
            return originalUpdate.apply(this, arguments);
        }
    };

    checkDocuments();
})();