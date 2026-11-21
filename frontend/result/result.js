// GET TEST RESULTS

const result = JSON.parse(
    localStorage.getItem("neuroplayLastTest")
);

if (!result) {

    alert("No test results found.");

    window.location.href = "../login/login.html";

} else {

    // STUDENT DETAILS

    document.getElementById("username").textContent =
        result.username || "Explorer";

    document.getElementById("age").textContent =
        result.age;


    // TOTAL QUESTIONS

    const totalQuestions = result.question_count || 0;

    document.getElementById("totalQuestions").textContent =
        totalQuestions;


    // QUESTION RECORDS

    const records = result.question_records || [];


    // SEPARATE SCORED AND UNSCORED QUESTIONS

    const scoredQuestions = records.filter(
        question =>
            question.hit === 1 || question.hit === 0
    );

    const unscoredQuestions =
        records.length - scoredQuestions.length;


    // HITS AND MISSES

    const hits = scoredQuestions.filter(
        question => question.hit === 1
    ).length;

    const misses = scoredQuestions.filter(
        question => question.hit === 0
    ).length;


    document.getElementById("hits").textContent =
        hits;

    document.getElementById("misses").textContent =
        misses;


    // ACCURACY

    const accuracy = scoredQuestions.length
        ? Math.round((hits / scoredQuestions.length) * 10000) / 100
        : 0;

    document.getElementById("accuracy").textContent =
        accuracy + "%";


    // MISS RATE

    const missRate = scoredQuestions.length
        ? Math.round((misses / scoredQuestions.length) * 100)
        : 0;

    document.getElementById("missRate").textContent =
        missRate + "%";


    // CLICKS AND SCORE

    document.getElementById("clicks").textContent =
        result.clicks || 0;

    document.getElementById("score").textContent =
        result.score || 0;

    document.getElementById("scoreText").textContent =
        `${hits} correct answers out of ${scoredQuestions.length} scored questions`;

    
    // COMPLETION TIME

    const totalSeconds = Math.floor(
        (result.completion_time_ms || 0) / 1000
    );

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    document.getElementById("completionTime").textContent =
        `${minutes} min ${seconds} sec`;


    // RANDOM FOREST PREDICTION

    const riskLevel = document.getElementById("riskLevel");

    const riskMessage = document.getElementById("riskMessage");

    const weakestBox = document.getElementById("weakest");


    // GET BACKEND RESPONSE

    const backendResponse = result.prediction_result;

    const prediction = backendResponse?.prediction_result;


    if (
        backendResponse?.success === true &&
        prediction
    ) {

        const probability = prediction.risk_probability;

        const percent = probability !== null &&
                        probability !== undefined
            ? Math.round(probability * 100)
            : null;


        // DISPLAY RISK CATEGORY

        const status = prediction.risk_status;

        riskLevel.textContent =
            status +
            (percent !== null ? ` (${percent}%)` : "");


        // APPLY CATEGORY COLOUR

        if (status === "Low Risk") {

            riskLevel.className = "risk-badge low-risk";

            riskMessage.textContent =
                "The screening model identified fewer risk indicators. This does not rule out dyslexia.";

        }

        else if (status === "Moderate Risk") {

            riskLevel.className = "risk-badge moderate-risk";

            riskMessage.textContent =
                "The screening model identified some risk indicators. Consider discussing the results with a qualified professional.";

        }

        else if (status === "High Risk") {

            riskLevel.className = "risk-badge high-risk";

            riskMessage.textContent =
                "The screening model identified more risk indicators. Consider seeking further assessment from a qualified professional.";

        }

        else {

            riskLevel.className = "risk-badge";

            riskMessage.textContent =
                "The risk category could not be determined.";

        }


        // MODEL INFORMATION

        if (weakestBox) {

            weakestBox.textContent =
                "Prediction generated using the " +
                prediction.model_used +
                " Random Forest model.";

        }

    }

    else {

        // PREDICTION UNAVAILABLE

        riskLevel.textContent =
            "ML Prediction Unavailable";

        riskLevel.className = "risk-badge";

        riskMessage.textContent =
            backendResponse?.message ||
            "The test results were saved, but the Random Forest prediction could not be obtained.";

        if (weakestBox) {

            weakestBox.textContent =
                "Please check the backend connection and try again.";

        }

        console.error(
            "Prediction response:",
            backendResponse
        );

    }


    // DEBUG INFORMATION

    console.log("Total Questions:", totalQuestions);

    console.log("Scored Questions:", scoredQuestions.length);

    console.log("Unscored Questions:", unscoredQuestions);

    console.log("Correct Answers:", hits);

    console.log("Incorrect Answers:", misses);

    console.log("Accuracy:", accuracy);

    console.log("Miss Rate:", missRate);

}
function goToDashboard() {
    window.location.href = "../dashboard/dashboard.html";
}