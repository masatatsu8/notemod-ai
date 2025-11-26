const AUTH_KEY = 'notemod_auth_token';
const AUTH_EXPIRY_KEY = 'notemod_auth_expiry';

export const isAuthenticationRequired = (): boolean => {
    const authEnv = import.meta.env.VITE_AUTHENTICATION;
    console.log('[Auth] VITE_AUTHENTICATION:', authEnv);
    if (!authEnv) return false;
    const lower = authEnv.toLowerCase();
    const required = lower === 'true' || lower === '1';
    console.log('[Auth] Authentication required:', required);
    return required;
};

export const validateCredentials = (username: string, password: string): boolean => {
    const expectedUsername = import.meta.env.VITE_APP_USERNAME;
    const expectedPassword = import.meta.env.VITE_APP_PASSWORD;

    console.log('[Auth] Validating credentials...');

    if (!expectedUsername || !expectedPassword) {
        console.error('[Auth] APP_USERNAME or APP_PASSWORD not configured');
        return false;
    }

    const isValid = username === expectedUsername && password === expectedPassword;
    console.log('[Auth] Credentials valid:', isValid);
    return isValid;
};

export const setAuthToken = (): void => {
    const token = crypto.randomUUID();
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now

    localStorage.setItem(AUTH_KEY, token);
    localStorage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
};

export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem(AUTH_KEY);
    const expiryStr = localStorage.getItem(AUTH_EXPIRY_KEY);

    if (!token || !expiryStr) return false;

    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) {
        clearAuth();
        return false;
    }

    return true;
};

export const clearAuth = (): void => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
};
