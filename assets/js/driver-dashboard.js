const API_URL = 'http://localhost:5000/api/driver/bookings';

async function loadDriverDashboard() {
    const tableBody = document.getElementById('bookingsTableBody');

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network failure.');

        const data = await response.json();
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="loading-state">No scheduled bookings found for today.</td></tr>`;
            return;
        }

        data.forEach(booking => {
            const row = document.createElement('tr');

            // Map the colors matching your image labels
            let statusClass = 'status-booked';
            if (booking.status.toLowerCase() === 'boarded') statusClass = 'status-boarded';
            if (booking.status.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

            // Route badges styling mapping matching the UI colors
            let routeClass = 'route-campus';
            if (booking.routeName.toUpperCase().includes('DOWNTOWN')) routeClass = 'route-downtown';
            if (booking.routeName.toUpperCase().includes('MED')) routeClass = 'route-med';

            row.innerHTML = `
                <td>
                    <div class="student-profile">
                        <div class="avatar-placeholder"></div>
                        <span>${booking.studentName}</span>
                    </div>
                </td>
                <td><span class="student-num">${booking.studentNumber}</span></td>
                <td>Shuttle Alpha</td>
                <td><span class="route-tag ${routeClass}">${booking.routeName}</span></td>
                <td><strong>${booking.departureTime}</strong></td>
                <td>Oct 24, 2026</td>
                <td><span class="badge ${statusClass}">${booking.status}</span></td>
                <td class="actions-cell">&#8942;</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching records:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="error-state">Failed to load system bookings data.</td></tr>`;
    }
}

window.onload = loadDriverDashboard;