document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMessage');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // ✅ THE FIX: Save the email the user typed right into browser memory
            localStorage.setItem('userEmail', email.trim());

            // Convert role to lowercase to match your folder names
            const role = data.role.toLowerCase();

            if (role === 'admin') {
                window.location.href = '/admin/dashboard.html';
            } else if (role === 'coordinator') {
                window.location.href = '/coordinator/dashboard.html';
            } else if (role === 'driver') {
                // ⭐ PASS IT DIRECTLY: Append the email as a query parameter in the URL
                window.location.href = `/driver/dashboard.html?email=${encodeURIComponent(email.trim())}`;
            } else {
                errorMsg.textContent = "Role path not found.";
            }
        } else {
            errorMsg.textContent = data.message;
        }
    } catch (error) {
        errorMsg.textContent = "Connection error. Ensure your backend is running.";
        console.error("Error:", error);
    }
});