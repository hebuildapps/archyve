import { PublisherAdapter } from './PublisherAdapter';
import { IEEEAdapter } from './IEEEAdapter';
import { SpringerAdapter } from './SpringerAdapter';
import { ElsevierAdapter } from './ElsevierAdapter';
import { JSTORAdapter } from './JSTORAdapter';
import { ArxivAdapter } from './ArxivAdapter';
import { PubMedAdapter } from './PubMedAdapter';

export const adapters: PublisherAdapter[] = [
  new IEEEAdapter(),
  new SpringerAdapter(),
  new ElsevierAdapter(),
  new JSTORAdapter(),
  new ArxivAdapter(),
  new PubMedAdapter(),
];

export function getAdapterForUrl(url: string): PublisherAdapter | null {
  for (const adapter of adapters) {
    if (adapter.supports(url)) {
      return adapter;
    }
  }
  return null;
}

export * from './PublisherAdapter';
export * from './IEEEAdapter';
export * from './SpringerAdapter';
export * from './ElsevierAdapter';
export * from './JSTORAdapter';
export * from './ArxivAdapter';
export * from './PubMedAdapter';

