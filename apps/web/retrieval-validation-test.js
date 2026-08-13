/**
 * Unit Test for Research Retrieval Layer (Related Papers & Code implementations).
 * Uses static mocked fixtures to test verification logic and validation filtering in isolation.
 */

// Simulated post-processing validation layer from GeminiProvider/GroqProvider
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

const mockRelatedPapers = [
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

const mockImplementations = [
  {
    name: "yo-sheng-lin/94ghz-mixer-cmos",
    url: "https://github.com/yo-sheng-lin/94ghz-mixer-cmos",
    type: "github",
    stars: 12
  }
];

function runUnitTests() {
  console.log('=== RUNNING RETRIEVED DATA UNIT TESTS (MOCKED FIXTURES) ===');

  // Test Case A & C: Real vs Hallucinated related papers filtering
  console.log('Testing related papers validation...');
  const simulatedLlmOutput = {
    relatedPapers: [
      {
        title: "A 94-GHz up-conversion mixer in 90-nm CMOS technology", // Matches verified mock list
        authors: ["John Doe", "Jane Smith"],
        url: "https://doi.org/10.1109/12345",
        relationship: "Precursor architecture."
      },
      {
        title: "Hallucinated mixer paper by LLM", // Invented by LLM
        authors: ["Fake Author"],
        url: "https://doi.org/10.1109/99999",
        relationship: "No backing record"
      }
    ]
  };

  const processed = postProcessValidation(simulatedLlmOutput, mockRelatedPapers, []);
  
  const hasRealPaper = processed.relatedPapers.some(p => p.title === "A 94-GHz up-conversion mixer in 90-nm CMOS technology");
  const hasFakePaper = processed.relatedPapers.some(p => p.title === "Hallucinated mixer paper by LLM");

  if (hasRealPaper && !hasFakePaper) {
    console.log('✔ SUCCESS: Real related paper accepted, fake/hallucinated paper filtered out.');
  } else {
    throw new Error('FAIL: Related papers validation failed.');
  }

  // Test Case B: Unrelated papers filtered out
  console.log('Testing unrelated papers filter...');
  const simulatedUnrelated = {
    relatedPapers: [
      {
        title: "Introduction to machine learning algorithms", // Unrelated
        authors: ["ML Researcher"],
        url: "https://doi.org/10.1109/nlp-fake"
      }
    ]
  };
  const processedUnrelated = postProcessValidation(simulatedUnrelated, mockRelatedPapers, []);
  if (processedUnrelated.relatedPapers.length === 0) {
    console.log('✔ SUCCESS: Unrelated paper correctly rejected.');
  } else {
    throw new Error('FAIL: Unrelated paper was not rejected.');
  }

  // Test Case D: Real GitHub implementation accepted, fake rejected
  console.log('Testing GitHub implementation validation...');
  const simulatedGithubOutput = {
    implementations: [
      {
        name: "yo-sheng-lin/94ghz-mixer-cmos", // Matches verified mock repo
        url: "https://github.com/yo-sheng-lin/94ghz-mixer-cmos",
        type: "github"
      },
      {
        name: "fake-repo/hallucinated-mixer", // Hallucinated by LLM
        url: "https://github.com/fake-repo/hallucinated-mixer",
        type: "github"
      }
    ]
  };

  const processedGithub = postProcessValidation(simulatedGithubOutput, [], mockImplementations);
  const hasRealRepo = processedGithub.implementations.some(i => i.name === "yo-sheng-lin/94ghz-mixer-cmos");
  const hasFakeRepo = processedGithub.implementations.some(i => i.name === "fake-repo/hallucinated-mixer");

  if (hasRealRepo && !hasFakeRepo) {
    console.log('✔ SUCCESS: Real GitHub repository accepted, fake/hallucinated repository filtered out.');
  } else {
    throw new Error('FAIL: GitHub implementations validation failed.');
  }

  // Test Case E: No results -> empty array
  console.log('Testing empty candidates -> empty array...');
  const processedEmpty = postProcessValidation(simulatedLlmOutput, [], []);
  if (processedEmpty.relatedPapers.length === 0 && processedEmpty.implementations.length === 0) {
    console.log('✔ SUCCESS: No candidates/verified sources returns empty arrays.');
  } else {
    throw new Error('FAIL: Empty candidates returned non-empty arrays.');
  }

  console.log('=== ALL UNIT TESTS PASSED SUCCESS ===');
}

runUnitTests();
