import crypto from "node:crypto";
export function generateKeyPair() {
    return crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });
}
export function canonicalize(obj) {
    if (obj === null || typeof obj !== "object") {
        return typeof obj === "bigint" ? obj.toString() : obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(canonicalize);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    for (const key of sortedKeys) {
        result[key] = canonicalize(obj[key]);
    }
    return result;
}
export function computeParamsHash(params) {
    const canonical = JSON.stringify(canonicalize(params));
    return crypto.createHash("sha256").update(canonical).digest("hex");
}
export function computeChallenge(action, paramsHash, nonce, deadline, domain) {
    return `ACTION:${action}|PARAMS:${paramsHash}|NONCE:${nonce}|DEADLINE:${deadline}|DOMAIN:${domain}`;
}
export function signAdminIntent(action, params, nonce, deadline, domain, privateKeyPem) {
    const paramsHash = computeParamsHash(params);
    const challenge = computeChallenge(action, paramsHash, nonce, deadline, domain);
    const signature = crypto.sign(null, Buffer.from(challenge), privateKeyPem).toString("hex");
    return {
        action,
        params,
        nonce,
        deadline,
        domain,
        signature
    };
}
