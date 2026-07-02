async function registerFaceToBackend(registrationPayload) {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/register-face`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(registrationPayload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Face registration failed");
    }

    return data;
}

async function verifyFaceWithBackend(liveVector, threshold = 0.65) {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/verify-face`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            vector: liveVector,
            threshold
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Face verification failed");
    }

    return data;
}