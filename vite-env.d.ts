/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AUTHENTICATION?: string
    readonly VITE_APP_USERNAME?: string
    readonly VITE_APP_PASSWORD?: string
    readonly GEMINI_API_KEY?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
