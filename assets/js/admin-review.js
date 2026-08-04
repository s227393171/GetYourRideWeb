// ---------------------------------------------------------
// Popup system (replaces browser alert() / confirm())
// Icons are inline SVG — no external icon font dependency.
// ---------------------------------------------------------
const POPUP_SVG_ICONS = {
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    warning: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
};

function ensurePopupRoot() {
    let root = document.getElementById("popupRoot");
    if (!root) {
        root = document.createElement("div");
        root.id = "popupRoot";
        document.body.appendChild(root);
    }
    return root;
}

function showToast(message, type = "info") {
    const root = ensurePopupRoot();

    const colors = {
        info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a8a", icon: "info" },
        success: { bg: "#f0fdf4", border: "#22c55e", text: "#14532d", icon: "success" },
        error: { bg: "#fef2f2", border: "#ef4444", text: "#7f1d1d", icon: "error" }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 3000;
        background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
        padding: 14px 18px; border-radius: 10px; display: flex; align-items: center; gap: 10px;
        font-weight: 600; font-size: 14px; box-shadow: 0 10px 20px -8px rgba(0,0,0,0.15);
        max-width: 360px; opacity: 0; transform: translateY(-10px); transition: all 0.25s ease;
    `;
    toast.innerHTML = `<span style="display:flex; flex-shrink:0;">${POPUP_SVG_ICONS[c.icon]}</span><span>${message}</span>`;
    root.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

function showConfirm(message, onConfirm) {
    const root = ensurePopupRoot();

    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        z-index: 3000; display: flex; align-items: center; justify-content: center;
    `;
    backdrop.innerHTML = `
        <div style="background:#fff; padding:28px; border-radius:16px; width:100%; max-width:380px; text-align:center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15);">
            <div style="width:56px; height:56px; border-radius:50%; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 14px auto;">
                ${POPUP_SVG_ICONS.warning}
            </div>
            <p style="margin:0 0 20px 0; color:#334155; font-size:14px; font-weight:600;">${message}</p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="popupCancelBtn" style="flex:1; padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; font-weight:600; cursor:pointer;">Cancel</button>
                <button id="popupConfirmBtn" style="flex:1; padding:10px 14px; border-radius:8px; border:none; background:#ef4444; color:#fff; font-weight:600; cursor:pointer;">Confirm</button>
            </div>
        </div>
    `;
    root.appendChild(backdrop);

    backdrop.querySelector("#popupCancelBtn").addEventListener("click", () => backdrop.remove());
    backdrop.querySelector("#popupConfirmBtn").addEventListener("click", () => {
        backdrop.remove();
        onConfirm();
    });
}



document.addEventListener("DOMContentLoaded", () => {
    // 1. Snag the student identifier from the page window URL string context
    const urlParams = new URLSearchParams(window.location.search);
    let studentId = urlParams.get('id');
    if (!studentId) {
        alert("Error: No structural driver target query provided in navigation route parameters.");
        window.location.href = "verify-drivers.html";
        return;
    }

    // Strip the "DRV-" display prefix (e.g. "DRV-5") down to the raw numeric ID
    // the backend's {driverId:int} route constraint expects.
    if (/^DRV-\d+$/i.test(studentId)) {
        studentId = studentId.replace(/^DRV-/i, '');
    }

    if (!/^\d+$/.test(studentId)) {
        alert("Error: Invalid driver ID format in URL.");
        window.location.href = "verify-drivers.html";
        return;
    }

    // 2. Load the combined details via API execution payload immediately
    loadApplicationProfile(studentId);
});

// Fetches the dynamic database join profile fields using Minimal API architecture endpoint mapping
async function loadApplicationProfile(studentId) {
    try {
        const response = await fetch(`/api/admin/drivers/${studentId}`);
        if (!response.ok) {
            throw new Error(`Profile target data could not be compiled or parsed successfully. status: ${response.status}`);
        }
        const data = await response.json();
        // Map personal metadata context properties
        document.getElementById("lblFullName").textContent = data.fullName;
        document.getElementById("lblStudentID").textContent = data.studentNumber;
        document.getElementById("lblEmail").textContent = data.email;
        document.getElementById("lblContact").textContent = data.contactNumber;
        // Map extended vehicle identity records
        document.getElementById("lblVehicleMake").textContent = data.vehicleMakeModel;
        document.getElementById("lblVehicleReg").textContent = data.registrationNumber;
        document.getElementById("lblCapacity").textContent = `${data.seatingCapacity} Passengers`;
        document.getElementById("lblColor").textContent = data.vehicleColor;
        // Load asset paths straight into the media document layouts
        if (data.licenseImagePath) {
            document.getElementById("imgLicense").src = data.licenseImagePath;
            document.getElementById("linkLicenseFull").href = data.licenseImagePath;
        }
        if (data.registrationFilePath) {
            document.getElementById("imgRegistration").src = data.registrationFilePath;
            document.getElementById("linkRegFull").href = data.registrationFilePath;
        }
        // Render current application execution text state if set values differ
        if (data.applicationStatus) {
            document.getElementById("applicationStatusLabel").textContent = data.applicationStatus.toUpperCase();
        }
    } catch (err) {
        console.error("Critical Client Execution Error parsing application review assets:", err);
        alert("Failed to successfully retrieve or display matching backend registration structures.");
    }
}

// Submits the ultimate logic decision parameter to the server
async function updateApplicationStatus(decision) {
    const urlParams = new URLSearchParams(window.location.search);
    let studentId = urlParams.get('id');

    if (/^DRV-\d+$/i.test(studentId)) {
        studentId = studentId.replace(/^DRV-/i, '');
    }

    if (!/^\d+$/.test(studentId)) {
        alert("Error: Invalid driver ID format in URL.");
        return;
    }

    if (!confirm(`Are you sure you want to change this driver status to: ${decision}?`)) {
        return;
    }
    try {
        const response = await fetch(`/api/admin/drivers/${studentId}/status`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: decision })
        });
        if (response.ok) {
            alert(`Application has been successfully marked as ${decision}!`);
            window.location.href = "verify-drivers.html"; // Route back out to the main pipeline rows
        } else {
            alert("Failed to submit status update execution rule on backend endpoint map framework.");
        }
    } catch (err) {
        console.error("Error patching processing decisions workflow state:", err);
    }
}