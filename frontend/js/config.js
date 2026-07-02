const LOCAL_BACKEND_URL = window.location.origin;

const LIVE_BACKEND_URL = "https://web-face-attendance-system.onrender.com";

function getApiBaseUrl() {
    const hostname = window.location.hostname;

    const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1";

    const isNgrok =
        hostname.includes("ngrok-free.app") ||
        hostname.includes("ngrok-free.dev");

    const isFastApiFrontendPath =
        window.location.pathname.startsWith("/frontend/");

    if (isLocalhost || isNgrok || isFastApiFrontendPath) {
        return LOCAL_BACKEND_URL;
    }

    return LIVE_BACKEND_URL;
}

window.APP_CONFIG = {
    MODEL_URL: "./models",

    API_BASE_URL: getApiBaseUrl(),

    FACE_DETECTION_INPUT_SIZE: 224,
    FACE_DETECTION_SCORE_THRESHOLD: 0.5,

    AUTO_CAPTURE_STABLE_MS: 1000,
    AUTO_CAPTURE_CHECK_INTERVAL_MS: 140,

    DEFAULT_VERIFICATION_THRESHOLD: 0.65,
    VERIFY_SCAN_INTERVAL_MS: 250,

    POSE: {
        YAW_THRESHOLD: 0.12,
        PITCH_UP_THRESHOLD: 0.38,
        PITCH_DOWN_THRESHOLD: 0.62,
        SWAP_LEFT_RIGHT: false
    }
};

console.log("API_BASE_URL:", window.APP_CONFIG.API_BASE_URL);