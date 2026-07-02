const LOCAL_USERS_KEY = "face_attendance_registered_users";

function getRegisteredUsers() {
    const rawData = localStorage.getItem(LOCAL_USERS_KEY);

    if (!rawData) return [];

    try {
        const users = JSON.parse(rawData);
        if (!Array.isArray(users)) return [];
        return users;
    } catch (error) {
        console.error("Could not parse registered users:", error);
        return [];
    }
}

function saveRegisteredUser(userData) {
    const users = getRegisteredUsers();

    const newUser = {
        id:
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()),
        full_name: userData.full_name,
        vectors: userData.vectors,
        created_at: new Date().toISOString()
    };

    users.push(newUser);

    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));

    return newUser;
}

function clearRegisteredUsers() {
    localStorage.removeItem(LOCAL_USERS_KEY);
}

function cosineSimilarity(vectorA, vectorB) {
    if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) return 0;
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
}

function findBestFaceMatch(liveVector, threshold = 0.65) {
    const users = getRegisteredUsers();

    let bestMatch = {
        verified: false,
        user_id: null,
        full_name: null,
        matched_pose: null,
        similarity: 0,
        threshold,
        message: "No matching user found."
    };

    for (const user of users) {
        if (!Array.isArray(user.vectors)) continue;

        for (const vectorItem of user.vectors) {
            if (!vectorItem || !Array.isArray(vectorItem.vector)) continue;

            const similarity = cosineSimilarity(liveVector, vectorItem.vector);

            if (similarity > bestMatch.similarity) {
                bestMatch = {
                    verified: similarity >= threshold,
                    user_id: user.id,
                    full_name: user.full_name,
                    matched_pose: vectorItem.pose,
                    similarity,
                    threshold,
                    message:
                        similarity >= threshold
                            ? "Verified successfully."
                            : "Best match found, but below threshold."
                };
            }
        }
    }

    if (users.length === 0) {
        bestMatch.message = "No registered users found. Please register first.";
    }

    return bestMatch;
}