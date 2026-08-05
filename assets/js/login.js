document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {

            localStorage.setItem('userEmail', email.trim());
            const role = data.role.toLowerCase();
            if (role === 'admin') {
                window.location.href = '/admin/dashboard.html';
            } else if (role === 'coordinator') {
                window.location.href = '/coordinator/dashboard.html';
            } else if (role === 'shuttle_driver') {
                window.location.href = `/driver/dashboard.html?email=${encodeURIComponent(email.trim())}`;
            } else {
                showToast("Role path not found.", "error");
            }
        } else {
            showToast(data.message || "Invalid email or password.", "error");
        }
    } catch (error) {
        showLoginErrorPopup("between email and password combo took a wrong turn — try again!");
        console.error("Error:", error);
    }
});

function showLoginErrorPopup(message) {
    const existing = document.getElementById("loginErrorModal");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "loginErrorModal";
    backdrop.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999;
    `;

    backdrop.innerHTML = `
        <div style="background:#fff; padding:28px; border-radius:12px; width:100%; max-width:340px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <div style="width:48px; height:48px; margin:0 auto 16px; border-radius:50%; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            </div>
            <h3 style="margin:0 0 8px 0; color:#1e293b; font-size:17px; font-weight:700;">Login Failed</h3>
            <p style="color:#64748b; font-size:14px; margin:0 0 20px 0;">${message}</p>
            <button id="loginErrorOkBtn" style="width:100%; padding:11px; border-radius:8px; border:none; background:#f97316; color:#fff; font-weight:600; font-size:14px; cursor:pointer;">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector("#loginErrorOkBtn").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) close();
    });
    //the assumption is the password has been sent to the actual email
}