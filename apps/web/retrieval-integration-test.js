/**
 * Integration Test for Research Retrieval Layer.
 * Queries actual OpenAlex and GitHub APIs live to verify real retrieval.
 */

const { fetchRelatedPapers } = require('./lib/enrichment/related');
const { searchGithubImplementations } = require('./lib/enrichment/github');

const paper = {
  title: "A low power and high conversion gain 94 GHz up-conversion mixer with excellent I/O matching and LO-RF isolation in 90 nm CMOS",
  doi: "10.1109/RWS.2016.7444399",
  authors: ["Yo-Sheng Lin", "Chih-Chung Chen", "Chien-Chin Wang", "Yun-Wen Lin", "Run-Chi Liu", "Chien-Chu Ji"]
};

async function runIntegrationTests() {
  console.log('=== RUNNING REAL API-BACKED RETRIEVAL INTEGRATION TESTS ===');

  // 1. Test live related papers retrieval for IEEE 7444399 via OpenAlex
  console.log('\n[Integration] Fetching live related papers for IEEE 7444399 (10.1109/RWS.2016.7444399)...');
  const related = await fetchRelatedPapers(paper.title, paper.doi, paper.authors);
  console.log(`[Integration] Found ${related.length} verified related papers:`);
  console.log(JSON.stringify(related, null, 2));

  if (related.length === 0) {
    throw new Error('FAIL: Live OpenAlex related papers retrieval returned 0 results.');
  }

  // Verify that all returned related papers have real authors, title, publicationYear, and DOI/URL
  for (const p of related) {
    if (!p.title || !p.authors || p.authors.length === 0 || !p.url) {
      throw new Error(`FAIL: Retrieved related paper record is missing required fields: ${JSON.stringify(p)}`);
    }
    // Verify it is not the exact same target paper itself
    if (p.doi === paper.doi || p.title.toLowerCase().includes("a low power and high conversion gain 94 ghz up-conversion mixer with excellent")) {
      throw new Error(`FAIL: Target paper itself was returned as a related paper: ${p.title}`);
    }
  }
  console.log('✔ SUCCESS: Live related papers fetched and verified against target schema.');

  // 2. Test live GitHub implementations search for "Attention Is All You Need" (should find repos)
  console.log('\n[Integration] Querying live GitHub repositories for "Attention Is All You Need"...');
  const attentionRepos = await searchGithubImplementations("Attention Is All You Need");
  console.log(`[Integration] Found ${attentionRepos.length} verified repositories:`);
  console.log(JSON.stringify(attentionRepos, null, 2));

  if (attentionRepos.length === 0) {
    throw new Error('FAIL: Live GitHub search for "Attention Is All You Need" returned 0 repositories.');
  }

  // Verify all returned repos are verified GitHub repos
  for (const repo of attentionRepos) {
    if (!repo.name || !repo.url || !repo.url.startsWith('https://github.com/') || repo.stars === undefined) {
      throw new Error(`FAIL: Invalid GitHub repository structure: ${JSON.stringify(repo)}`);
    }
  }
  console.log('✔ SUCCESS: Verified GitHub repositories retrieved successfully.');

  // 3. Test live GitHub implementations search for the microwave mixer paper (should find nothing)
  console.log('\n[Integration] Querying live GitHub repositories for the 94 GHz Mixer paper (should be empty)...');
  const mixerRepos = await searchGithubImplementations(paper.title);
  console.log(`[Integration] Found ${mixerRepos.length} verified repositories.`);

  if (mixerRepos.length !== 0) {
    throw new Error(`FAIL: Found ${mixerRepos.length} repositories for a hardware mixer paper that has no GitHub implementation! Repos: ${JSON.stringify(mixerRepos)}`);
  }
  console.log('✔ SUCCESS: Non-existent code implementation correctly returned an empty array.');

  console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESS ===');
}

runIntegrationTests().catch(err => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
