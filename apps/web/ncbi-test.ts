import { PubMedAdapter } from './lib/adapters/PubMedAdapter';
import { ncbiClient } from './lib/ncbi';


async function runNcbiTests() {
  console.log('====================================================');
  console.log('   NCBI / PubMed Integration Test Suite             ');
  console.log('====================================================\n');

  const adapter = new PubMedAdapter();

  // Test 1: URL Support Detection
  console.log('--- Test 1: URL Support & Parsing ---');
  const testUrls = [
    { url: 'https://pubmed.ncbi.nlm.nih.gov/42492356/', expectedId: '42492356', type: 'pmid' },
    { url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13305826/', expectedId: 'PMC13305826', type: 'pmcid' },
    { url: 'https://www.ncbi.nlm.nih.gov/pubmed/25000000', expectedId: '25000000', type: 'pmid' },
    { url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13305826/', expectedId: 'PMC13305826', type: 'pmcid' },
    { url: 'https://ieeexplore.ieee.org/document/9413901', expectedId: null, type: 'unsupported' },
  ];

  for (const { url, expectedId, type } of testUrls) {
    const supported = adapter.supports(url);
    if (type === 'unsupported') {
      if (supported) throw new Error(`URL should NOT be supported: ${url}`);
      console.log(`  ✔ Correctly rejected unsupported URL: ${url}`);
    } else {
      if (!supported) throw new Error(`URL SHOULD be supported: ${url}`);
      const parsed = adapter.parseUrl(url);
      if (parsed.publisherId !== expectedId) {
        throw new Error(`Expected publisherId ${expectedId}, got ${parsed.publisherId} for ${url}`);
      }
      console.log(`  ✔ Correctly parsed ${type} ${parsed.publisherId} from ${url}`);
    }
  }

  // Test 2: Live Fetch PubMed Record (PMID: 42492356)
  console.log('\n--- Test 2: Fetch PubMed Record (PMID: 42492356) ---');
  const pmidUrl = 'https://pubmed.ncbi.nlm.nih.gov/42492356/';
  const paper1 = await adapter.fetchMetadata(pmidUrl, (status, pct) => {
    console.log(`    [Progress ${pct}%]: ${status}`);
  });

  if (!paper1) throw new Error('Failed to fetch paper for PMID 42492356');
  console.log('  Resulting Title:', paper1.title);
  console.log('  Authors count:', paper1.authors.length, '(e.g.', paper1.authors.slice(0, 3), ')');
  console.log('  DOI:', paper1.doi);
  console.log('  Publisher/Journal:', paper1.publisher);
  console.log('  Publication Year:', paper1.publicationYear);
  console.log('  Abstract sample:', paper1.abstract ? paper1.abstract.slice(0, 100) + '...' : null);
  console.log('  Confidence Score:', paper1.confidenceScore);

  if (!paper1.title.toLowerCase().includes('psma-mediated')) {
    throw new Error('Title does not match expected paper title');
  }
  if (!paper1.doi?.includes('10.1016/j.biomaterials.2026.124476')) {
    throw new Error(`Expected DOI 10.1016/j.biomaterials.2026.124476, got ${paper1.doi}`);
  }
  if (!paper1.authors || paper1.authors.length < 5) {
    throw new Error('Expected multiple authors');
  }
  if (!paper1.abstract || paper1.abstract.length < 50) {
    throw new Error('Expected full abstract');
  }
  if (paper1.publisher !== 'PubMed') {
    throw new Error(`Expected publisher PubMed, got ${paper1.publisher}`);
  }
  console.log('  ✔ PubMed Record 42492356 fetched and normalized successfully!');


  // Test 3: Live Fetch PMC Record (PMC: PMC13305826)
  console.log('\n--- Test 3: Fetch PMC Record (PMCID: PMC13305826) ---');
  const pmcUrl = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13305826/';
  const paper2 = await adapter.fetchMetadata(pmcUrl, (status, pct) => {
    console.log(`    [Progress ${pct}%]: ${status}`);
  });

  if (!paper2) throw new Error('Failed to fetch paper for PMCID PMC13305826');
  console.log('  Resulting Title:', paper2.title);
  console.log('  Authors count:', paper2.authors.length, '(e.g.', paper2.authors, ')');
  console.log('  DOI:', paper2.doi);
  console.log('  Publisher/Journal:', paper2.publisher);
  console.log('  Publication Year:', paper2.publicationYear);
  console.log('  Abstract sample:', paper2.abstract ? paper2.abstract.slice(0, 100) + '...' : null);
  console.log('  Confidence Score:', paper2.confidenceScore);

  if (!paper2.title.toLowerCase().includes('anxiety disorders in the elderly')) {
    throw new Error('PMC Paper Title does not match expected title');
  }
  if (paper2.doi !== '10.3390/ph19060891') {
    throw new Error(`Expected DOI 10.3390/ph19060891, got ${paper2.doi}`);
  }
  if (paper2.publisher !== 'PubMed Central') {
    throw new Error(`Expected publisher PubMed Central, got ${paper2.publisher}`);
  }
  console.log('  ✔ PMC Record PMC13305826 fetched and normalized successfully!');


  // Test 4: ELink verification (PubMed to PMC link detection)
  console.log('\n--- Test 4: Verify ELink PubMed -> PMC ---');
  const pmcResolved = await ncbiClient.getPMCIdForPMID('42356510');
  console.log('  PMID 42356510 -> PMC:', pmcResolved);
  if (pmcResolved !== 'PMC13305826') {
    throw new Error(`Expected PMC13305826, got ${pmcResolved}`);
  }
  console.log('  ✔ ELink correctly discovered PMC ID from PMID!');

  // Test 5: Edge Case - Paper with no abstract, no PMCID (PMID: 100)
  console.log('\n--- Test 5: Edge case handling (PMID 100: no abstract / no PMCID) ---');
  const edgeRecord = await ncbiClient.fetchPubMedRecord('100');
  if (!edgeRecord) throw new Error('Failed to fetch PMID 100');
  console.log('  Title:', edgeRecord.title);
  console.log('  Abstract:', edgeRecord.abstract);
  console.log('  PMCID:', edgeRecord.pmcid);
  if (edgeRecord.abstract !== null && edgeRecord.abstract !== undefined) {
    throw new Error('Expected null abstract for PMID 100');
  }
  console.log('  ✔ Handled missing abstract gracefully without errors!');

  console.log('\n====================================================');
  console.log('   ALL NCBI / PUBMED TESTS PASSED SUCCESSFULLY!     ');
  console.log('====================================================');
}

runNcbiTests().catch((err) => {
  console.error('\n❌ NCBI TEST FAILED:', err);
  process.exit(1);
});
