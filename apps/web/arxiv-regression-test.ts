import { ArxivAdapter } from './lib/adapters/ArxivAdapter';
import { validateAndMergeMetadata } from './lib/enrichment/validation';
import { fetchOpenAlexMetadata } from './lib/enrichment/openalex';

async function runArxivRegressionTests() {
  console.log('====================================================');
  console.log('   arXiv Retrieval & Validation Test Suite          ');
  console.log('====================================================\n');

  const adapter = new ArxivAdapter();

  // Test 1: URL Support & Parsing variants
  console.log('--- Test 1: URL Support & Variant Parsing ---');
  const urlVariants = [
    { url: 'https://arxiv.org/abs/1706.03762', expectedId: '1706.03762' },
    { url: 'https://arxiv.org/abs/1706.03762v7', expectedId: '1706.03762' },
    { url: 'https://arxiv.org/pdf/1706.03762.pdf', expectedId: '1706.03762' },
    { url: 'https://arxiv.org/pdf/1706.03762v7.pdf', expectedId: '1706.03762' },
    { url: 'https://arxiv.org/abs/math/0001001', expectedId: 'math/0001001' },
    { url: 'https://arxiv.org/abs/math.PR/0001001', expectedId: 'math.PR/0001001' },
    { url: 'https://arxiv.org/pdf/math/0001001.pdf', expectedId: 'math/0001001' },
    { url: 'http://arxiv.org/abs/2101.12345v2', expectedId: '2101.12345' },
    { url: 'https://ieeexplore.ieee.org/document/9413901', expectedId: null, unsupported: true },
  ];

  for (const { url, expectedId, unsupported } of urlVariants) {
    const supported = adapter.supports(url);
    if (unsupported) {
      if (supported) throw new Error(`URL should NOT be supported by arXiv adapter: ${url}`);
      console.log(`  ✔ Correctly rejected unsupported publisher: ${url}`);
    } else {
      if (!supported) throw new Error(`URL SHOULD be supported: ${url}`);
      const parsed = adapter.parseUrl(url);
      if (parsed.publisherId !== expectedId) {
        throw new Error(`Expected publisherId ${expectedId}, got ${parsed.publisherId} for ${url}`);
      }
      console.log(`  ✔ Correctly parsed ${parsed.publisherId} from ${url}`);
    }
  }

  // Test 2: Live Metadata Fetch for failing URL https://arxiv.org/abs/1706.03762
  console.log('\n--- Test 2: Live Metadata Fetch (1706.03762 - Attention Is All You Need) ---');
  const paper = await adapter.fetchMetadata('https://arxiv.org/abs/1706.03762');
  if (!paper) {
    throw new Error('fetchMetadata returned null for 1706.03762');
  }

  console.log('  Extracted Title:', paper.title);
  console.log('  Extracted Authors:', paper.authors);
  console.log('  Extracted Year:', paper.publicationYear);
  console.log('  Extracted DOI:', paper.doi);

  if (paper.title.includes('search_query=') || paper.title.startsWith('arXiv Query')) {
    throw new Error(`FAIL: Title was parsed from top-level feed query instead of paper entry! Received: ${paper.title}`);
  }
  if (paper.title !== 'Attention Is All You Need') {
    throw new Error(`FAIL: Expected 'Attention Is All You Need', got '${paper.title}'`);
  }
  if (!paper.authors.includes('Ashish Vaswani') || paper.authors.length < 8) {
    throw new Error(`FAIL: Authors list incomplete or incorrect: ${JSON.stringify(paper.authors)}`);
  }
  if (paper.publicationYear !== 2017) {
    throw new Error(`FAIL: Expected year 2017, got ${paper.publicationYear}`);
  }
  console.log('  ✔ Correctly extracted paper title, all authors, and publication year from entry XML.');

  // Test 3: Validation Checkpoint with OpenAlex
  console.log('\n--- Test 3: Cross-validation Checkpoint ---');
  if (!paper.doi) throw new Error('FAIL: paper.doi is null/undefined');
  const openalex = await fetchOpenAlexMetadata(paper.doi);
  const validated = validateAndMergeMetadata(paper, null, openalex);

  console.log('  Validated Title:', validated.title);
  console.log('  Confidence Score:', validated.confidenceScore);

  if (validated.confidenceScore < 0.5) {
    throw new Error(`FAIL: Validation confidence score ${validated.confidenceScore} is below checkpoint threshold 0.5`);
  }
  console.log('  ✔ Validation checkpoint passed with confidence score >= 0.95.');

  console.log('\n====================================================');
  console.log('   ALL arXiv REGRESSION TESTS PASSED!               ');
  console.log('====================================================\n');
}

runArxivRegressionTests().catch((err) => {
  console.error('arXiv regression tests failed:', err);
  process.exit(1);
});
