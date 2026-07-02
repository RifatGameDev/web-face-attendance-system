const video = document.getElementById("video");

const cameraSection = document.getElementById("cameraSection");
const verifyScrollableContent = document.getElementById("verifyScrollableContent");

const startVerificationBtn = document.getElementById("startVerificationBtn");
const resetBtn = document.getElementById("resetBtn");

const instructionTitle = document.getElementById("instructionTitle");
const instructionText = document.getElementById("instructionText");
const verifyBadge = document.getElementById("verifyBadge");
const verifyDebug = document.getElementById("verifyDebug");

const progressBar = document.getElementById("progressBar");
const cameraStatus = document.getElementById("cameraStatus");

const verificationResult = document.getElementById("verificationResult");
const verifiedFaceImage = document.getElementById("verifiedFaceImage");
const verifiedUserName = document.getElementById("verifiedUserName");
const verifiedScore = document.getElementById("verifiedScore");
const verifiedPose = document.getElementById("verifiedPose");
const verifiedMessage = document.getElementById("verifiedMessage");
const verifiedStatusBadge = document.getElementById("verifiedStatusBadge");

let isVerifying = false;
let verificationSessionId = 0;
let bestScoreSoFar = 0;

prepareSvgProgress(progressBar);
resetProgress(progressBar);

function isMobileVerifyLayout() {
    return window.innerWidth <= 768;
}

function forceFixedVerifyCamera() {
    document.body.classList.add("verify-page");
    document.body.classList.remove("verification-completed");

    cameraSection.classList.remove("hidden");

    if (!isMobileVerifyLayout()) {
        cameraSection.removeAttribute("style");
        verifyScrollableContent.style.paddingTop = "";
        return;
    }

    cameraSection.style.display = "block";
    cameraSection.style.position = "fixed";
    cameraSection.style.top = "0";
    cameraSection.style.left = "0";
    cameraSection.style.right = "0";
    cameraSection.style.width = "100%";
    cameraSection.style.zIndex = "999999";
    cameraSection.style.background = "#090a0d";
    cameraSection.style.padding = "10px 12px 12px";
    cameraSection.style.boxShadow = "0 18px 50px rgba(0, 0, 0, 0.75)";

    const cameraHeight = cameraSection.getBoundingClientRect().height;
    verifyScrollableContent.style.paddingTop = `${cameraHeight + 16}px`;
}

function releaseVerifyCameraAfterSuccess() {
    document.body.classList.add("verification-completed");

    stopCamera(video);

    cameraSection.classList.add("hidden");
    cameraSection.removeAttribute("style");

    verifyScrollableContent.style.paddingTop = "0px";
}

function refreshFixedCameraLayout() {
    if (!document.body.classList.contains("verification-completed")) {
        requestAnimationFrame(() => {
            forceFixedVerifyCamera();
        });
    }
}

forceFixedVerifyCamera();

window.addEventListener("resize", refreshFixedCameraLayout);
window.addEventListener("orientationchange", () => {
    setTimeout(refreshFixedCameraLayout, 300);
});

async function startAutomaticVerification() {
    verificationSessionId += 1;
    const currentSessionId = verificationSessionId;

    isVerifying = true;
    bestScoreSoFar = 0;

    forceFixedVerifyCamera();

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });

    startVerificationBtn.disabled = true;
    resetBtn.disabled = false;

    verificationResult.classList.add("hidden");

    resetProgress(progressBar);
    updateProgress(progressBar, 0);

    try {
        instructionTitle.textContent = "Loading face model";
        instructionText.textContent = "Please wait. Browser is loading the face recognition model.";
        verifyBadge.textContent = "Loading";
        verifyDebug.textContent = "Loading model files...";

        await loadFaceModels((message) => {
            instructionText.textContent = message;
        });

        if (!isSessionActive(currentSessionId)) return;

        instructionTitle.textContent = "Starting camera";
        instructionText.textContent = "Please allow camera permission when the browser asks.";
        verifyBadge.textContent = "Camera";
        verifyDebug.textContent = "Opening camera...";

        await startCamera(video, cameraStatus);

        refreshFixedCameraLayout();

        if (!isSessionActive(currentSessionId)) return;

        instructionTitle.textContent = "Scanning face";
        instructionText.textContent = "Look straight at the camera. Verification will happen automatically.";
        verifyBadge.textContent = "Scanning";
        verifyDebug.textContent = "Searching for a matching registered face...";

        await automaticVerificationLoop(currentSessionId);
    } catch (error) {
        console.error(error);

        instructionTitle.textContent = "Verification error";
        instructionText.textContent = error.message || "Could not start verification.";
        verifyBadge.textContent = "Error";
        verifyDebug.textContent = "Please check backend, camera permission, and Supabase data.";

        stopCamera(video);
        updateCameraStatus(cameraStatus, "Camera stopped.");

        isVerifying = false;
        startVerificationBtn.disabled = false;
        resetBtn.disabled = false;

        refreshFixedCameraLayout();
    }
}

async function automaticVerificationLoop(currentSessionId) {
    const threshold = window.APP_CONFIG.DEFAULT_VERIFICATION_THRESHOLD;

    while (isSessionActive(currentSessionId)) {
        try {
            const faceResult = await analyzeFaceFromVideo(video);

            if (!faceResult.found) {
                verifyBadge.textContent = "No Face";
                instructionTitle.textContent = "No face detected";
                instructionText.textContent = "Please keep your face inside the guide.";
                verifyDebug.textContent = `Required match: ${(threshold * 100).toFixed(0)}%`;

                updateProgress(progressBar, Math.min(bestScoreSoFar * 100, 99));

                await sleep(window.APP_CONFIG.VERIFY_SCAN_INTERVAL_MS);
                continue;
            }

            const backendResult = await verifyFaceWithBackend(faceResult.vector, threshold);

            let scorePercent = 0;

            if (backendResult.best_match && typeof backendResult.best_match.similarity === "number") {
                scorePercent = backendResult.best_match.similarity * 100;
            }

            if (scorePercent > bestScoreSoFar * 100) {
                bestScoreSoFar = scorePercent / 100;
            }

            updateProgress(progressBar, Math.min(scorePercent, 100));

            verifyBadge.textContent = `${scorePercent.toFixed(0)}%`;

            instructionTitle.textContent = "Scanning face";
            instructionText.textContent = `Matching face... Required: ${(threshold * 100).toFixed(0)}%`;

            verifyDebug.textContent =
                `Current: ${scorePercent.toFixed(1)}% | ` +
                `Best: ${(bestScoreSoFar * 100).toFixed(1)}%`;

            if (backendResult.verified && backendResult.best_match) {
                const verifiedImageDataUrl = captureImageFromVideo(video);

                showVerifiedResult({
                    imageDataUrl: verifiedImageDataUrl,
                    backendResult
                });

                return;
            }

            await sleep(window.APP_CONFIG.VERIFY_SCAN_INTERVAL_MS);
        } catch (error) {
            console.error("Scan error:", error);

            verifyBadge.textContent = "Retrying";
            verifyDebug.textContent = error.message || "Backend verification failed. Retrying...";

            await sleep(window.APP_CONFIG.VERIFY_SCAN_INTERVAL_MS);
        }
    }
}

function showVerifiedResult({ imageDataUrl, backendResult }) {
    isVerifying = false;

    const match = backendResult.best_match;

    updateProgress(progressBar, 100);

    releaseVerifyCameraAfterSuccess();

    verificationResult.classList.remove("hidden");

    verifiedFaceImage.src = imageDataUrl;
    verifiedUserName.textContent = match.full_name;
    verifiedScore.textContent = `Similarity Score: ${(match.similarity * 100).toFixed(1)}%`;
    verifiedPose.textContent = `Matched Pose: ${match.matched_pose}`;
    verifiedMessage.textContent = "Attendance verification successful.";
    verifiedStatusBadge.textContent = "Verified";

    instructionTitle.textContent = "Face verified";
    instructionText.textContent = `${match.full_name} verified successfully.`;
    verifyBadge.textContent = "Verified";
    verifyDebug.textContent =
        `Final score: ${(match.similarity * 100).toFixed(1)}% | Threshold: ${(backendResult.threshold * 100).toFixed(0)}%`;

    startVerificationBtn.disabled = false;
    resetBtn.disabled = false;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    console.log("Backend verified result:", backendResult);
}

function resetVerification() {
    verificationSessionId += 1;
    isVerifying = false;
    bestScoreSoFar = 0;

    stopCamera(video);

    document.body.classList.remove("verification-completed");

    cameraSection.classList.remove("hidden");
    verificationResult.classList.add("hidden");

    verifiedFaceImage.removeAttribute("src");

    resetProgress(progressBar);
    updateProgress(progressBar, 0);

    instructionTitle.textContent = "Ready to verify";
    instructionText.textContent = "Click Start Verification. The system will automatically scan and verify your face.";
    verifyBadge.textContent = "Waiting";
    verifyDebug.textContent = "Match score will appear here.";

    updateCameraStatus(cameraStatus, "Camera is not started");

    startVerificationBtn.disabled = false;
    resetBtn.disabled = true;

    forceFixedVerifyCamera();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function isSessionActive(currentSessionId) {
    return isVerifying && currentSessionId === verificationSessionId;
}

startVerificationBtn.addEventListener("click", startAutomaticVerification);
resetBtn.addEventListener("click", resetVerification);

window.addEventListener("beforeunload", () => {
    stopCamera(video);
});