export interface BaleWebAppUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
}

export interface BaleWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: BaleWebAppUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  isMiniAppSupported?: boolean;
  ready: () => void;
  expand: () => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
}

export interface BaleNamespace {
  WebApp: BaleWebApp;
}

declare global {
  interface Window {
    Bale?: BaleNamespace;
  }
}

export {};
