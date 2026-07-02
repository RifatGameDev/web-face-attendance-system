const video = document.getElementById("video");
const fullNameInput = document.getElementById("fullName");

const startAutoRegisterBtn = document.getElementById("startAutoRegisterBtn");
const resetBtn = document.getElementById("resetBtn");

const instructionTitle = document.getElementById("instructionTitle");
const instructionText = document.getElementById("instructionText");
const poseBadge = document.getElementById("poseBadge");
const poseDebug = document.getElementById("poseDebug");

const progressBar = document.getElementById("progressBar");
const cameraStatus = document.getElementById("cameraStatus");

const previewElements = {
    front: document.getElementById("frontPreview"),
    left: document.getElementById("leftPreview"),
    right: document.getElementById("rightPreview"),
    up: document.getElementById("upPreview"),
    down: document.getElementById("downPreview")
};

const statusElements = {
    front: document.getElementById("frontStatus"),
    left: document.getElementById("leftStatus"),
    right: document.getElementById("rightStatus"),
    up: document.getElementById("upStatus"),
    down: document.getElementById("downStatus")
};

const poseSteps = [
    {
        pose: "front",
        title: "Front Face",
        instruction: "Look straight at the camera.",
        waitingText: "Please show your front face."
    },
    {
        pose: "left",
        title: "Left Face",
        instruction: "Turn your face slightly left.",
        waitingText: "Please turn your face slightly left."
    },
    {
        pose: "right",
        title: "Right Face",
        instruction: "Turn your face slightly right.",
        waitingText: "Please turn your face slightly right."
    },
    {
        pose: "up",
        title: "Up Face",
        instruction: "Look slightly up.",
        waitingText: "Please look slightly up."
    },
    {
        pose: "down",
        title: "Down Face",
        instruction: "Look slightly down.",
        waitingText: "Please look slightly down."
    }
];

let capturedImages = {
    front: null,
    left: null,
    right: null,
    up: null,
    down: null
};

let capturedVectors = {
    front: null,
    left: null,
    right: null,
    up: null,
    down: null
};

let isRunning = false;
let sessionId = 0;
let completedCount = 0;

prepareSvgProgress(progressBar);
resetProgress(progressBar);

async function startAutoRegistration() {
    const fullName = fullNameInput.value.trim();

    if (!fullName) {
        alert("Please enter your full name before starting registration.");
        return;
    }

    sessionId += 1;
    const currentSessionId = sessionId;

    isRunning = true;
    completedCount = 0;

    document.body.classList.remove("capture-completed");

    startAutoRegisterBtn.disabled = true;
    resetBtn.disabled = false;
    fullNameInput.disabled = true;

    resetOnlyCapturedData();
    resetProgress(progressBar);
    updateProgress(progressBar, 0);

    try {
        instructionTitle.textContent = "Loading face model";
        instructionText.textContent = "Please wait. Browser is loading the face recognition model.";
        poseBadge.textContent = "Loading";
        poseDebug.textContent = "Loading model files...";

        await loadFaceModels((message) => {
            instructionText.textContent = message;
        });

        if (!isSessionActive(currentSessionId)) return;

        instructionTitle.textContent = "Starting camera";
        instructionText.textContent = "Please allow camera permission when the browser asks.";
        poseBadge.textContent = "Camera";
        poseDebug.textContent = "Opening camera...";

        await startCamera(video, cameraStatus);

        if (!isSessionActive(currentSessionId)) return;

        instructionTitle.textContent = "Registration started";
        instructionText.textContent = "Follow the face direction instructions.";
        poseBadge.textContent = "Started";
        poseDebug.textContent = "Face scan will start now.";

        await sleep(700);

        for (const step of poseSteps) {
            if (!isSessionActive(currentSessionId)) return;

            await waitForPoseAndCapture(step, currentSessionId);
            completedCount += 1;

            updateProgress(progressBar, completedCount * 20);

            await sleep(700);
        }

        if (!isSessionActive(currentSessionId)) return;

        finishRegistrationCapture();
    } catch (error) {
        console.error(error);

        instructionTitle.textContent = "Registration failed";
        instructionText.textContent = error.message || "Could not complete registration.";
        poseBadge.textContent = "Failed";
        poseDebug.textContent = "Please reset and try again.";

        startAutoRegisterBtn.disabled = false;
        resetBtn.disabled = false;
        fullNameInput.disabled = false;

        isRunning = false;
    }
}

async function waitForPoseAndCapture(step, currentSessionId) {
    let stableStartTime = null;
    let lastGoodAnalysis = null;

    instructionTitle.textContent = step.title;
    instructionText.textContent = step.instruction;
    poseBadge.textContent = step.pose.toUpperCase();
    poseDebug.textContent = step.waitingText;

    while (isSessionActive(currentSessionId)) {
        const analysis = await analyzeFaceFromVideo(video);

        if (!analysis.found) {
            stableStartTime = null;
            lastGoodAnalysis = null;
            poseDebug.textContent = "No face detected. Keep your face inside the guide.";
            await sleep(window.APP_CONFIG.AUTO_CAPTURE_CHECK_INTERVAL_MS);
            continue;
        }

        const detectedPose = analysis.pose;
        const isTargetPose = detectedPose === step.pose;

        poseDebug.textContent =
            `Detected: ${detectedPose.toUpperCase()} | Required: ${step.pose.toUpperCase()} | ` +
            `Score: ${analysis.detectionScore.toFixed(2)} | ` +
            `Yaw: ${analysis.yawRatio.toFixed(2)} | Pitch: ${analysis.pitchRatio.toFixed(2)}`;

        if (isTargetPose) {
            if (!stableStartTime) {
                stableStartTime = performance.now();
            }

            lastGoodAnalysis = analysis;

            const stableElapsed = performance.now() - stableStartTime;
            const requiredStableMs = window.APP_CONFIG.AUTO_CAPTURE_STABLE_MS;

            poseBadge.textContent =
                `${step.pose.toUpperCase()} ${Math.min(100, Math.round((stableElapsed / requiredStableMs) * 100))}%`;

            if (stableElapsed >= requiredStableMs) {
                await captureCurrentPose(step, lastGoodAnalysis);
                return;
            }
        } else {
            stableStartTime = null;
            lastGoodAnalysis = null;
            poseBadge.textContent = step.pose.toUpperCase();
        }

        await sleep(window.APP_CONFIG.AUTO_CAPTURE_CHECK_INTERVAL_MS);
    }
}

async function captureCurrentPose(step, analysis) {
    const imageDataUrl = captureImageFromVideo(video);

    capturedImages[step.pose] = imageDataUrl;
    capturedVectors[step.pose] = analysis.vector;

    const previewElement = previewElements[step.pose];
    const statusElement = statusElements[step.pose];

    setPreviewImage(previewElement, imageDataUrl);

    statusElement.textContent =
        `Captured | Vector: ${analysis.vectorLength} | Score: ${analysis.detectionScore.toFixed(2)}`;

    statusElement.classList.add("done");

    instructionTitle.textContent = `${step.title} captured`;
    instructionText.textContent = "Good. Moving to the next face position.";
    poseBadge.textContent = "Captured";
    poseDebug.textContent =
        `${step.pose.toUpperCase()} saved successfully. Progress: ${(completedCount + 1) * 20}%`;

    console.log(`${step.pose} image:`, imageDataUrl);
    console.log(`${step.pose} vector:`, analysis.vector);
}

async function finishRegistrationCapture() {
    isRunning = false;

    document.body.classList.add("capture-completed");

    const registrationPayload = {
        full_name: fullNameInput.value.trim(),
        vectors: [
            { pose: "front", vector: capturedVectors.front },
            { pose: "left", vector: capturedVectors.left },
            { pose: "right", vector: capturedVectors.right },
            { pose: "up", vector: capturedVectors.up },
            { pose: "down", vector: capturedVectors.down }
        ]
    };

    const isPayloadValid =
        registrationPayload.full_name &&
        registrationPayload.vectors.every(
            (item) => Array.isArray(item.vector) && item.vector.length === 128
        );

    if (!isPayloadValid) {
        instructionTitle.textContent = "Registration data incomplete";
        instructionText.textContent = "Some face vectors are missing. Please reset and try again.";
        poseBadge.textContent = "Failed";
        poseDebug.textContent = "Registration was not saved.";
        return;
    }

    try {
        instructionTitle.textContent = "Saving registration";
        instructionText.textContent = "Face vectors are being saved to the backend database.";
        poseBadge.textContent = "Saving";
        poseDebug.textContent = "Sending 5 face vectors to FastAPI backend...";

        const backendResult = await registerFaceToBackend(registrationPayload);

        instructionTitle.textContent = "Registration completed";
        instructionText.textContent = `${backendResult.user.full_name} has been registered in Supabase with ${backendResult.stored_vectors} face vectors.`;
        poseBadge.textContent = "Saved";
        poseDebug.textContent = "Backend registration saved successfully.";

        console.log("Backend saved user:", backendResult);
    } catch (error) {
        console.error("Backend registration error:", error);

        instructionTitle.textContent = "Backend save failed";
        instructionText.textContent = error.message || "Could not save registration to backend.";
        poseBadge.textContent = "Error";
        poseDebug.textContent = "Please check backend server, ngrok URL, Supabase database, and CORS.";

        startAutoRegisterBtn.disabled = false;
        resetBtn.disabled = false;
        fullNameInput.disabled = false;
        return;
    }

    updateProgress(progressBar, 100);

    stopCamera(video);
    updateCameraStatus(cameraStatus, "All captures completed. Camera stopped.");

    startAutoRegisterBtn.disabled = false;
    resetBtn.disabled = false;
    fullNameInput.disabled = false;
}

function resetRegistrationCapture() {
    sessionId += 1;
    isRunning = false;
    completedCount = 0;

    document.body.classList.remove("capture-completed");

    resetOnlyCapturedData();

    resetProgress(progressBar);
    updateProgress(progressBar, 0);

    instructionTitle.textContent = "Ready to register";
    instructionText.textContent = "Enter your full name and click Start Auto Registration.";
    poseBadge.textContent = "Waiting";
    poseDebug.textContent = "Pose status will appear here.";

    updateCameraStatus(cameraStatus, "Camera is not started");

    startAutoRegisterBtn.disabled = false;
    resetBtn.disabled = true;
    fullNameInput.disabled = false;

    stopCamera(video);
}

function resetOnlyCapturedData() {
    capturedImages = {
        front: null,
        left: null,
        right: null,
        up: null,
        down: null
    };

    capturedVectors = {
        front: null,
        left: null,
        right: null,
        up: null,
        down: null
    };

    for (const pose of Object.keys(previewElements)) {
        previewElements[pose].removeAttribute("src");

        statusElements[pose].textContent = "Not captured";
        statusElements[pose].classList.remove("done");
    }
}

function isSessionActive(currentSessionId) {
    return isRunning && currentSessionId === sessionId;
}

startAutoRegisterBtn.addEventListener("click", startAutoRegistration);
resetBtn.addEventListener("click", resetRegistrationCapture);

window.addEventListener("beforeunload", () => {
    stopCamera(video);
});