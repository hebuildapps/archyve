export interface AIKeyStore {
  getApiKey(provider?: string): string | null;
  setApiKey(key: string, provider?: string): void;
  clearApiKey(provider?: string): void;
  getProvider(): string;
  setProvider(provider: string): void;
  getModel(provider?: string): string;
  setModel(model: string, provider?: string): void;
}

export class LocalAIKeyStore implements AIKeyStore {
  private getStorageKey(provider: string): string {
    return provider === 'groq' ? 'archyve_groq_api_key' : 'archyve_gemini_api_key';
  }

  getApiKey(provider?: string): string | null {
    if (typeof window === 'undefined') return null;
    const currentProvider = provider || this.getProvider();
    return localStorage.getItem(this.getStorageKey(currentProvider));
  }

  setApiKey(key: string, provider?: string): void {
    if (typeof window === 'undefined') return;
    const currentProvider = provider || this.getProvider();
    localStorage.setItem(this.getStorageKey(currentProvider), key.trim());
  }

  clearApiKey(provider?: string): void {
    if (typeof window === 'undefined') return;
    const currentProvider = provider || this.getProvider();
    localStorage.removeItem(this.getStorageKey(currentProvider));
  }

  getProvider(): string {
    if (typeof window === 'undefined') return 'gemini';
    return localStorage.getItem('archyve_ai_provider') || 'gemini';
  }

  setProvider(provider: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('archyve_ai_provider', provider);
  }

  getModel(provider?: string): string {
    if (typeof window === 'undefined') return 'gemini-3.5-flash';
    const currentProvider = provider || this.getProvider();
    const stored = localStorage.getItem(`archyve_${currentProvider}_model`);
    if (stored) return stored;
    return currentProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-3.5-flash';
  }

  setModel(model: string, provider?: string): void {
    if (typeof window === 'undefined') return;
    const currentProvider = provider || this.getProvider();
    localStorage.setItem(`archyve_${currentProvider}_model`, model.trim());
  }
}

export const keyStore = new LocalAIKeyStore();

