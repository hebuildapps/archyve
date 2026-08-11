export interface OpenAccessResult {
  available: boolean;
  sourceName: string | null;
  url: string | null;
}

/**
 * Check Unpaywall API for a free, legal Open-Access PDF.
 */
export async function checkUnpaywallOpenAccess(doi: string): Promise<OpenAccessResult> {
  const cleanDoi = doi.trim();
  // Unpaywall requires an email parameter for rate limits
  const email = 'hello@archyve.app';
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(cleanDoi)}?email=${encodeURIComponent(email)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { available: false, sourceName: null, url: null };
    }

    const data = await response.json();
    
    if (data.is_oa && data.best_oa_location) {
      const location = data.best_oa_location;
      return {
        available: true,
        sourceName: location.repository_institution || location.publisher || 'Unpaywall Verified Source',
        url: location.url_for_pdf || location.url_for_landing_page || null,
      };
    }

    return { available: false, sourceName: null, url: null };
  } catch (error) {
    console.error(`Unpaywall OA check failed for DOI ${cleanDoi}:`, error);
    return { available: false, sourceName: null, url: null };
  }
}
