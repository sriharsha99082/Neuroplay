// ========================================
// NEUROPLAY DASHBOARD
// ========================================

// Backend API URL
const API = "https://neuroplay.onrender.com";
// Get login information
const token = localStorage.getItem("neuroplayToken");

const user = JSON.parse(
    localStorage.getItem("loggedInUser") || "null"
);

// Dashboard elements
const statusBox = document.getElementById("status");
const list = document.getElementById("resultsList");


// ========================================
// AUTHENTICATION HEADERS
// ========================================

function authHeaders() {

    return {
        "Authorization": `Bearer ${token}`
    };

}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(value) {

    if (!value) {
        return "Date unavailable";
    }

    const date = new Date(
        value.replace(" ", "T") +
        (value.includes("Z") ? "" : "Z")
    );

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });

}


// ========================================
// PREVENT HTML INJECTION
// ========================================

function escapeHtml(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];

    });

}


// ========================================
// LOAD DASHBOARD
// ========================================

async function loadDashboard() {

    // Check login
    if (!token || !user) {

        window.location.replace("../login/login.html");

        return;

    }

    // Display username
    document.getElementById("welcomeName").textContent =
        user.username || "Explorer";


    try {

        // Get user's previous test results
        const response = await fetch(`${API}/results`, {

            method: "GET",

            headers: authHeaders()

        });


        const data = await response.json();


        // Check authentication
        if (response.status === 401) {

            localStorage.removeItem("neuroplayToken");

            window.location.replace("../login/login.html");

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.detail || "Could not load test history."
            );

        }


        // Store results
        const results = data.results || [];


        // ========================================
        // DASHBOARD SUMMARY
        // ========================================

        // Total tests completed
        document.getElementById("testCount").textContent =
            results.length;


        // Latest test date
        document.getElementById("latestDate").textContent =

            results.length
                ? formatDate(results[0].created_at)
                : "Not yet";


        // Latest risk status
        document.getElementById("latestRisk").textContent =

            results.length
                ? (results[0].risk_status || "Unavailable")
                : "Not available";


        // Hide loading/error message
        statusBox.hidden = true;


        // ========================================
        // EMPTY TEST HISTORY
        // ========================================

        if (results.length === 0) {

            list.innerHTML = `
                <div class="empty">
                    🌱 No completed tests yet.
                    Your first adventure will appear here!
                </div>
            `;

            return;

        }


        // ========================================
        // DISPLAY PREVIOUS TEST RESULTS
        // ========================================

        list.innerHTML = results.map(item => `

            <article class="result-card">

                <div>

                    <h3>
                        Screening Test #${escapeHtml(item.result_id)}
                    </h3>

                    <p>
                        ${escapeHtml(formatDate(item.created_at))}
                        · Age ${escapeHtml(item.age)}
                        · ${escapeHtml(item.question_count || 0)} activities
                    </p>

                    <p>
                        Accuracy:
                        ${Number(item.accuracy_percent || 0).toFixed(1)}%

                        · Score:
                        ${escapeHtml(item.total_score ?? 0)}
                    </p>

                </div>


                <span class="risk">

                    ${escapeHtml(
                        item.risk_status || "Result unavailable"
                    )}

                </span>


                <button
                    class="view"
                    data-result-id="${escapeHtml(item.result_id)}">

                    View details →

                </button>

            </article>

        `).join("");


        // ========================================
        // VIEW DETAILS BUTTON
        // ========================================

        list.querySelectorAll(".view").forEach(button => {

            button.addEventListener("click", () => {

                const resultId = button.dataset.resultId;

                window.location.href =
                    `../result/result.html?result_id=${encodeURIComponent(resultId)}`;

            });

        });


    } catch (error) {

        statusBox.hidden = false;

        statusBox.textContent = error.message;

        console.error("Dashboard Error:", error);

    }

}


// ========================================
// LOGOUT
// ========================================

document.getElementById("logoutBtn").addEventListener("click", () => {

    // Clear login information
    [
        "neuroplayToken",
        "loggedInUser",
        "neuroplayUser",
        "neuroplayLastTest"
    ].forEach(key => {

        localStorage.removeItem(key);

    });


    // Return to homepage
    window.location.replace("../index.html");

});


// ========================================
// START DASHBOARD
// ========================================

loadDashboard();
