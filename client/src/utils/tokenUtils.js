/**
 * Decodes a JWT payload without verifying the signature.
 * Used client-side to extract expiration time for session management.
 */
export function decodeToken(token) {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const decoded = JSON.parse(atob(payload));
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Returns the expiration Date of a JWT token.
 */
export function getTokenExpiration(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    return new Date(decoded.exp * 1000);
}

/**
 * Checks if a JWT token will expire within the given minutes.
 */
export function isTokenExpiringSoon(token, minutes = 5) {
    const expiration = getTokenExpiration(token);
    if (!expiration) return false;
    const now = new Date();
    const msUntilExpiration = expiration.getTime() - now.getTime();
    return msUntilExpiration > 0 && msUntilExpiration <= minutes * 60 * 1000;
}

/**
 * Returns milliseconds until the token expires.
 * Returns 0 if already expired, null if no valid token.
 */
export function getMillisecondsUntilExpiration(token) {
    const expiration = getTokenExpiration(token);
    if (!expiration) return null;
    const now = new Date();
    const ms = expiration.getTime() - now.getTime();
    return Math.max(0, ms);
}
