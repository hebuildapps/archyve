export interface AIKeyStore {
  getApiKey(): string | null;
  setApiKey(key: string): void;
  clearApiKey(): void;
}

export class LocalAIKeyStore implements AIKeyStore {
  private storageKey = 'archyve_gemini_api_key';

  getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.storageKey);
  }

  setApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, key.trim());
  }

  clearApiKey(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.storageKey);
  }
}

export const keyStore = new LocalAIKeyStore();
