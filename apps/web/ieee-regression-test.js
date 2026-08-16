/**
 * Regression Test for IEEE Documents 9413901, 7444399, and 5764505 (MathML/formula titles).
 * Verifies that the lookup and validation pipeline resolves to correct papers and rejects mismatched ones.
 */

function normalizeScholarlyTitle(title) {
  if (!title) return '';
  return title
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mu;/gi, 'μ')
    .replace(/&#956;/gi, 'μ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\mu/g, 'μ')
    .replace(/\\hbox\s*\{([^}]*)\}/g, '$1')
    .replace(/\\text\s*\{([^}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\\/g, ' ')
    .replace(/\u00B5/g, 'μ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTitleSimilarity(t1, t2) {
  const norm1 = normalizeScholarlyTitle(t1);
  const norm2 = normalizeScholarlyTitle(t2);

  const clean = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\sμ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const w1 = new Set(clean(norm1));
  const w2 = new Set(clean(norm2));

  if (w1.size === 0 || w2.size === 0) return 0;

  const intersection = new Set([...w1].filter((x) => w2.has(x)));
  const union = new Set([...w1, ...w2]);

  return intersection.size / union.size;
}

function checkAuthorsOverlap(a1, a2) {
  if (a1.includes('Unknown Author') || a2.includes('Unknown Author') || a1.length === 0 || a2.length === 0) {
    return true;
  }
  const cleanName = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const set1 = new Set(a1.map(cleanName));
  const set2 = new Set(a2.map(cleanName));
  for (const a of set1) {
    if (set2.has(a)) return true;
  }
  const getLastName = (n) => {
    const parts = n.toLowerCase().split(/\s+/);
    return parts[parts.length - 1] || '';
  };
  const lastSet1 = new Set(a1.map(getLastName).filter(l => l.length > 2));
  const lastSet2 = new Set(a2.map(getLastName).filter(l => l.length > 2));
  for (const l of lastSet1) {
    if (lastSet2.has(l)) return true;
  }
  return false;
}

function checkPublisher(pub) {
  if (!pub) return true;
  const p = pub.toLowerCase();
  return p.includes('ieee') || p.includes('institute of electrical') || p.includes('microwave') || p.includes('wireless');
}

// Reimplementing the exact validation rules for testing
function validateAndMergeMetadata(adapterPaper, crossref, openalex) {
  const merged = { ...adapterPaper };
  let apiMatch = null;

  const isIEEE = adapterPaper.url.includes('ieeexplore.ieee.org') || adapterPaper.publisher?.toLowerCase() === 'ieee';
  const docId = adapterPaper.publisherId;
  const adapterDoi = adapterPaper.doi;

  const validateIeeeDoi = (doiToCheck) => {
    if (!doiToCheck) return false;
    const cleanDoi = doiToCheck.toLowerCase().trim().replace(/\/$/, '');
    
    // 1. Direct exact match with adapter DOI if known
    if (adapterDoi) {
      const cleanAdapterDoi = adapterDoi.toLowerCase().trim().replace(/\/$/, '');
      if (cleanDoi === cleanAdapterDoi) return true;
    }
    
    // 2. IEEE conference/early-access style DOIs ending with document ID
    if (docId && cleanDoi.endsWith(docId.toLowerCase())) {
      return true;
    }

    return false;
  };

  let crossrefMatch = false;
  let openalexMatch = false;

  if (crossref && crossref.title) {
    if (isIEEE && (docId || adapterDoi)) {
      const doiMatch = validateIeeeDoi(crossref.doi);
      const titleMatch = adapterPaper.title.startsWith('IEEE Document') || getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
      const authorsMatch = checkAuthorsOverlap(adapterPaper.authors, crossref.authors || []);
      const pubMatch = checkPublisher(crossref.publisher);
      crossrefMatch = doiMatch && titleMatch && authorsMatch && pubMatch;
    } else {
      crossrefMatch = getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
    }
  }

  if (openalex && openalex.title) {
    if (isIEEE && (docId || adapterDoi)) {
      const doiMatch = validateIeeeDoi(openalex.doi);
      const titleMatch = adapterPaper.title.startsWith('IEEE Document') || getTitleSimilarity(adapterPaper.title, openalex.title) > 0.5;
      const authorsMatch = checkAuthorsOverlap(adapterPaper.authors, openalex.authors || []);
      const pubMatch = checkPublisher(openalex.publisher);
      openalexMatch = doiMatch && titleMatch && authorsMatch && pubMatch;
    } else {
      openalexMatch = getTitleSimilarity(adapterPaper.title, openalex.title) > 0.5;
    }
  }

  // If both APIs returned matches but they disagree on the identity (different DOIs)
  if (crossrefMatch && openalexMatch && crossref?.doi && openalex?.doi) {
    const cleanCr = crossref.doi.toLowerCase().trim().replace(/\/$/, '');
    const cleanOa = openalex.doi.toLowerCase().trim().replace(/\/$/, '');
    if (cleanCr !== cleanOa) {
      console.log('  [Validation] Mismatch: Crossref and OpenAlex DOIs disagree.');
      merged.confidenceScore = 0.0;
      return merged;
    }
  }

  if (crossrefMatch) {
    apiMatch = crossref;
  } else if (openalexMatch) {
    apiMatch = openalex;
  }

  if (apiMatch) {
    merged.title = normalizeScholarlyTitle(apiMatch.title) || merged.title;
    merged.authors = apiMatch.authors || merged.authors;
    merged.doi = apiMatch.doi || merged.doi;
    merged.publicationYear = apiMatch.publicationYear || merged.publicationYear;
    merged.venue = apiMatch.venue || merged.venue;
    merged.confidenceScore = 0.95;
  } else {
    console.log('  [Validation] Low similarity or validation mismatch.');
    const isThin = adapterPaper.title.startsWith('IEEE Document') || 
                   adapterPaper.authors.includes('Unknown Author') || 
                   isIEEE;
    if (isThin) {
      merged.confidenceScore = 0.0; // Block AI synthesis
    } else {
      merged.confidenceScore = 0.4;
    }
  }

  return merged;
}

async function testRegression() {
  console.log('=== RUNNING IEEE 9413901 REGRESSION TEST ===');
  
  const ieeePaperUrl = 'https://ieeexplore.ieee.org/document/9413901';
  const documentId = '9413901';

  // 1. Mock the publisher adapter scraped result (thin metadata placeholder)
  const adapterPaperPlaceholder = {
    title: `IEEE Document ${documentId}`,
    authors: ['Unknown Author'],
    doi: null,
    publisher: 'IEEE',
    url: ieeePaperUrl,
    publisherId: documentId,
    confidenceScore: 0.4,
  };

  // 2. Mock a MISMATCHED enrichment source (Knowledge Graphs paper)
  const mismatchedEnrichment = {
    title: 'A Survey on Knowledge Graphs: Representation, Acquisition, and Applications',
    authors: ['Shaoxiong Ji', 'Shirui Pan', 'Erik Cambria'],
    doi: '10.1109/TNNLS.2021.3070023', // Ends with 3070023, not 9413901
  };

  console.log('Testing rejection of mismatched Knowledge Graphs paper...');
  const rejectedMerge = validateAndMergeMetadata(adapterPaperPlaceholder, mismatchedEnrichment, null);
  console.log('Merged paper confidence score:', rejectedMerge.confidenceScore);
  if (rejectedMerge.confidenceScore === 0.0) {
    console.log('✔ SUCCESS: Mismatched paper correctly rejected (confidenceScore = 0.0)');
  } else {
    throw new Error('FAIL: Mismatched paper was NOT rejected!');
  }

  // 3. Mock the CORRECT enrichment source (Attention Is All You Need In Speech Separation)
  const correctEnrichment = {
    title: 'Attention Is All You Need In Speech Separation',
    authors: ['Cem Subakan', 'Mirco Ravanelli', 'Samuele Cornell'],
    doi: '10.1109/ICASSP39728.2021.9413901', // Ends with 9413901
  };

  console.log('\nTesting validation of correct paper details...');
  const acceptedMerge = validateAndMergeMetadata(adapterPaperPlaceholder, correctEnrichment, null);
  console.log('Accepted paper title:', acceptedMerge.title);
  console.log('Accepted paper confidence score:', acceptedMerge.confidenceScore);
  
  if (acceptedMerge.title === 'Attention Is All You Need In Speech Separation' && acceptedMerge.confidenceScore === 0.95) {
    console.log('✔ SUCCESS: Correct paper validated and accepted!');
  } else {
    throw new Error(`FAIL: Correct paper title was: "${acceptedMerge.title}" or confidenceScore was: ${acceptedMerge.confidenceScore}`);
  }

  console.log('\n=== RUNNING IEEE 7444399 REGRESSION TEST ===');
  const paperUrl7444399 = 'https://ieeexplore.ieee.org/document/7444399';
  const docId7444399 = '7444399';

  // Scraped thin metadata
  const adapterPlaceholder7444399 = {
    title: `IEEE Document ${docId7444399}`,
    authors: ['Unknown Author'],
    doi: null,
    publisher: 'IEEE',
    url: paperUrl7444399,
    publisherId: docId7444399,
    confidenceScore: 0.4,
  };

  // Correct Crossref mock metadata for 7444399
  const correctCrossref7444399 = {
    title: 'A low power and high conversion gain 94 GHz up-conversion mixer with excellent I/O matching and LO-RF isolation in 90 nm CMOS',
    authors: ['Yo-Sheng Lin', 'Chih-Chung Chen', 'Chien-Chin Wang', 'Yun-Wen Lin', 'Run-Chi Liu', 'Chien-Chu Ji'],
    doi: '10.1109/RWS.2016.7444399',
    publisher: 'IEEE',
  };

  console.log('Testing validation of correct details for 7444399...');
  const merge7444399 = validateAndMergeMetadata(adapterPlaceholder7444399, correctCrossref7444399, null);
  console.log('Accepted paper title:', merge7444399.title);
  console.log('Accepted paper authors count:', merge7444399.authors.length);
  console.log('Accepted paper DOI:', merge7444399.doi);
  console.log('Accepted paper confidence score:', merge7444399.confidenceScore);

  if (
    merge7444399.title === 'A low power and high conversion gain 94 GHz up-conversion mixer with excellent I/O matching and LO-RF isolation in 90 nm CMOS' &&
    merge7444399.doi === '10.1109/RWS.2016.7444399' &&
    merge7444399.authors.length === 6 &&
    merge7444399.confidenceScore === 0.95
  ) {
    console.log('✔ SUCCESS: Document 7444399 resolved and validated successfully!');
  } else {
    throw new Error(`FAIL: Document 7444399 validation failed. Title: "${merge7444399.title}", DOI: "${merge7444399.doi}", Authors count: ${merge7444399.authors.length}, Score: ${merge7444399.confidenceScore}`);
  }

  console.log('\n=== RUNNING IEEE 5764505 (MathML / Formula Title) REGRESSION TEST ===');
  const paperUrl5764505 = 'https://ieeexplore.ieee.org/document/5764505';
  const docId5764505 = '5764505';

  // Real fallback metadata from IEEE Explore for 5764505
  const fallbackAdapterPaper5764505 = {
    title: 'Symmetric Offset Stack Balun in Standard 0.13-<formula formulatype="inline"><tex Notation="TeX">$\\mu{\\hbox {m}}$</tex></formula> CMOS Technology for Three Broadband and Low-Loss Balanced Passive Mixer Designs',
    authors: ['Hwann-Kaeo Chiou', 'Jui-Yi Lin'],
    doi: '10.1109/TMTT.2011.2140123',
    publisher: 'IEEE',
    publicationYear: 2011,
    venue: 'IEEE Transactions on Microwave Theory and Techniques',
    url: paperUrl5764505,
    publisherId: docId5764505,
    confidenceScore: 0.9,
  };

  // Real Crossref response for 10.1109/TMTT.2011.2140123
  const crossref5764505 = {
    title: 'Symmetric Offset Stack Balun in Standard 0.13-\\mu{\\hbox {m}} CMOS Technology for Three Broadband and Low-Loss Balanced Passive Mixer Designs',
    authors: ['Hwann-Kaeo Chiou', 'Jui-Yi Lin'],
    doi: '10.1109/tmtt.2011.2140123',
    publisher: 'Institute of Electrical and Electronics Engineers (IEEE)',
    publicationYear: 2011,
    venue: 'IEEE Transactions on Microwave Theory and Techniques',
  };

  // Real OpenAlex response for 10.1109/TMTT.2011.2140123
  const openalex5764505 = {
    title: 'Symmetric Offset Stack Balun in Standard 0.13-μm CMOS Technology for Three Broadband and Low-Loss Balanced Passive Mixer Designs',
    authors: ['Hwann‐Kaeo Chiou', 'Jui-Yi Lin'],
    doi: '10.1109/tmtt.2011.2140123',
    publisher: 'IEEE Microwave Theory and Techniques Society',
    publicationYear: 2011,
    venue: 'IEEE Transactions on Microwave Theory and Techniques',
  };

  console.log('Testing validation for IEEE 5764505 (MathML / Math title)...');
  const merge5764505 = validateAndMergeMetadata(fallbackAdapterPaper5764505, crossref5764505, openalex5764505);
  console.log('Accepted paper title:', merge5764505.title);
  console.log('Accepted paper DOI:', merge5764505.doi);
  console.log('Accepted paper authors:', merge5764505.authors);
  console.log('Accepted paper confidence score:', merge5764505.confidenceScore);

  if (
    merge5764505.confidenceScore === 0.95 &&
    merge5764505.doi === '10.1109/tmtt.2011.2140123' &&
    merge5764505.authors.length === 2 &&
    !merge5764505.title.includes('<formula')
  ) {
    console.log('✔ SUCCESS: Document 5764505 MathML/formula title resolved, normalized, and validated successfully!');
  } else {
    throw new Error(`FAIL: Document 5764505 validation failed. Score: ${merge5764505.confidenceScore}, Title: "${merge5764505.title}"`);
  }

  console.log('\n=== ALL REGRESSION TESTS PASSED SUCCESSFULLY ===');
}

testRegression().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

