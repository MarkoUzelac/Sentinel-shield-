/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEOAPIFY_API_KEY?: string;
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_GEOCODING_API_URL?: string;
  readonly VITE_GEO_PROVIDER?: string;
  readonly VITE_OPENCELLID_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
