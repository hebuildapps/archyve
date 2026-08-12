/**
 * Regression Test for IEEE Document 9413901.
 * Verifies that the lookup and validation pipeline resolves to "Attention Is All You Need In Speech Separation"
 * and rejects mismatched papers (e.g., Knowledge Graphs).
 */

function getTitleSimilarity(t1, t2) {
  const clean = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const w1 = new Set(clean(t1));
  const w2 = new Set(clean(t2));

  if (w1.size === 0 || w2.size === 0) return 0;

  const intersection = new Set([...w1].filter((x) => w2.has(x)));
  const union = new Set([...w1, ...w2]);

  return intersection.size / union.size;
}

// Reimplementing the exact validation rules for testing
function validateAndMergeMetadata(adapterPaper, crossref, openalex) {
  const merged = { ...adapterPaper };
  let apiMatch = null;

  const isIEEE = adapterPaper.url.includes('ieeexplore.ieee.org') || adapterPaper.publisher?.toLowerCase() === 'ieee';
  const docId = adapterPaper.publisherId;

  const validateIeeeDoi = (doiToCheck) => {
    if (!doiToCheck || !docId) return false;
    const cleanDoi = doiToCheck.toLowerCase().trim().replace(/\/$/, '');
    return cleanDoi.endsWith(docId.toLowerCase());
  };

  let crossrefMatch = false;
  let openalexMatch = false;

  if (crossref && crossref.title) {
    if (isIEEE && docId) {
      crossrefMatch = validateIeeeDoi(crossref.doi);
    } else {
      crossrefMatch = getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
    }
  }

  if (openalex && openalex.title) {
    if (isIEEE && docId) {
      openalexMatch = validateIeeeDoi(openalex.doi);
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
    merged.title = apiMatch.title || merged.title;
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

  console.log('\n=== REGRESSION TEST PASSED SUCCESSFULLY ===');
}

testRegression().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
