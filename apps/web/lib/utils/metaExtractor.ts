export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

export interface ExtractedMeta {
  title: string | null;
  authors: string[];
  doi: string | null;
  publisher: string | null;
  publicationYear: number | null;
  venue: string | null;
  abstract: string | null;
}

export function extractAcademicMetaTags(html: string): ExtractedMeta {
  const getMetaContent = (name: string): string | null => {
    // Try multiple regex patterns to capture different meta tag variations
    const patterns = [
      new RegExp(`<meta\\s+[^>]*name=["']${name}["']\\s+[^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["']\\s+[^>]*name=["']${name}["']`, 'i'),
      new RegExp(`<meta\\s+[^>]*property=["']${name}["']\\s+[^>]*content=["']([^"']+)["']`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return decodeHtmlEntities(match[1].trim());
      }
    }
    return null;
  };

  const getMultipleMetaContents = (name: string): string[] => {
    const list: string[] = [];
    const patterns = [
      new RegExp(`<meta\\s+[^>]*name=["']${name}["']\\s+[^>]*content=["']([^"']+)["']`, 'gi'),
      new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["']\\s+[^>]*name=["']${name}["']`, 'gi'),
    ];

    for (const pattern of patterns) {
      let match;
      // Reset regex index
      pattern.lastIndex = 0;
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) {
          const val = decodeHtmlEntities(match[1].trim());
          if (!list.includes(val)) {
            list.push(val);
          }
        }
      }
    }
    return list;
  };

  // 1. Title
  const title = getMetaContent('citation_title') || getMetaContent('og:title') || getMetaContent('dc.title');

  // 2. Authors
  let authors = getMultipleMetaContents('citation_author');
  if (authors.length === 0) {
    const dcAuthors = getMultipleMetaContents('dc.creator');
    if (dcAuthors.length > 0) {
      authors = dcAuthors;
    }
  }

  // 3. DOI
  const doi = getMetaContent('citation_doi') || getMetaContent('dc.identifier') || getMetaContent('citation_arxiv_id');

  // 4. Publisher
  const publisher = getMetaContent('citation_publisher') || getMetaContent('dc.publisher');

  // 5. Publication Year
  let publicationYear: number | null = null;
  const rawDate = getMetaContent('citation_publication_date') || getMetaContent('citation_date') || getMetaContent('dc.date');
  if (rawDate) {
    const yearMatch = rawDate.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      publicationYear = parseInt(yearMatch[0], 10);
    }
  }

  // 6. Venue
  const venue = getMetaContent('citation_journal_title') || getMetaContent('citation_conference_title') || getMetaContent('citation_technical_report_institution');

  // 7. Abstract
  const abstract = getMetaContent('citation_abstract') || getMetaContent('description') || getMetaContent('og:description');

  return {
    title,
    authors,
    doi,
    publisher,
    publicationYear,
    venue,
    abstract,
  };
}
