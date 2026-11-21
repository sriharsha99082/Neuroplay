const $ = (id) => document.getElementById(id);

const introScreen = $("introScreen");
const testScreen = $("testScreen");

let bank = null;
let questions = [];
let currentIndex = 0;
let selectedOption = null;

let sessionStartedAt = 0;
let questionStartedAt = 0;

let totalClicks = 0;
let totalHits = 0;
let totalScore = 0;
let totalAttempts = 0;

let currentQuestionClicks = 0;
let currentQuestionAttempts = 0;

let questionRecords = [];

let activeQuestion = null;
let activeVersion = null;
let activeCorrectAnswer = null;

let memoryTimer = null;
let fastNamingClicks = 0;
// INDIVIDUAL QUESTION TIMER

let questionTimerInterval = null;
let questionTimeLimitSeconds = 30;
let questionTimeRemaining = 30;

let student = null;
let ageKey = null;


const gameIcons = {
    "Dragon Sound Hunt": "🐉",
    "Letter Detective": "🔎",
    "Alien Language": "👽",
    "Memory Monster": "👾",
    "Sound DJ": "🎧",
    "Word Puzzle": "🧩",
    "Rocket Fuel": "🚀",
    "Magic Word": "✨",
    "Ghost Word": "👻",
    "Pattern Matching": "🧩",
    "Secret Code": "🔐",
    "Buzz or No Buzz": "🐝",
    "Color Trap": "🎨",
    "Find the Missing Bunny": "🐰",
    "Echo Challenge": "🔊",
    "Story Sprite": "📖",
    "Syllable Safari": "🦁",
    "Rhyme Time": "🎵",
    "Sound Builder": "🛠️",
    "Sound Splitter": "✂️",
    "Sound Switch": "🔄",
    "Mirror Words": "🪞",
    "Sentence Sleuth": "🕵️",
    "Word Meaning Match": "💡",
    "Fast Naming": "⚡",
    "Sound Pair Lab": "🎼",
    "Word Builder Lab": "🧱",
    "Order Orbit": "🪐",
    "Word Switchback": "🧭",
    "Focus Finder": "🎯",
    "Mini Passage Mission": "📚",
    "Symbol Sequence Sprint": "🌟"
};


const symbolIcons = {
    cat: "🐱",
    blue_circle: "🔵",
    star: "⭐",
    apple: "🍎",
    triangle: "🔺",
    moon: "🌙",
    key: "🔑",
    leaf: "🍃",
    bell: "🔔",
    heart: "❤️",
    circle: "⚪",
    diamond: "💎",
    green_circle: "🟢",
    red_circle: "🔴",
    rabbit: "🐰",
    bear: "🐻",
    dog: "🐶",
    mouse: "🐭",
    fox: "🦊",
    frog: "🐸",
    coin: "🪙",
    sun: "☀️",
    book: "📘",
    plane: "✈️",
    rocket: "🚀",
    tree: "🌳"
};


const colorMap = {
    red: "#e55353",
    blue: "#287bd1",
    green: "#269c69",
    yellow: "#e2ae25",
    purple: "#9164c7",
    orange: "#e98b35"
};


// GET STUDENT DETAILS

function getStudent() {

    try {
        const active = JSON.parse(
            localStorage.getItem("loggedInUser") || "null"
        );

        if (active && typeof active === "object") {
            return active;
        }

    } catch (e) {}

    try {
        return JSON.parse(
            localStorage.getItem("neuroplayUser") || "null"
        );

    } catch (e) {
        return null;
    }
}


// AGE GROUP

function ageBand(age) {

    if (age >= 7 && age <= 8) return "7-8";

    if (age >= 9 && age <= 12) return "9-12";

    if (age >= 13 && age <= 17) return "13-17";

    return null;
}


// HTML SAFETY

function escapeHtml(value) {

    return String(value).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

}


// AUDIO FUNCTIONS

function speak(text, rate = 0.82) {

    if (!("speechSynthesis" in window)) {

        $("taskFeedback").textContent =
            "Audio playback is not supported in this browser.";

        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
        String(text)
    );

    utterance.rate = rate;
    utterance.pitch = 1.02;

    window.speechSynthesis.speak(utterance);
}


function phonemeSpeech(value) {

    const clean = String(value || "")
        .replaceAll("/", "")
        .trim()
        .toLowerCase();

    const sounds = {
        m: "mmm",
        sh: "shhh",
        f: "fff",
        b: "buh",
        n: "nnn",
        s: "sss",
        k: "kuh",
        p: "puh",
        t: "tuh",
        g: "guh",
        ch: "ch",
        th: "th"
    };

    return sounds[clean] || clean;
}


// BIRD CHIRPING SOUND

function playBirdWord() {
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance("BIRD");
    speech.lang = "en-IN";
    speech.rate = 0.8;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}

// PLAY QUESTION AUDIO

function playQuestionAudio() {

    if (!activeVersion) return;

    const s = activeVersion.stimulus || {};

    // Bird sound for Question 22 (ages 7–8)
    if (activeQuestion.id === 22 && ageKey === "7-8") {
    playBirdWord();
    return;
}

    if (s.audio_phoneme) {
        speak(phonemeSpeech(s.audio_phoneme));
    }

    else if (s.audio_sequence) {
        speak(s.audio_sequence.join(", "), 0.72);
    }

    else if (s.audio_word) {
        speak(s.audio_word);
    }

    else if (s.audio_story) {
        speak(s.audio_story, 0.9);
    }

    else if (s.sounds) {
        speak(s.sounds.join(" ... "), 0.72);
    }
}


// CHECK WHETHER QUESTION NEEDS AUDIO

function hasAudio(s) {

    return [
        "audio_phoneme",
        "audio_sequence",
        "audio_word",
        "audio_story",
        "sounds"
    ].some(key => Boolean(s && s[key]));
}


// SHUFFLE ARRAY

function shuffleArray(array) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}


// CREATE DISPLAY CHIP

function chip(value, extra = "") {

    const key = String(value).toLowerCase();

    const visual = symbolIcons[key];

    return `
        <span class="stimulus-chip ${extra}">
            ${visual ? visual + " " : ""}
            ${escapeHtml(value)}
        </span>
    `;
}


// DISPLAY SEQUENCE

function sequenceBlock(title, arr, hide = false) {

    const content = hide
        ? `<div id="memorySequence" class="chip-row">
            ${arr.map(x => chip(x, "large")).join("")}
           </div>`
        : `<div class="chip-row">
            ${arr.map(x => chip(x, "large")).join("")}
           </div>`;

    return `
        <div class="sequence-block">
            <div class="sequence-title">
                ${escapeHtml(title)}
            </div>
            ${content}
        </div>
    `;
}


// DISPLAY QUESTION STIMULUS

function renderStimulus(s, qid) {

    const area = $("stimulusArea");

    let out = "";
    // QUESTION 10: PATTERN MATCHING

if (qid === 10 && s.target) {

    out += `
        <div class="sequence-block">
            <div class="sequence-title">
                MATCH THIS PATTERN
            </div>

            <div class="stimulus-chip large">
                ${escapeHtml(s.target)}
            </div>
        </div>
    `;
}

    if (s.sequence) {

        if (s.target) {
            out += `
                <div class="stimulus-text">
                    Target: <b>${escapeHtml(s.target)}</b>
                </div>
            `;
        }

        out += sequenceBlock(
            "LOOK AT THE SEQUENCE",
            s.sequence
        );
    }


    if (s.items) {

        out += sequenceBlock(
            "REMEMBER THESE",
            s.items,
            qid === 4 || qid === 32
        );

        if (qid === 4 || qid === 32) {

            out += `
                <p id="memoryHint" class="stimulus-text">
                    Remember the order. The symbols will hide shortly.
                </p>
            `;
        }
    }


    if (s.words) {
        out += sequenceBlock("WORD COLLECTION", s.words);
    }

    if (s.letters) {
        out += sequenceBlock("MIX THE LETTERS", s.letters);
    }

    if (s.sounds) {
        out += sequenceBlock("SOUND CLUES", s.sounds);
    }


    // IMPORTANT:
    // Do not display the Echo Challenge audio sequence.
    // The student must listen and remember it.

    if (s.audio_sequence && qid !== 15) {

        out += sequenceBlock(
            "LISTEN TO THIS ORDER",
            s.audio_sequence
        );
    }


    if (s.grid) {

        out += sequenceBlock(
            "SCAN FROM LEFT TO RIGHT",
            s.grid.map(
                x => symbolIcons[String(x).toLowerCase()] || x
            )
        );
    }


    if (s.before && s.after) {

        out += sequenceBlock("BEFORE", s.before);

        out += `
            <div class="stimulus-text">
                ⬇️ One item disappeared ⬇️
            </div>
        `;

        out += sequenceBlock("AFTER", s.after);
    }


    if (s.mapping) {

        const pairs = Object.entries(s.mapping)
            .map(([k, v]) => `
                <span class="stimulus-chip">
                    ${escapeHtml(k)} =
                    ${symbolIcons[v] || escapeHtml(v)}
                </span>
            `).join("");

        out += `
            <div class="sequence-title">SECRET KEY</div>
            <div class="chip-row">${pairs}</div>
            <div class="stimulus-text" style="margin-top:15px">
                CODE:
                ${s.code.map(
                    x => symbolIcons[x] || escapeHtml(x)
                ).join("　")}
            </div>
        `;
    }


    if (s.word_pattern) {

        out += `
            <div class="stimulus-chip large">
                ${escapeHtml(s.word_pattern)}
            </div>

            ${s.hint
                ? `<p class="stimulus-text">
                    💡 ${escapeHtml(s.hint)}
                   </p>`
                : ""}
        `;
    }


    if (s.from_word && s.to_word) {

        out += `
            <div class="chip-row">
                ${chip(s.from_word, "large")}
                <span class="stimulus-text">➡️</span>
                ${chip(s.to_word, "large")}
            </div>
        `;
    }


    // Do not show BIRD word for the youngest age group.
    if (
        s.target_word &&
        !(qid === 22 && ageKey === "7-8")
    ) {

        out += `
            <div class="stimulus-chip large">
                ${escapeHtml(s.target_word)}
            </div>
        `;
    }


    // BIRD IMAGE FOR QUESTION 22

    if (qid === 22 && ageKey === "7-8") {

        out += `
            <div class="bird-picture" role="img" aria-label="Bird">
                🐦
            </div>

            <p class="stimulus-text">
                Find the correct spelling.
            </p>
        `;
    }


    if (s.target_sound) {

        out += `
            <div class="stimulus-text">
                Target sound:
                <b>${escapeHtml(s.target_sound)}</b>
            </div>
        `;
    }


    if (s.audio_phoneme) {

        out += `
            <div class="stimulus-chip large">
                ${escapeHtml(s.audio_phoneme)}
            </div>
        `;
    }


    if (s.audio_word) {

        out += `
            <div class="stimulus-chip large">
                ${escapeHtml(s.audio_word)}
            </div>
        `;
    }


    if (s.word) {

        out += `
            <div class="stimulus-chip large">
                ${escapeHtml(s.word)}
            </div>
        `;
    }


    if (s.clue) {

        out += `
            <div class="stimulus-text">
                💡 ${escapeHtml(s.clue)}
            </div>
        `;
    }


    if (s.sentence) {

        out += `
            <div class="stimulus-text">
                “${escapeHtml(s.sentence)}”
            </div>
        `;
    }


    if (s.passage) {

        out += `
            <div class="stimulus-text">
                ${escapeHtml(s.passage)}
            </div>
        `;
    }


    if (s.audio_story) {

        out += `
            <div class="stimulus-text">
                📖 Listen to the short story, then answer below.
            </div>
        `;
    }


    if (s.question) {

        out += `
            <div class="stimulus-text">
                <b>${escapeHtml(s.question)}</b>
            </div>
        `;
    }


    if (s.ink_color) {

        out += `
            <div class="stimulus-chip color-word"
                style="color:${colorMap[s.ink_color] || "#287db5"}">
                ${escapeHtml(s.word)}
            </div>

            <p class="stimulus-text">
                Choose the INK color.
            </p>
        `;
    }


    if (s.word && s.remove_sound) {

        out += `
            <div class="stimulus-text">
                Remove <b>${escapeHtml(s.remove_sound)}</b>
                from <b>${escapeHtml(s.word)}</b>.
            </div>
        `;
    }


    if (s.base && s.ending) {

        out += `
            <div class="chip-row">
                ${chip(s.base, "large")}
                <span class="stimulus-text">+</span>
                ${chip(s.ending, "large")}
            </div>
        `;
    }


    if (s.target && s.grid) {

        out += `
            <div class="stimulus-text">
                Find: <b>${escapeHtml(s.target)}</b>
            </div>
        `;
    }


    if (s.display_seconds) {

        out += `
            <p class="stimulus-text">
                Memorise for ${s.display_seconds} seconds.
            </p>
        `;
    }


    if (!out) {

        out = `
            <div class="stimulus-text">
                ✨ Look carefully and choose your answer.
            </div>
        `;
    }


    area.innerHTML = out;


    // MEMORY QUESTIONS

    if (
        (qid === 4 || qid === 32) &&
        s.display_seconds
    ) {

        clearTimeout(memoryTimer);

        memoryTimer = setTimeout(() => {

            const seq = $("memorySequence");

            if (seq) {

                seq.innerHTML = `
                    <span class="stimulus-chip large">❔</span>
                    <span class="stimulus-chip large">❔</span>
                    <span class="stimulus-chip large">❔</span>
                    <span class="stimulus-chip large">❔</span>
                `;
            }

            const hint = $("memoryHint");

            if (hint) {
                hint.textContent =
                    "Time is up! Choose the order you remember.";
            }

        }, s.display_seconds * 1000);
    }
}


// RENDER ANSWER OPTIONS

function renderOptions(version) {

    const area = $("optionsArea");

    area.innerHTML = "";

    activeCorrectAnswer = version.correct_answer;


    // FAST NAMING TASK

    if (version.correct_answer === "performance_metrics") {

        const grid = version.stimulus.grid || [];

        area.innerHTML = `
            <p class="stimulus-text">
                Tap each item in the displayed order as quickly
                and accurately as you can.
            </p>

            <div class="chip-row" id="namingGrid">
                ${grid.map((x, i) => `
                    <button
                        class="option-button naming-item"
                        data-index="${i}"
                        type="button">
                        ${escapeHtml(x)}
                    </button>
                `).join("")}
            </div>

            <p id="namingProgress" class="task-feedback">
                0 of ${grid.length} items tapped
            </p>
        `;

        fastNamingClicks = 0;

        area.querySelectorAll(".naming-item").forEach(btn => {

            btn.addEventListener("click", () => {

                if (btn.disabled) return;

                btn.disabled = true;
                btn.classList.add("selected");

                fastNamingClicks++;

                totalClicks++;
                currentQuestionClicks++;

                currentQuestionAttempts++;
                totalAttempts++;

                $("namingProgress").textContent =
                    `${fastNamingClicks} of ${grid.length} items tapped`;

                if (fastNamingClicks === grid.length) {

                    $("taskFeedback").textContent =
                        "Great effort! Activity recorded.";

                    completeCurrent(null, true);
                }

            });

        });

        return;
    }


    // WORD RACE TASK

    if (version.correct_answer === "per_item") {

        const items = version.stimulus.items || [];
        const yesNo = version.options;

        area.innerHTML = `
            <div id="raceItem" class="stimulus-chip large">
                ${escapeHtml(items[0] || "")}
            </div>

            <p class="stimulus-text">
                Is this a real word?
            </p>

            <div class="options-grid">
                ${yesNo.map(o => `
                    <button
                        class="option-button race-option"
                        data-id="${o.id}"
                        type="button">

                        <span class="option-letter">${o.id}</span>

                        ${escapeHtml(o.text)}
                    </button>
                `).join("")}
            </div>

            <p id="raceProgress" class="task-feedback">
                Item 1 of ${items.length}
            </p>
        `;

        let itemIndex = 0;

        area.querySelectorAll(".race-option").forEach(btn => {

            btn.addEventListener("click", () => {

                totalClicks++;
                totalAttempts++;

                currentQuestionClicks++;
                currentQuestionAttempts++;

                itemIndex++;

                if (itemIndex < items.length) {

                    $("raceItem").textContent = items[itemIndex];

                    $("raceProgress").textContent =
                        `Item ${itemIndex + 1} of ${items.length}`;

                } else {

                    $("raceItem").textContent = "🏁";

                    $("raceProgress").textContent =
                        "All items classified.";

                    $("taskFeedback").textContent =
                        "Activity completed. This task has no item-by-item answer key.";

                    completeCurrent(null, true);
                }

            });

        });

        return;
    }


    // ECHO CHALLENGE:
    // Shuffle answer options every time the question appears.
    // Keep track of the correct option after shuffling.

    let options = [...(version.options || [])];

    if (activeQuestion && activeQuestion.id === 15) {

        options = shuffleArray(options);

        const correctOption = options.find(
            option => option.text.replaceAll(" ", "").toLowerCase() ===
                version.stimulus.audio_sequence
                    .join("-")
                    .replaceAll(" ", "")
                    .toLowerCase()
        );

        if (correctOption) {
            activeCorrectAnswer = correctOption.id;
        }
    }


    // NORMAL OPTIONS

    options.forEach(option => {

        const btn = document.createElement("button");

        btn.className = "option-button";
        btn.type = "button";

        btn.innerHTML = `
            <span class="option-letter">
                ${escapeHtml(option.id)}
            </span>

            <span>
                ${escapeHtml(option.text)}
            </span>
        `;

        btn.addEventListener("click", () => {

            totalClicks++;
            totalAttempts++;

            currentQuestionClicks++;
            currentQuestionAttempts++;

            selectedOption = option.id;

            area.querySelectorAll(".option-button").forEach(b => {
                b.classList.remove("selected");
            });

            btn.classList.add("selected");

            $("taskFeedback").textContent =
                "Answer selected. Press Next activity to continue.";

            $("nextButton").disabled = false;

        });

        area.appendChild(btn);

    });

}


// UPDATE PROGRESS

function updateProgress() {

    const n = questions.length;
    const done = currentIndex;

    $("questionCounter").textContent =
        `Activity ${Math.min(done + 1, n)} of ${n}`;

    $("progressPercent").textContent =
        `${Math.round(done / n * 100)}% complete`;

    $("progressFill").style.width =
        `${done / n * 100}%`;
}
// FORMAT TIMER

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}


// STOP QUESTION TIMER

function stopQuestionTimer() {
    if (questionTimerInterval) {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
    }
}


// START QUESTION TIMER

function startQuestionTimer() {

    stopQuestionTimer();

    const configuredTime =
        activeVersion.time_limit_seconds ??
        activeQuestion.time_limit_seconds ??
        30;

    questionTimeLimitSeconds =
        Math.max(1, Number(configuredTime) || 30);

    questionTimeRemaining = questionTimeLimitSeconds;

    const timerElement = $("questionTimer");

    const timerBox = timerElement.parentElement;

    timerBox.classList.remove("timer-warning");

    timerElement.textContent =
        formatTime(questionTimeRemaining);

    questionTimerInterval = setInterval(() => {

        questionTimeRemaining--;

        timerElement.textContent =
            formatTime(questionTimeRemaining);

        if (questionTimeRemaining <= 10) {
            timerBox.classList.add("timer-warning");
        }

        if (questionTimeRemaining <= 0) {

            stopQuestionTimer();

            $("taskFeedback").textContent =
                "Time is up! Moving to the next activity.";

            completeCurrent(null, true, true);

            setTimeout(() => {
                advanceToNextQuestion();
            }, 1000);
        }

    }, 1000);
}

// SHOW QUESTION

function showQuestion() {

    selectedOption = null;

    clearTimeout(memoryTimer);

    activeQuestion = questions[currentIndex];

    activeVersion =
        activeQuestion.difficulty_by_age[ageKey];

    activeCorrectAnswer = activeVersion.correct_answer;

    questionStartedAt = performance.now();
    startQuestionTimer();
    currentQuestionClicks = 0;
    currentQuestionAttempts = 0;

    $("gameIcon").textContent =
        gameIcons[activeQuestion.game] || "✨";

    $("gameTitle").textContent =
        activeQuestion.game;

    $("skillLabel").textContent =
        activeQuestion.skill
            .replaceAll("_", " ")
            .toUpperCase();


    $("questionPrompt").textContent =
        activeVersion.prompt;


    // Q15: make the listening instruction clear.

    if (activeQuestion.id === 15) {

        $("questionPrompt").textContent =
            "Listen carefully to the sounds. Then choose the correct sequence.";
    }


    $("taskFeedback").textContent = "";

    $("nextButton").disabled = true;

    $("nextButton").textContent =
        currentIndex === questions.length - 1
            ? "See results ✓"
            : "Next activity →";


    $("clickHint").textContent =
        "Choose the best answer.";


    renderStimulus(
        activeVersion.stimulus || {},
        activeQuestion.id
    );

    renderOptions(activeVersion);


    const birdQuestion =
        activeQuestion.id === 22 && ageKey === "7-8";

    const needsAudio =
        birdQuestion || hasAudio(activeVersion.stimulus);

    $("soundButton").style.display =
        needsAudio ? "inline-flex" : "none";


    updateProgress();
}


// COMPLETE QUESTION

function completeCurrent(answer, unscored = false, timedOut = false) {

    // Prevent the same question from being recorded twice
    if (
        questionRecords.some(
            r => r.id === activeQuestion.id
        )
    ) {
        return;
    }

    stopQuestionTimer();

    const elapsed = Math.round(
        performance.now() - questionStartedAt
    );

    // Every question must be scored.
    // An unanswered or timed-out question counts as incorrect.
    const correct =
        answer !== null &&
        answer !== undefined &&
        answer === activeCorrectAnswer;

    if (correct) {
        totalHits++;
        totalScore += 10;
    }

    questionRecords.push({

        id: activeQuestion.id,

        game: activeQuestion.game,

        clicks: currentQuestionClicks,

        hit: correct ? 1 : 0,

        score: correct ? 10 : 0,

        attempts: currentQuestionAttempts,

        completion_time_ms: elapsed,

        timed_out: timedOut,

        accuracy: correct ? 1 : 0

    });

    console.log(
        "Question completed:",
        activeQuestion.id,
        "Correct:",
        correct
    );

    $("nextButton").disabled = false;
}

// NEXT QUESTION

// MOVE TO NEXT QUESTION

function advanceToNextQuestion() {

    currentIndex++;

    if (currentIndex >= questions.length) {
        showResults();
    } else {
        showQuestion();
    }
}


// NEXT QUESTION BUTTON

function goNext() {

    if (
        activeVersion.correct_answer !== "performance_metrics" &&
        activeVersion.correct_answer !== "per_item" &&
        selectedOption === null
    ) {
        return;
    }

    if (
        !questionRecords.some(
            r => r.id === activeQuestion.id
        )
    ) {

        completeCurrent(
            selectedOption,
            selectedOption === null,
            false
        );
    }

    advanceToNextQuestion();
}

// SAVE RESULTS AND OPEN SEPARATE RESULTS PAGE

// SAVE RESULTS AND OPEN SEPARATE RESULTS PAGE

async function showResults() {

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    stopQuestionTimer();

    // Count all completed questions
    const correctAnswers = questionRecords.filter(
        r => r.hit === 1
    ).length;

    const incorrectAnswers = questionRecords.filter(
        r => r.hit === 0
    ).length;

    const accuracy = questionRecords.length
        ? Math.round(
            (correctAnswers / questionRecords.length) * 100
        )
        : 0;

    console.log("Total questions in game:", questions.length);

    console.log("Recorded questions:", questionRecords.length);

    console.log("Correct answers:", correctAnswers);

    console.log("Incorrect answers:", incorrectAnswers);

    console.log(
        "Total counted answers:",
        correctAnswers + incorrectAnswers
    );

    console.table(questionRecords);

    const summary = {

        username: student.username,

        user_id: student.user_id,

        age: Number(student.age),

        gender: student.gender,

        age_group: ageKey,

        question_count: questions.length,

        score: totalScore,

        hits: correctAnswers,

        misses: incorrectAnswers,

        clicks: totalClicks,

        attempts: totalAttempts,

        accuracy_percent: accuracy,

        completion_time_ms:
            Math.round(performance.now() - sessionStartedAt),

        question_records: questionRecords,

        completed_at: new Date().toISOString(),

        prediction_result: null

    };

    // SEND DATA TO FASTAPI BACKEND

    try {

        $("taskFeedback").textContent =
            "Calculating your results. Please wait...";

        $("nextButton").disabled = true;

        const response = await fetch(

             "https://neuroplay.onrender.com/predict",
        
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    username: student.username,

                    age: Number(student.age),

                    gender: student.gender || null,

                    question_records: questionRecords

                })

            }
        );

        const prediction = await response.json();
        console.log("LATEST BACKEND PREDICTION:", prediction);

console.log(
    "Risk Status:",
    prediction.prediction_result?.risk_status
);

console.log(
    "Risk Probability:",
    prediction.prediction_result?.risk_probability
);
        if (!response.ok) {

            throw new Error(
                prediction.detail ||
                "Backend prediction failed."
            );

        }

        summary.prediction_result = prediction;

        console.log(
            "Random Forest Prediction:",
            prediction
        );

        console.log(
            "SQLite Save Status:",
            prediction.database
        );

    } catch (error) {

        console.error(
            "Backend connection error:",
            error
        );

        summary.prediction_result = {

            success: false,

            message: error.message

        };

    }

    // SAVE RESULTS

    localStorage.setItem(
        "neuroplayLastTest",
        JSON.stringify(summary)
    );

    // OPEN RESULTS PAGE

    window.location.href = "../result/result.html";

}
// INITIALISE TEST

async function initialise() {

    student = getStudent();


    if (!student || !Number(student.age)) {

        $("introError").textContent =
            "Student age was not found. Please sign up and log in again.";

        $("beginButton").disabled = true;

        return;
    }


    ageKey = ageBand(Number(student.age));


    if (!ageKey) {

        $("introError").textContent =
            "This test is designed for ages 7–17.";

        $("beginButton").disabled = true;

        return;
    }


    $("studentLabel").textContent =
        `${student.username || "Explorer"} · Age ${student.age}`;


    try {

        const response = await fetch("questions.json");

        if (!response.ok) {
            throw new Error("Could not load questions.json");
        }


        bank = await response.json();


        const ids = bank.age_group_question_ids[ageKey];


        questions = ids
            .map(id => bank.questions.find(q => q.id === id))
            .filter(Boolean);


        if (
            questions.length !==
            bank.age_group_question_sets[ageKey].length
        ) {
            console.warn(
                "Question set length differs from the age-group list."
            );
        }


        $("introDescription").textContent =
            `Your age group has ${questions.length} activities. Complete each one at your own pace. Listen carefully, look closely and have fun!`;

    } catch (error) {

        $("introError").textContent =
            "Could not load the question bank. Run this page using VS Code Live Server.";

        $("beginButton").disabled = true;

        console.error(error);
    }
}


// BUTTON EVENTS

$("beginButton").addEventListener("click", () => {

    if (!questions.length) return;

    introScreen.classList.add("hidden");

    testScreen.classList.remove("hidden");

    sessionStartedAt = performance.now();

    currentIndex = 0;

    showQuestion();
});


$("soundButton").addEventListener(
    "click",
    playQuestionAudio
);


$("nextButton").addEventListener(
    "click",
    goNext
);


initialise();
