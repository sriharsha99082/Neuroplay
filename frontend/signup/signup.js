const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const age = Number(document.getElementById("age").value);
    const gender = document.getElementById("gender").value;
    const message = document.getElementById("message");

    if (username.length < 6) {
        message.textContent = "Username must contain at least 6 characters.";
        return;
    }

    if (password.length < 6) {
        message.textContent = "Password must contain at least 6 characters.";
        return;
    }

    if (age < 7 || age > 17) {
        message.textContent = "Age must be between 7 and 17.";
        return;
    }

    if (!gender) {
        message.textContent = "Please select your gender.";
        return;
    }

    const user = {
        username: username,
        password: password,
        age: age,
        gender: gender
    };

    try {

        message.style.color = "blue";
        message.textContent = "Creating your account...";

        const response = await fetch(

           "https://neuroplay.onrender.com/signup",

            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            }
        );

        const result = await response.json();

        console.log("Signup response:", result);

        if (!response.ok) {
            message.style.color = "red";
            message.textContent =
                result.detail || "Registration failed.";
            return;
        }

        message.style.color = "green";
        message.textContent =
            "Account created successfully! Please login.";

        setTimeout(function () {
    window.location.href = "../login/login.html";
}, 1200);

    } catch (error) {

        console.error("Signup error:", error);

        message.style.color = "red";
        message.textContent =
            "Unable to connect to the server. Please try again.";

    }

});
