/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATE_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
