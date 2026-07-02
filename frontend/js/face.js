let isFaceModelLoaded = false;

async function loadFaceModels(statusCallback) {
    if (isFaceModelLoaded) {
        if (statusCallback) statusCallback("Face model already loaded.");
        return;
    }

    if (typeof faceapi === "undefined") {
        throw new Error("face-api.js is not loaded. Please check the script tag.");
    }

    if (statusCallback) statusCallback("Loading face models...");

    const modelUrl = window.APP_CONFIG.MODEL_URL;

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
    ]);

    isFaceModelLoaded = true;

    if (statusCallback) statusCallback("Face model loaded successfully.");
}

function getFaceDetectionOptions() {
    return new faceapi.TinyFaceDetectorOptions({
        inputSize: window.APP_CONFIG.FACE_DETECTION_INPUT_SIZE,
        scoreThreshold: window.APP_CONFIG.FACE_DETECTION_SCORE_THRESHOLD
    });
}

function normalizeVector(vector) {
    const norm = Math.sqrt(
        vector.reduce((sum, value) => sum + value * value, 0)
    );

    if (!norm || !Number.isFinite(norm)) {
        throw new Error("Invalid face vector.");
    }

    return vector.map((value) => value / norm);
}

function averagePoint(points) {
    const total = points.reduce(
        (acc, point) => {
            acc.x += point.x;
            acc.y += point.y;
            return acc;
        },
        { x: 0, y: 0 }
    );

    return {
        x: total.x / points.length,
        y: total.y / points.length
    };
}

function getPoseFromLandmarks(landmarks) {
    const leftEye = averagePoint(landmarks.getLeftEye());
    const rightEye = averagePoint(landmarks.getRightEye());
    const nose = averagePoint(landmarks.getNose());
    const mouth = averagePoint(landmarks.getMouth());

    const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
    };

    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const faceVerticalDistance = Math.max(1, Math.abs(mouth.y - eyeCenter.y));

    const yawRatio = (nose.x - eyeCenter.x) / Math.max(1, eyeDistance);
    const pitchRatio = (nose.y - eyeCenter.y) / faceVerticalDistance;

    const yawThreshold = window.APP_CONFIG.POSE.YAW_THRESHOLD;
    const upThreshold = window.APP_CONFIG.POSE.PITCH_UP_THRESHOLD;
    const downThreshold = window.APP_CONFIG.POSE.PITCH_DOWN_THRESHOLD;
    const shouldSwapLeftRight = window.APP_CONFIG.POSE.SWAP_LEFT_RIGHT;

    let yawPose = "front";

    if (yawRatio > yawThreshold) {
        yawPose = shouldSwapLeftRight ? "left" : "right";
    } else if (yawRatio < -yawThreshold) {
        yawPose = shouldSwapLeftRight ? "right" : "left";
    }

    let pitchPose = "front";

    if (pitchRatio < upThreshold) {
        pitchPose = "up";
    } else if (pitchRatio > downThreshold) {
        pitchPose = "down";
    }

    let finalPose = "front";

    if (yawPose !== "front") {
        finalPose = yawPose;
    } else if (pitchPose !== "front") {
        finalPose = pitchPose;
    }

    return {
        pose: finalPose,
        yawRatio,
        pitchRatio,
        eyeDistance,
        faceVerticalDistance
    };
}

async function analyzeFaceFromVideo(videoElement) {
    if (!isFaceModelLoaded) {
        throw new Error("Face model is not loaded yet.");
    }

    const result = await faceapi
        .detectSingleFace(videoElement, getFaceDetectionOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (!result) {
        return {
            found: false,
            message: "No face detected."
        };
    }

    const descriptorArray = Array.from(result.descriptor);
    const normalizedVector = normalizeVector(descriptorArray);
    const poseInfo = getPoseFromLandmarks(result.landmarks);

    return {
        found: true,
        vector: normalizedVector,
        vectorLength: normalizedVector.length,
        detectionScore: result.detection.score,
        pose: poseInfo.pose,
        yawRatio: poseInfo.yawRatio,
        pitchRatio: poseInfo.pitchRatio
    };
}

async function getFaceVectorFromImageElement(imageElement) {
    if (!isFaceModelLoaded) {
        throw new Error("Face model is not loaded yet.");
    }

    if (!imageElement || !imageElement.src) {
        throw new Error("No image found for face vector generation.");
    }

    const result = await faceapi
        .detectSingleFace(imageElement, getFaceDetectionOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (!result) {
        throw new Error("No face detected. Please retake the image with your face clearly visible.");
    }

    const descriptorArray = Array.from(result.descriptor);
    const normalizedVector = normalizeVector(descriptorArray);
    const poseInfo = getPoseFromLandmarks(result.landmarks);

    return {
        vector: normalizedVector,
        vectorLength: normalizedVector.length,
        detectionScore: result.detection.score,
        pose: poseInfo.pose,
        yawRatio: poseInfo.yawRatio,
        pitchRatio: poseInfo.pitchRatio
    };
}

async function getFaceVectorFromVideo(videoElement) {
    const result = await analyzeFaceFromVideo(videoElement);

    if (!result.found) {
        throw new Error("No face detected. Please keep your face inside the guide.");
    }

    return result;
}