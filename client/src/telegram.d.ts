export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  version?: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramWebAppUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
    TelegramWebviewProxy?: { postEvent: (event: string, data: string) => void };
    webkit?: {
      messageHandlers?: { TelegramWebView?: { postMessage: (body: unknown) => void } };
    };
  }
}

export {};
