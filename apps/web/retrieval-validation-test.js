/**
 * Unit Test for Research Retrieval Layer (Related Papers & Code implementations).
 * Uses static mocked fixtures to test relationship relevance validation in isolation.
 */

const targetPaper = {
  title: "A low power and high conversion gain 94 GHz up-conversion mixer with excellent I/O matching and LO-RF isolation in 90 nm CMOS",
  doi: "10.1109/RWS.2016.7444399",
  authors: ["Yo-Sheng Lin"]
};

// Re-implement Jaccard and Technical overlap validation from related.ts for isolated unit test
function getTitleSimilarity(t1, t2) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const w1 = new Set(clean(t1));
  const w2 = new Set(clean(t2));
  if (w1.size === 0 || w2.size === 0) return 0;
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  return intersection.size / union.size;
}

function getTechnicalKeywords(title) {
  const stopWords = new Set([
    'with', 'from', 'that', 'this', 'their', 'using', 'design', 'high', 'low', 'power', 
    'novel', 'excellent', 'mixer', 'mixer', 'based', 'performance', 'mode', 'matching'
  ]);
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(word => word.length > 3 && !stopWords.has(word));
}

function validateCandidatePaper(candidate, target) {
  if (!candidate.title || !candidate.authors || candidate.authors.length === 0 || !candidate.url) {
    return { valid: false, reason: 'missing metadata (fake/unverifiable)' };
  }

  const similarity = getTitleSimilarity(target.title, candidate.title);
  if (similarity > 0.9) {
    return { valid: false, reason: 'duplicate of target' };
  }

  if (candidate.source === 'related_works') {
    return { valid: true, relationship: 'Related work via scholarly citation graph' };
  }

  // Search fallback relevance validation
  const targetKeywords = getTechnicalKeywords(target.title);
  const candidateKeywords = getTechnicalKeywords(candidate.title);
  const overlap = targetKeywords.filter(k => candidateKeywords.includes(k));

  if (overlap.length < 2 && similarity < 0.15) {
    return { valid: false, reason: 'weak/unrelated match (loose search)' };
  }

  return { valid: true, relationship: `Related literature matching technical terms: ${overlap.join(', ')}` };
}

function runUnitTests() {
  console.log('=== RUNNING RELATED PAPER RELEVANCE UNIT TESTS ===');

  // 1. Real + Related -> Accepted
  console.log('\nTesting Real + Related candidate (should be accepted):');
  const relatedCandidate = {
    title: "A 94-GHz up-conversion mixer in 90-nm CMOS technology", // shares "94-ghz", "up-conversion", "cmos"
    authors: ["John Doe"],
    url: "https://doi.org/10.1109/12345",
    source: "search_fallback"
  };
  const res1 = validateCandidatePaper(relatedCandidate, targetPaper);
  console.log('Result:', res1);
  if (res1.valid) {
    console.log('✔ SUCCESS: Real + Related paper accepted.');
  } else {
    throw new Error('FAIL: Real + Related paper rejected.');
  }

  // 2. Real + Weak/Unrelated -> Rejected
  console.log('\nTesting Real + Weak/Unrelated candidate (should be rejected):');
  const weakCandidate = {
    title: "Introduction to CMOS VLSI Design systems", // CMOS matches but lacks mixer/94ghz topic overlap
    authors: ["Jane VLSI"],
    url: "https://doi.org/10.1109/54321",
    source: "search_fallback"
  };
  const res2 = validateCandidatePaper(weakCandidate, targetPaper);
  console.log('Result:', res2);
  if (!res2.valid && res2.reason.includes('weak/unrelated')) {
    console.log('✔ SUCCESS: Real + Weak/Unrelated paper rejected.');
  } else {
    throw new Error('FAIL: Real + Weak/Unrelated paper accepted.');
  }

  // 3. Fake/Unverifiable -> Rejected
  console.log('\nTesting Fake/Unverifiable candidate (should be rejected):');
  const fakeCandidate = {
    title: "Plausible sounding paper that lacks DOI and authors",
    authors: [],
    url: null,
    source: "search_fallback"
  };
  const res3 = validateCandidatePaper(fakeCandidate, targetPaper);
  console.log('Result:', res3);
  if (!res3.valid && res3.reason.includes('missing metadata')) {
    console.log('✔ SUCCESS: Fake/unverifiable paper rejected.');
  } else {
    throw new Error('FAIL: Fake/unverifiable paper accepted.');
  }

  console.log('\n=== ALL RELEVANCE UNIT TESTS PASSED SUCCESS ===');
}

runUnitTests();
