import { decodeHtmlEntities } from '../utils/metaExtractor';
import { NCBIAuthor, NCBIRawRecord } from './types';

/**
 * Strips XML and HTML tags, normalizing whitespace and entities.
 */
export function cleanXmlText(text: string): string {
  if (!text) return '';
  return decodeHtmlEntities(
    text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extracts inner content of the first matching tag.
 */
function getTagContent(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].trim() : null;
}

/**
 * Extracts all matching tag contents.
 */
function getAllTagContents(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1]) {
      results.push(match[1]);
    }
  }
  return results;
}

/**
 * Robust XML parser for PubMed EFetch XML records.
 */
export function parsePubMedXml(xml: string): NCBIRawRecord | null {
  const articleBlock = getTagContent(xml, 'PubmedArticle');
  if (!articleBlock) {
    // Check if it's empty PubmedArticleSet
    return null;
  }

  // 1. Article IDs from PubmedData/ArticleIdList
  const articleIds: { type: string; value: string }[] = [];
  let pmid: string | null = null;
  let pmcid: string | null = null;
  let doi: string | null = null;

  const idRegex = /<ArticleId\s+IdType=["']([^"']+)["'][^>]*>([\s\S]*?)<\/ArticleId>/gi;
  let idMatch: RegExpExecArray | null;
  while ((idMatch = idRegex.exec(articleBlock)) !== null) {
    const type = idMatch[1].trim().toLowerCase();
    const value = idMatch[2].trim();
    articleIds.push({ type, value });

    if (type === 'pubmed' && !pmid) {
      pmid = value;
    } else if (type === 'pmc' && !pmcid) {
      pmcid = value;
    } else if (type === 'doi' && !doi) {
      doi = value;
    }
  }

  // If pmid wasn't in ArticleIdList, try PMID tag in MedlineCitation
  if (!pmid) {
    const medlineCitation = getTagContent(articleBlock, 'MedlineCitation');
    if (medlineCitation) {
      const pmidContent = getTagContent(medlineCitation, 'PMID');
      if (pmidContent) {
        pmid = cleanXmlText(pmidContent);
      }
    }
  }

  if (!pmid) return null;

  // 2. Title
  const rawTitle = getTagContent(articleBlock, 'ArticleTitle');
  const title = rawTitle ? cleanXmlText(rawTitle) : `PubMed Paper ${pmid}`;

  // 3. Abstract (concatenate multiple AbstractText if structured, e.g. Label="BACKGROUND")
  let abstract: string | null = null;
  const abstractBlock = getTagContent(articleBlock, 'Abstract');
  if (abstractBlock) {
    const abstractTextRegex = /<AbstractText(?:\s+Label=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/AbstractText>/gi;
    let abMatch: RegExpExecArray | null;
    const abstractParts: string[] = [];

    while ((abMatch = abstractTextRegex.exec(abstractBlock)) !== null) {
      const label = abMatch[1];
      const text = cleanXmlText(abMatch[2]);
      if (text) {
        if (label) {
          abstractParts.push(`${label.toUpperCase()}: ${text}`);
        } else {
          abstractParts.push(text);
        }
      }
    }

    if (abstractParts.length > 0) {
      abstract = abstractParts.join('\n\n');
    } else {
      // Fallback: strip tags from entire abstract block
      const direct = cleanXmlText(abstractBlock);
      if (direct) abstract = direct;
    }
  }

  // 4. Authors
  const authors: NCBIAuthor[] = [];
  const authorBlocks = getAllTagContents(articleBlock, 'Author');
  for (const block of authorBlocks) {
    const lastName = getTagContent(block, 'LastName');
    const foreName = getTagContent(block, 'ForeName');
    const initials = getTagContent(block, 'Initials');
    const collectiveName = getTagContent(block, 'CollectiveName');
    const affiliation = getTagContent(block, 'Affiliation');

    let name = '';
    if (foreName && lastName) {
      name = `${cleanXmlText(foreName)} ${cleanXmlText(lastName)}`;
    } else if (lastName && initials) {
      name = `${cleanXmlText(initials)} ${cleanXmlText(lastName)}`;
    } else if (lastName) {
      name = cleanXmlText(lastName);
    } else if (collectiveName) {
      name = cleanXmlText(collectiveName);
    }

    if (name) {
      authors.push({
        name,
        foreName: foreName ? cleanXmlText(foreName) : undefined,
        lastName: lastName ? cleanXmlText(lastName) : undefined,
        initials: initials ? cleanXmlText(initials) : undefined,
        affiliation: affiliation ? cleanXmlText(affiliation) : undefined,
      });
    }
  }

  // 5. Journal / Venue
  let journal: string | null = null;
  const journalBlock = getTagContent(articleBlock, 'Journal');
  if (journalBlock) {
    const jt = getTagContent(journalBlock, 'Title');
    if (jt) {
      journal = cleanXmlText(jt);
    } else {
      const iso = getTagContent(journalBlock, 'ISOAbbreviation');
      if (iso) journal = cleanXmlText(iso);
    }
  }

  // 6. Publication Year
  let publicationYear: number | null = null;
  const pubDateBlock = getTagContent(articleBlock, 'PubDate');
  if (pubDateBlock) {
    const yearStr = getTagContent(pubDateBlock, 'Year');
    if (yearStr) {
      const parsed = parseInt(yearStr, 10);
      if (!isNaN(parsed)) publicationYear = parsed;
    } else {
      const medlineDate = getTagContent(pubDateBlock, 'MedlineDate');
      if (medlineDate) {
        const ym = medlineDate.match(/\b(19|20)\d{2}\b/);
        if (ym) publicationYear = parseInt(ym[0], 10);
      }
    }
  }
  if (!publicationYear) {
    const articleDateBlock = getTagContent(articleBlock, 'ArticleDate');
    if (articleDateBlock) {
      const yearStr = getTagContent(articleDateBlock, 'Year');
      if (yearStr) {
        const parsed = parseInt(yearStr, 10);
        if (!isNaN(parsed)) publicationYear = parsed;
      }
    }
  }

  // 7. Publication Types
  const publicationTypes: string[] = [];
  const pubTypeBlocks = getAllTagContents(articleBlock, 'PublicationType');
  for (const pt of pubTypeBlocks) {
    const cleaned = cleanXmlText(pt);
    if (cleaned) publicationTypes.push(cleaned);
  }

  // 8. MeSH Headings
  const meshTerms: string[] = [];
  const meshBlocks = getAllTagContents(articleBlock, 'MeshHeading');
  for (const mb of meshBlocks) {
    const desc = getTagContent(mb, 'DescriptorName');
    if (desc) {
      const cleaned = cleanXmlText(desc);
      if (cleaned) meshTerms.push(cleaned);
    }
  }

  // 9. Keywords
  const keywords: string[] = [];
  const kwBlocks = getAllTagContents(articleBlock, 'Keyword');
  for (const kw of kwBlocks) {
    const cleaned = cleanXmlText(kw);
    if (cleaned && !keywords.includes(cleaned)) {
      keywords.push(cleaned);
    }
  }

  return {
    pmid,
    pmcid: pmcid || null,
    doi: doi || null,
    title,
    abstract,
    authors,
    journal,
    publicationYear,
    publicationTypes,
    meshTerms,
    keywords,
    articleIds,
  };
}

/**
 * Robust XML parser for PMC EFetch XML records.
 */
export function parsePMCXml(xml: string, requestedPmcId?: string): NCBIRawRecord | null {
  const frontBlock = getTagContent(xml, 'front');
  if (!frontBlock) return null;

  // 1. Article IDs
  const articleIds: { type: string; value: string }[] = [];
  let pmid: string | null = null;
  let pmcid: string | null = null;
  let doi: string | null = null;

  const idRegex = /<article-id(?:\s+pub-id-type=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/article-id>/gi;
  let idMatch: RegExpExecArray | null;
  while ((idMatch = idRegex.exec(frontBlock)) !== null) {
    const type = (idMatch[1] || '').trim().toLowerCase();
    const value = idMatch[2].trim();
    articleIds.push({ type, value });

    if (type === 'pmid' && !pmid) {
      pmid = value;
    } else if (type === 'pmc' && !pmcid) {
      pmcid = value.startsWith('PMC') ? value : `PMC${value}`;
    } else if (type === 'doi' && !doi) {
      doi = value;
    }
  }

  if (!pmcid && requestedPmcId) {
    pmcid = requestedPmcId.startsWith('PMC') ? requestedPmcId : `PMC${requestedPmcId}`;
  }

  // 2. Title
  const titleBlock = getTagContent(frontBlock, 'article-title');
  const title = titleBlock ? cleanXmlText(titleBlock) : `PMC Paper ${pmcid || ''}`;

  // 3. Abstract
  const abstractBlock = getTagContent(frontBlock, 'abstract');
  const abstract = abstractBlock ? cleanXmlText(abstractBlock) : null;

  // 4. Authors
  const authors: NCBIAuthor[] = [];
  const contribRegex = /<contrib\s+[^>]*contrib-type=["']author["'][^>]*>([\s\S]*?)<\/contrib>/gi;
  let cMatch: RegExpExecArray | null;
  while ((cMatch = contribRegex.exec(frontBlock)) !== null) {
    const block = cMatch[1];
    const surname = getTagContent(block, 'surname');
    const givenNames = getTagContent(block, 'given-names');
    const colName = getTagContent(block, 'collab');

    let name = '';
    if (givenNames && surname) {
      name = `${cleanXmlText(givenNames)} ${cleanXmlText(surname)}`;
    } else if (surname) {
      name = cleanXmlText(surname);
    } else if (colName) {
      name = cleanXmlText(colName);
    }

    if (name) {
      authors.push({
        name,
        foreName: givenNames ? cleanXmlText(givenNames) : undefined,
        lastName: surname ? cleanXmlText(surname) : undefined,
      });
    }
  }

  // 5. Journal
  let journal: string | null = null;
  const jt = getTagContent(frontBlock, 'journal-title');
  if (jt) {
    journal = cleanXmlText(jt);
  } else {
    const jid = getTagContent(frontBlock, 'journal-id');
    if (jid) journal = cleanXmlText(jid);
  }

  // 6. Year
  let publicationYear: number | null = null;
  const pubDateBlock = getTagContent(frontBlock, 'pub-date');
  if (pubDateBlock) {
    const yearStr = getTagContent(pubDateBlock, 'year');
    if (yearStr) {
      const parsed = parseInt(yearStr, 10);
      if (!isNaN(parsed)) publicationYear = parsed;
    }
  }

  return {
    pmid: pmid || '',
    pmcid: pmcid || null,
    doi: doi || null,
    title,
    abstract,
    authors,
    journal,
    publicationYear,
    publicationTypes: ['Journal Article'],
    meshTerms: [],
    keywords: [],
    articleIds,
    isPMCArticle: true,
  };
}
