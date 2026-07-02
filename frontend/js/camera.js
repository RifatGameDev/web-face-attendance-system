let activeCameraStream = null;

async function startCamera(videoElement, statusElement) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera is not supported in this browser.");
    }

    stopCamera(videoElement);

    const preferredConstraints = {
        audio: false,
        video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    };

    const fallbackConstraints = {
        audio: false,
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    };

    try {
        updateCameraStatus(statusElement, "Requesting camera permission...");
        activeCameraStream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
    } catch (firstError) {
        console.warn("Preferred front camera failed. Trying fallback webcam.", firstError);

        try {
            activeCameraStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (secondError) {
            console.error("Camera error:", secondError);
            throw new Error("Camera permission denied or camera not available.");
        }
    }

    videoElement.srcObject = activeCameraStream;

    await new Promise((resolve) => {
        videoElement.onloadedmetadata = resolve;
    });

    await videoElement.play();

    updateCameraStatus(statusElement, "Camera is active. Keep your face inside the guide.");
}

function stopCamera(videoElement) {
    if (activeCameraStream) {
        activeCameraStream.getTracks().forEach((track) => track.stop());
        activeCameraStream = null;
    }

    if (videoElement) {
        videoElement.srcObject = null;
    }
}

function captureImageFromVideo(videoElement) {
    const canvas = document.createElement("canvas");

    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(videoElement, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.9);
}

function setPreviewImage(imageElement, dataUrl) {
    imageElement.src = dataUrl;
}

function updateCameraStatus(statusElement, message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function isSvgProgressElement(progressElement) {
    return (
        progressElement &&
        progressElement instanceof SVGElement &&
        typeof progressElement.getTotalLength === "function"
    );
}

function prepareSvgProgress(progressElement) {
    if (!isSvgProgressElement(progressElement)) return;

    const totalLength = progressElement.getTotalLength();

    progressElement.dataset.totalLength = String(totalLength);
    progressElement.style.strokeDasharray = `${totalLength} ${totalLength}`;
    progressElement.style.strokeDashoffset = String(totalLength);
    progressElement.style.opacity = "0";
}

function resetProgress(progressElement) {
    if (!progressElement) return;

    if (isSvgProgressElement(progressElement)) {
        const totalLength =
            Number(progressElement.dataset.totalLength) ||
            progressElement.getTotalLength();

        progressElement.style.transition = "none";
        progressElement.style.strokeDasharray = `${totalLength} ${totalLength}`;
        progressElement.style.strokeDashoffset = String(totalLength);
        progressElement.style.opacity = "0";

        progressElement.getBoundingClientRect();

        progressElement.style.transition = "stroke-dashoffset 0.1s linear";
        return;
    }

    progressElement.style.width = "0%";
}

function updateProgress(progressElement, percentage) {
    if (!progressElement) return;

    const safePercentage = Math.max(0, Math.min(100, Number(percentage) || 0));

    if (isSvgProgressElement(progressElement)) {
        const totalLength =
            Number(progressElement.dataset.totalLength) ||
            progressElement.getTotalLength();

        if (safePercentage <= 0) {
            progressElement.style.opacity = "0";
            progressElement.style.strokeDashoffset = String(totalLength);
            return;
        }

        progressElement.style.opacity = "1";

        if (safePercentage >= 100) {
            progressElement.style.strokeDashoffset = "0";
            return;
        }

        const progressLength = (safePercentage / 100) * totalLength;
        progressElement.style.strokeDashoffset = String(totalLength - progressLength);
        return;
    }

    progressElement.style.width = `${safePercentage}%`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCountdown({
    seconds,
    titleElement,
    textElement,
    progressElement,
    title,
    instruction
}) {
    resetProgress(progressElement);

    const totalSteps = seconds * 10;

    for (let step = 0; step <= totalSteps; step++) {
        const remaining = Math.max(0, Math.ceil((totalSteps - step) / 10));

        titleElement.textContent = title;
        textElement.textContent = `${instruction} Capturing in ${remaining}...`;

        const percentage = (step / totalSteps) * 100;
        updateProgress(progressElement, percentage);

        await sleep(100);
    }

    updateProgress(progressElement, 100);
}