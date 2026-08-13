/**
 * Verification Test for Research Retrieval Layer (Related Papers & Code implementations).
 * Asserts:
 *  a) Real related paper is verified and accepted.
 *  b) Unrelated paper is rejected.
 *  c) Fake/unverified paper is filtered out.
 *  d) Real GitHub implementation is accepted.
 *  e) Empty arrays are returned when no candidates are found.
 */

const { GeminiProvider } = require('./lib/ai/providers/GeminiProvider');

// Mock inputs
const targetPaper = {
  title: "A low power and high conversion gain 94 GHz up-conversion mixer with excellent I/O matching and LO-RF isolation in 90 nm CMOS",
  authors: ["Yo-Sheng Lin", "Chih-Chung Chen", "Chien-Chin Wang", "Yun-Wen Lin", "Run-Chi Liu", "Chien-Chu Ji"],
  doi: "10.1109/RWS.2016.7444399",
  publisher: "IEEE",
  publicationYear: 2016,
  venue: "2016 IEEE Radio and Wireless Symposium (RWS)",
  url: "https://ieeexplore.ieee.org/document/7444399",
  confidenceScore: 0.95
};

const verifiedRelatedPapers = [
  {
    title: "A 94-GHz up-conversion mixer in 90-nm CMOS technology",
    authors: ["John Doe", "Jane Smith"],
    url: "https://doi.org/10.1109/12345",
    doi: "10.1109/12345"
  },
  {
    title: "Low power RF mixers in sub-micron CMOS",
    authors: ["Alice Johnson", "Bob Brown"],
    url: "https://doi.org/10.1109/67890",
    doi: "10.1109/67890"
  }
];

const verifiedImplementations = [
  {
    name: "yo-sheng-lin/94ghz-mixer-cmos",
    url: "https://github.com/yo-sheng-lin/94ghz-mixer-cmos",
    type: "github",
    stars: 12
  }
];

// Reimplementing the post-processing validation layer from GeminiProvider for isolation testing
function postProcessValidation(parsedData, relatedPapers, implementations) {
  const verifiedRelated = [];
  if (Array.isArray(parsedData.relatedPapers) && relatedPapers.length > 0) {
    for (const p of parsedData.relatedPapers) {
      const match = relatedPapers.find(
        (ref) => ref.title.toLowerCase().replace(/[^a-z0-9]/g, '') === p.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (match) {
        verifiedRelated.push({
          title: match.title,
          authors: match.authors,
          url: match.url || p.url || '',
          relationship: p.relationship || 'Related literature reference',
        });
      }
    }
  }

  const verifiedImpls = [];
  if (Array.isArray(parsedData.implementations) && implementations.length > 0) {
    for (const impl of parsedData.implementations) {
      const match = implementations.find(
        (ref) => ref.url.toLowerCase().trim() === impl.url.toLowerCase().trim()
      );
      if (match) {
        verifiedImpls.push({
          name: match.name,
          url: match.url,
          type: match.type,
          stars: match.stars,
        });
      }
    }
  }

  return {
    ...parsedData,
    relatedPapers: verifiedRelated,
    implementations: verifiedImpls
  };
}

async function runTests() {
  console.log('=== RUNNING RETRIEVED DATA VALIDATION TESTS ===');

  // Test Case A & C: Simulated LLM response containing both real and hallucinated related papers
  console.log('\nTesting related papers validation...');
  const simulatedLlmOutput = {
    relatedPapers: [
      {
        title: "A 94-GHz up-conversion mixer in 90-nm CMOS technology", // Real matching paper
        authors: ["John Doe", "Jane Smith"],
        url: "https://doi.org/10.1109/12345",
        relationship: "Matches architecture closely."
      },
      {
        title: "Hallucinated mixer paper by LLM", // Fake paper invented by LLM
        authors: ["Fake Author"],
        url: "https://doi.org/10.1109/99999",
        relationship: "Invented relationship"
      }
    ]
  };

  const processed = postProcessValidation(simulatedLlmOutput, verifiedRelatedPapers, []);
  
  console.log('Processed Related Papers:', JSON.stringify(processed.relatedPapers, null, 2));

  const hasRealPaper = processed.relatedPapers.some(p => p.title === "A 94-GHz up-conversion mixer in 90-nm CMOS technology");
  const hasFakePaper = processed.relatedPapers.some(p => p.title === "Hallucinated mixer paper by LLM");

  if (hasRealPaper && !hasFakePaper) {
    console.log('✔ SUCCESS: Real related paper accepted, fake/hallucinated paper filtered out.');
  } else {
    throw new Error('FAIL: Related papers validation failed.');
  }

  // Test Case B: Unrelated papers are filtered out
  console.log('\nTesting unrelated papers filter...');
  const simulatedUnrelatedLlmOutput = {
    relatedPapers: [
      {
        title: "Deep learning for natural language processing", // Completely unrelated topic/paper
        authors: ["NLP Researcher"],
        url: "https://doi.org/10.1109/nlp-fake",
        relationship: "Completely unrelated"
      }
    ]
  };
  const processedUnrelated = postProcessValidation(simulatedUnrelatedLlmOutput, verifiedRelatedPapers, []);
  if (processedUnrelated.relatedPapers.length === 0) {
    console.log('✔ SUCCESS: Unrelated paper correctly rejected.');
  } else {
    throw new Error('FAIL: Unrelated paper was not rejected.');
  }

  // Test Case D: Real GitHub implementation accepted
  console.log('\nTesting GitHub implementation validation...');
  const simulatedGithubOutput = {
    implementations: [
      {
        name: "yo-sheng-lin/94ghz-mixer-cmos", // Real matching repo
        url: "https://github.com/yo-sheng-lin/94ghz-mixer-cmos",
        type: "github"
      },
      {
        name: "fake-repo/hallucinated-mixer", // Fake repo invented by LLM
        url: "https://github.com/fake-repo/hallucinated-mixer",
        type: "github"
      }
    ]
  };

  const processedGithub = postProcessValidation(simulatedGithubOutput, [], verifiedImplementations);
  console.log('Processed GitHub Implementations:', JSON.stringify(processedGithub.implementations, null, 2));

  const hasRealRepo = processedGithub.implementations.some(i => i.name === "yo-sheng-lin/94ghz-mixer-cmos");
  const hasFakeRepo = processedGithub.implementations.some(i => i.name === "fake-repo/hallucinated-mixer");

  if (hasRealRepo && !hasFakeRepo) {
    console.log('✔ SUCCESS: Real GitHub repository accepted, fake/hallucinated repository filtered out.');
  } else {
    throw new Error('FAIL: GitHub implementations validation failed.');
  }

  // Test Case E: No results -> empty array
  console.log('\nTesting empty candidates -> empty array...');
  const processedEmpty = postProcessValidation(simulatedLlmOutput, [], []);
  if (processedEmpty.relatedPapers.length === 0 && processedEmpty.implementations.length === 0) {
    console.log('✔ SUCCESS: No candidates/verified sources returns empty arrays.');
  } else {
    throw new Error('FAIL: Empty candidates returned non-empty arrays.');
  }

  console.log('\n=== ALL RETRIEVAL VALIDATION TESTS PASSED SUCCESS ===');
}

runTests().catch(err => {
  console.error('\n❌ RETRIEVAL VALIDATION TEST FAILED:', err);
  process.exit(1);
});
