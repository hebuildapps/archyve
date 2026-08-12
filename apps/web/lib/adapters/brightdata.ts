import { NormalizedPaper } from '@archyve/shared';

export async function scrapeWithBrightData(url: string) {
    const token = process.env.BRIGHT_DATA_API_TOKEN;
    const collector = process.env.BRIGHT_DATA_COLLECTOR_ID;

    if (!token || !collector) {
        throw new Error("Bright Data credentials are not configured");
    }

    const response = await fetch(
        `https://api.brightdata.com/dca/trigger_immediate?collector=${collector}`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
        }
    );

    if (!response.ok) {
        throw new Error(
            `Bright Data scrape failed: ${response.status} ${await response.text()}`
        );
    }

    return response.json();
}

/**
 * Normalizes Bright Data IEEE scrape results into the standard NormalizedPaper structure.
 */
export function normalizeIEEE(brightDataResult: any, url: string): NormalizedPaper {
  const data = Array.isArray(brightDataResult) ? brightDataResult[0] : brightDataResult;
  if (!data) {
    return {
      title: `IEEE Document`,
      authors: ['Unknown Author'],
      doi: null,
      publisher: 'IEEE',
      publicationYear: null,
      venue: null,
      url: url,
      abstract: null,
      publisherId: null,
      confidenceScore: 0.4,
    };
  }

  const documentId = data.document_id || '';
  const title = data.title || '';
  const authors = Array.isArray(data.authors) ? data.authors : [];
  
  return {
    title: title || `IEEE Document ${documentId}`,
    authors: authors.length > 0 ? authors : ['Unknown Author'],
    doi: data.doi || null,
    publisher: 'IEEE',
    publicationYear: typeof data.publication_year === 'number' ? data.publication_year : null,
    venue: data.venue || null,
    url: url,
    abstract: data.abstract || null,
    publisherId: documentId || null,
    confidenceScore: title && authors.length > 0 ? 0.9 : 0.4,
  };
}

/**
 * Scrapes IEEE metadata using Bright Data.
 */
export async function scrapeIEEEWithBrightData(
  url: string,
  onProgress?: (status: string, percentage: number) => void
): Promise<NormalizedPaper | null> {
  onProgress?.('Triggering Bright Data scraper...', 5);
  try {
    const rawResult = await scrapeWithBrightData(url);
    onProgress?.('Bright Data scraper completed.', 15);
    return normalizeIEEE(rawResult, url);
  } catch (error) {
    console.error('Error in scrapeIEEEWithBrightData:', error);
    onProgress?.('Bright Data trigger failed, trying direct scrape fallback...', 10);
    return null;
  }
}
