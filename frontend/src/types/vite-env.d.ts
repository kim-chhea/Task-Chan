/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string;
    /** Base URL of the API when it is on a different origin than the frontend. Leave empty in dev. */
    readonly VITE_API_URL?: string;
}
