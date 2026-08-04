
const POPUP_SVG_ICONS = {
    info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    success: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    question: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
};


(function injectPopupStyles() {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes popupSlideIn {
            from { opacity: 0; transform: translateY(-16px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popupSlideOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-16px) scale(0.96); }
        }
        @keyframes popupBounceIn {
            0% { opacity: 0; transform: scale(0.7); }
            50% { transform: scale(1.03); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes popupFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .popup-toast {
            animation: popupSlideIn 0.3s ease forwards;
        }
        .popup-toast.hiding {
            animation: popupSlideOut 0.25s ease forwards;
        }
        .popup-backdrop {
            animation: popupFadeIn 0.2s ease forwards;
        }
        .popup-dialog {
            animation: popupBounceIn 0.35s ease forwards;
        }
        .popup-btn {
            transition: all 0.15s ease;
        }
        .popup-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .popup-btn:active {
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();

function ensurePopupRoot() {
    let root = document.getElementById("popupRoot");
    if (!root) {
        root = document.createElement("div");
        root.id = "popupRoot";
        document.body.appendChild(root);
    }
    return root;
}

// ---------------------------------------------------------
// showToast — cute floating notification (auto-dismisses)
// ---------------------------------------------------------
function showToast(message, type = "info") {
    const root = ensurePopupRoot();

    const colors = {
        info: { bg: "#eef4ff", border: "#a5b4fc", text: "#3730a3", icon: "info", glow: "rgba(99,102,241,0.15)" },
        success: { bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46", icon: "success", glow: "rgba(16,185,129,0.15)" },
        error: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "error", glow: "rgba(239,68,68,0.15)" },
        warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", icon: "warning", glow: "rgba(245,158,11,0.15)" }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.className = "popup-toast";
    toast.style.cssText = `
        position: fixed; top: 24px; right: 24px; z-index: 9999;
        background: ${c.bg}; border: 1.5px solid ${c.border}; color: ${c.text};
        padding: 16px 20px; border-radius: 14px; display: flex; align-items: center; gap: 12px;
        font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 8px 24px -4px ${c.glow}, 0 4px 8px -2px rgba(0,0,0,0.08);
        max-width: 380px; line-height: 1.4;
    `;
    toast.innerHTML = `
        <span style="display:flex; flex-shrink:0; opacity:0.9;">${POPUP_SVG_ICONS[c.icon]}</span>
        <span>${message}</span>
    `;
    root.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}


function showPopup(message, type = "info", onDismiss = null) {
    const root = ensurePopupRoot();

    const colors = {
        info: { bg: "#eef4ff", icon: "#6366f1", iconBg: "#e0e7ff" },
        success: { bg: "#ecfdf5", icon: "#10b981", iconBg: "#d1fae5" },
        error: { bg: "#fef2f2", icon: "#ef4444", iconBg: "#fee2e2" },
        warning: { bg: "#fffbeb", icon: "#f59e0b", iconBg: "#fef3c7" }
    };
    const c = colors[type] || colors.info;

    const backdrop = document.createElement("div");
    backdrop.className = "popup-backdrop";
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
        z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    backdrop.innerHTML = `
        <div class="popup-dialog" style="background:#fff; padding:32px; border-radius:20px; width:100%; max-width:360px; text-align:center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2);">
            <div style="width:60px; height:60px; border-radius:50%; background:${c.iconBg}; color:${c.icon}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
                ${POPUP_SVG_ICONS[type] || POPUP_SVG_ICONS.info}
            </div>
            <p style="margin:0 0 24px 0; color:#334155; font-size:15px; font-weight:500; line-height:1.5;">${message}</p>
            <button class="popup-btn" id="popupOkBtn" style="
                padding: 11px 32px; border-radius: 10px; border: none;
                background: linear-gradient(135deg, ${c.icon}, ${c.icon}dd);
                color: #fff; font-weight: 600; font-size: 14px; cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">Got it</button>
        </div>
    `;
    root.appendChild(backdrop);

    backdrop.querySelector("#popupOkBtn").addEventListener("click", () => {
        backdrop.remove();
        if (onDismiss) onDismiss();
    });
}


function showConfirm(message, onConfirm, options = {}) {
    const root = ensurePopupRoot();

    const type = options.type || "warning";
    const confirmText = options.confirmText || "Yes, Confirm";
    const cancelText = options.cancelText || "Cancel";

    const colors = {
        warning: { icon: "#f59e0b", iconBg: "#fef3c7", btnBg: "#f59e0b" },
        error: { icon: "#ef4444", iconBg: "#fee2e2", btnBg: "#ef4444" },
        info: { icon: "#6366f1", iconBg: "#e0e7ff", btnBg: "#6366f1" },
        success: { icon: "#10b981", iconBg: "#d1fae5", btnBg: "#10b981" }
    };
    const c = colors[type] || colors.warning;

    const backdrop = document.createElement("div");
    backdrop.className = "popup-backdrop";
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
        z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    backdrop.innerHTML = `
        <div class="popup-dialog" style="background:#fff; padding:32px; border-radius:20px; width:100%; max-width:400px; text-align:center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.2);">
            <div style="width:60px; height:60px; border-radius:50%; background:${c.iconBg}; color:${c.icon}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
                ${POPUP_SVG_ICONS.question}
            </div>
            <p style="margin:0 0 24px 0; color:#334155; font-size:15px; font-weight:500; line-height:1.5;">${message}</p>
            <div style="display:flex; gap:12px; justify-content:center;">
                <button class="popup-btn" id="popupCancelBtn" style="
                    flex:1; padding:11px 16px; border-radius:10px;
                    border:1.5px solid #e2e8f0; background:#f8fafc; color:#475569;
                    font-weight:600; font-size:14px; cursor:pointer;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">${cancelText}</button>
                <button class="popup-btn" id="popupConfirmBtn" style="
                    flex:1; padding:11px 16px; border-radius:10px; border:none;
                    background: linear-gradient(135deg, ${c.btnBg}, ${c.btnBg}dd);
                    color:#fff; font-weight:600; font-size:14px; cursor:pointer;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">${confirmText}</button>
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
    const urlParams = new URLSearchParams(window.location.search);
    let studentId = urlParams.get('id');

    if (!studentId) {
        showPopup("No driver ID was provided in the URL. Redirecting you back to the verification list.", "error", () => {
            window.location.href = "verify-drivers.html";
        });
        return;
    }

  
    if (/^DRV-\d+$/i.test(studentId)) {
        studentId = studentId.replace(/^DRV-/i, '');
    }

    if (!/^\d+$/.test(studentId)) {
        showPopup("The driver ID format in the URL is invalid. Redirecting you back.", "error", () => {
            window.location.href = "verify-drivers.html";
        });
        return;
    }

   
    loadApplicationProfile(studentId);
});

async function loadApplicationProfile(studentId) {
    try {
        const response = await fetch(`/api/admin/drivers/${studentId}`);
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        const data = await response.json();

        
        document.getElementById("lblFullName").textContent = data.fullName;
        document.getElementById("lblStudentID").textContent = data.studentNumber;
        document.getElementById("lblEmail").textContent = data.email;
        document.getElementById("lblContact").textContent = data.contactNumber;

        
        document.getElementById("lblVehicleMake").textContent = data.vehicleMakeModel;
        document.getElementById("lblVehicleReg").textContent = data.registrationNumber;
        document.getElementById("lblCapacity").textContent = `${data.seatingCapacity} Passengers`;
        document.getElementById("lblColor").textContent = data.vehicleColor;

       
        if (data.licenseImagePath) {
            document.getElementById("imgLicense").src = data.licenseImagePath;
            document.getElementById("linkLicenseFull").href = data.licenseImagePath;
        }
        if (data.registrationFilePath) {
            document.getElementById("imgRegistration").src = data.registrationFilePath;
            document.getElementById("linkRegFull").href = data.registrationFilePath;
        }

        
        if (data.applicationStatus) {
            document.getElementById("applicationStatusLabel").textContent = data.applicationStatus.toUpperCase();
        }

        
        showToast("Application profile loaded successfully.", "success");

    } catch (err) {
        console.error("Error loading application profile:", err);
        showPopup("Could not retrieve the driver's application details. Please try again or check your connection.", "error");
    }
}


async function updateApplicationStatus(decision) {
    const urlParams = new URLSearchParams(window.location.search);
    let studentId = urlParams.get('id');

    if (/^DRV-\d+$/i.test(studentId)) {
        studentId = studentId.replace(/^DRV-/i, '');
    }

    if (!/^\d+$/.test(studentId)) {
        showPopup("Invalid driver ID format. Cannot process this action.", "error");
        return;
    }

    
    const isApproval = decision.toLowerCase().includes("approv");
    const confirmOptions = isApproval
        ? { type: "success", confirmText: "Approve Driver", cancelText: "Go Back" }
        : { type: "error", confirmText: "Reject Application", cancelText: "Go Back" };

    const confirmMessage = isApproval
        ? "You are about to <strong>approve</strong> this driver. They will gain access to the platform. Continue?"
        : "You are about to <strong>reject</strong> this application. The driver will not be verified. Continue?";

    showConfirm(confirmMessage, async () => {
        try {
            const response = await fetch(`/api/admin/drivers/${studentId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: decision })
            });

            if (response.ok) {
                const successMsg = isApproval
                    ? "Driver has been approved and verified successfully!"
                    : "Application has been rejected.";

                showPopup(successMsg, isApproval ? "success" : "info", () => {
                    window.location.href = "verify-drivers.html";
                });
            } else {
                const errorData = await response.json().catch(() => null);
                const msg = errorData?.message || "The server could not process this request.";
                showPopup(msg, "error");
            }
        } catch (err) {
            console.error("Error updating application status:", err);
            showPopup("A network error occurred. Please check your connection and try again.", "error");
        }
    }, confirmOptions);
}
