import {
  adapters,
  getAdapterForUrl,
  ArxivAdapter,
  IEEEAdapter,
  PubMedAdapter,
  SpringerAdapter,
  ElsevierAdapter,
  JSTORAdapter,
} from './lib/adapters';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runAdapterSuite() {
  console.log('====================================================');
  console.log('   All Adapters Comprehensive Unit & Contract Suite  ');
  console.log('====================================================\n');

  // 1. Registry & Router Tests (getAdapterForUrl)
  console.log('--- Test 1: Adapter Registry & Dynamic Routing ---');
  assert(adapters.length === 6, `Expected 6 registered adapters, found ${adapters.length}`);

  const routingCases = [
    { url: 'https://arxiv.org/abs/1706.03762', expectedName: 'arxiv' },
    { url: 'https://ieeexplore.ieee.org/document/9413901', expectedName: 'ieee' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/42492356/', expectedName: 'pubmed' },
    { url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13305826/', expectedName: 'pubmed' },
    { url: 'https://link.springer.com/article/10.1007/s10462-023-10444-6', expectedName: 'springer' },
    { url: 'https://www.sciencedirect.com/science/article/pii/S000437022200055X', expectedName: 'elsevier' },
    { url: 'https://www.jstor.org/stable/2570088', expectedName: 'jstor' },
    { url: 'https://example.com/unsupported-paper', expectedName: null },
  ];

  for (const { url, expectedName } of routingCases) {
    const adapter = getAdapterForUrl(url);
    if (expectedName === null) {
      assert(adapter === null, `Expected null adapter for ${url}, got ${adapter?.name}`);
      console.log(`  ✔ Correctly returned null for unsupported URL: ${url}`);
    } else {
      assert(adapter !== null, `Expected adapter ${expectedName} for ${url}, got null`);
      assert(adapter?.name === expectedName, `Expected ${expectedName}, got ${adapter?.name} for ${url}`);
      console.log(`  ✔ Correctly routed ${url} -> ${adapter?.name}`);
    }
  }

  // 2. Springer Adapter Contract
  console.log('\n--- Test 2: Springer Adapter (supports & parseUrl) ---');
  const springer = new SpringerAdapter();
  assert(springer.supports('https://link.springer.com/article/10.1007/s10462-023-10444-6'), 'Supports Springer article');
  assert(springer.supports('https://link.springer.com/chapter/10.1007/978-3-031-25069-9_1'), 'Supports Springer chapter');
  assert(springer.supports('https://link.springer.com/referenceworkentry/10.1007/978-1-4419-1428-6_1850'), 'Supports reference work');
  assert(!springer.supports('https://link.springer.com/search?query=ai'), 'Rejects non-content search page');
  assert(!springer.supports('https://arxiv.org/abs/1706.03762'), 'Rejects non-Springer host');

  const springerParsedArticle = springer.parseUrl('https://link.springer.com/article/10.1007/s10462-023-10444-6');
  assert(springerParsedArticle.doi === '10.1007/s10462-023-10444-6', `Parsed Springer DOI: ${springerParsedArticle.doi}`);
  assert(springerParsedArticle.publisherId === '10.1007_s10462-023-10444-6', `Parsed Springer publisherId: ${springerParsedArticle.publisherId}`);

  const springerParsedChapter = springer.parseUrl('https://link.springer.com/chapter/10.1007/978-3-031-25069-9_1');
  assert(springerParsedChapter.doi === '10.1007/978-3-031-25069-9_1', `Parsed Springer chapter DOI: ${springerParsedChapter.doi}`);
  console.log('  ✔ Springer URL parser and support checks passed.');

  // 3. Elsevier Adapter Contract
  console.log('\n--- Test 3: Elsevier Adapter (supports & parseUrl) ---');
  const elsevier = new ElsevierAdapter();
  assert(elsevier.supports('https://www.sciencedirect.com/science/article/pii/S000437022200055X'), 'Supports ScienceDirect PII');
  assert(elsevier.supports('https://sciencedirect.com/science/article/pii/S0167642323000123?via=ihub'), 'Supports ScienceDirect with query');
  assert(!elsevier.supports('https://www.sciencedirect.com/browse/journals-and-books'), 'Rejects browse URL');
  assert(!elsevier.supports('https://ieeexplore.ieee.org/document/9413901'), 'Rejects IEEE URL');

  const elsevierParsed = elsevier.parseUrl('https://www.sciencedirect.com/science/article/pii/S000437022200055X?via=ihub');
  assert(elsevierParsed.publisherId === 'S000437022200055X', `Parsed Elsevier PII: ${elsevierParsed.publisherId}`);
  assert(elsevierParsed.doi === null, 'Elsevier URL path has null DOI');
  console.log('  ✔ Elsevier URL parser and support checks passed.');

  // 4. JSTOR Adapter Contract
  console.log('\n--- Test 4: JSTOR Adapter (supports & parseUrl) ---');
  const jstor = new JSTORAdapter();
  assert(jstor.supports('https://www.jstor.org/stable/2570088'), 'Supports JSTOR numeric stable');
  assert(jstor.supports('https://jstor.org/stable/10.2307/j.ctt1bmzmm9'), 'Supports JSTOR DOI stable');
  assert(!jstor.supports('https://www.jstor.org/action/showPreferences'), 'Rejects JSTOR settings page');
  assert(!jstor.supports('https://pubmed.ncbi.nlm.nih.gov/42492356/'), 'Rejects PubMed URL');

  const jstorNumeric = jstor.parseUrl('https://www.jstor.org/stable/2570088');
  assert(jstorNumeric.publisherId === '2570088', `Parsed numeric JSTOR ID: ${jstorNumeric.publisherId}`);
  assert(jstorNumeric.doi === null, 'Numeric stable has null DOI from path');

  const jstorDoi = jstor.parseUrl('https://www.jstor.org/stable/10.2307/j.ctt1bmzmm9');
  assert(jstorDoi.publisherId === '10.2307/j.ctt1bmzmm9', `Parsed JSTOR DOI ID: ${jstorDoi.publisherId}`);
  assert(jstorDoi.doi === '10.2307/j.ctt1bmzmm9', `Extracted DOI: ${jstorDoi.doi}`);
  console.log('  ✔ JSTOR URL parser and support checks passed.');

  // 5. arXiv and PubMed sanity check
  console.log('\n--- Test 5: Arxiv & PubMed Contract Sanity ---');
  const arxiv = new ArxivAdapter();
  assert(arxiv.supports('https://arxiv.org/abs/2301.00001'), 'Supports modern arXiv');
  assert(arxiv.supports('https://arxiv.org/abs/math/0001001'), 'Supports classic arXiv');
  const parsedArxiv = arxiv.parseUrl('https://arxiv.org/abs/2301.00001v2');
  assert(parsedArxiv.publisherId === '2301.00001', 'arXiv v-strip');
  assert(parsedArxiv.doi === '10.48550/arXiv.2301.00001', 'arXiv DOI generation');

  const pubmed = new PubMedAdapter();
  assert(pubmed.supports('https://pubmed.ncbi.nlm.nih.gov/12345/'), 'Supports PubMed');
  assert(pubmed.supports('https://pmc.ncbi.nlm.nih.gov/articles/PMC9876543/'), 'Supports PMC');
  assert(pubmed.parseUrl('https://pubmed.ncbi.nlm.nih.gov/12345/').publisherId === '12345', 'PubMed PMID extraction');
  assert(pubmed.parseUrl('https://pmc.ncbi.nlm.nih.gov/articles/PMC9876543/').publisherId === 'PMC9876543', 'PMC PMCID extraction');
  console.log('  ✔ arXiv and PubMed contracts confirmed.');

  // 6. IEEE Adapter Contract Sanity
  console.log('\n--- Test 6: IEEE Adapter Contract Sanity ---');
  const ieee = new IEEEAdapter();
  assert(ieee.supports('https://ieeexplore.ieee.org/document/9413901'), 'Supports IEEE document');
  assert(ieee.parseUrl('https://ieeexplore.ieee.org/document/9413901').publisherId === '9413901', 'IEEE ID extraction');
  console.log('  ✔ IEEE contract confirmed.');

  console.log('\n====================================================');
  console.log('   ALL 6 ADAPTER CONTRACT CHECKS PASSED!            ');
  console.log('====================================================\n');
}

runAdapterSuite().catch((err) => {
  console.error('\n❌ ADAPTER SUITE TEST FAILED:', err);
  process.exit(1);
});
