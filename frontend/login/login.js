const loginForm = document.getElementById("loginForm");

const API = "https://neuroplay.onrender.com";

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    if (username === "" || password === "") {
        message.textContent = "Please fill in all fields.";
        return;
    }

    try {

        message.style.color = "blue";
        message.textContent = "Checking your account...";

        const loginData = {
            username: username,
            password: password
        };

        const response = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (!response.ok) {
            message.style.color = "red";
            message.textContent =
                result.detail || "Invalid username or password.";
            return;
        }

        if (!result.access_token) {
            throw new Error("Authentication token was not received.");
        }

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(result.user)
        );

        localStorage.setItem(
            "neuroplayToken",
            result.access_token
        );

        console.log("Login successful!");
        console.log("User:", result.user);
        console.log("Token received:", !!result.access_token);

        message.style.color = "green";
        message.textContent = "Login successful!";

        setTimeout(function () {
            window.location.href = "../game/game.html";
        }, 700);

    } catch (error) {

        console.error("Login error:", error);

        message.style.color = "red";
        message.textContent =
            error.message || "Unable to connect to the server.";

    }

});