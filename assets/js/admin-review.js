document.addEventListener("DOMContentLoaded", () => {
    // 1. Snag the student identifier from the page window URL string context
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');

    if (!studentId) {
        alert("Error: No structural driver target query provided in navigation route parameters.");
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
    const studentId = urlParams.get('id');

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