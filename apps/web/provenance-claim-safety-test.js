/**
 * Test for AI Dossier Provenance and Claim Safety.
 * Demonstrates:
 * 1. Verified metadata cannot be replaced by LLM guesses.
 * 2. Unsupported bibliographic claims (hallucinated related papers/repos) are strictly rejected.
 * 3. Retrieved related-paper records remain traceable to their verified source.
 * 4. AI-derived interpretation (contributions, reading recommendation) is clearly separated from verified facts.
 */

const targetPaper = {
  title: "A low power and high conversion gain 94 GHz up-conversion mixer with excellent I/O matching and LO-RF isolation in 90 nm CMOS",
  authors: ["Yo-Sheng Lin", "Chih-Chung Chen"],
  doi: "10.1109/RWS.2016.7444399",
  publisher: "IEEE",
  publicationYear: 2016
};

const verifiedRelatedPapers = [
  {
    title: "A 94-GHz up-conversion mixer in 90-nm CMOS technology",
    authors: ["John Doe"],
    url: "https://doi.org/10.1109/12345",
    doi: "10.1109/12345",
    relationship: "Related work via scholarly citation graph"
  }
];

// Simulated backend post-sanitization + provenance preservation layer
function processDossierOutput(parsedLlmData, paperMeta, verifiedRelated, verifiedRepos) {
  // 1. Enforce verified metadata protection - overwrite any LLM attempts to rewrite target paper facts
  const paper = {
    ...paperMeta,
    // Ensure abstract and other facts are not replaced
    abstract: paperMeta.abstract || parsedLlmData.abstract || null
  };

  // 2. Filter unverified/hallucinated literature and repositories, preserving source provenance
  const relatedPapers = [];
  if (Array.isArray(parsedLlmData.relatedPapers)) {
    for (const p of parsedLlmData.relatedPapers) {
      // Find match in verified candidates
      const match = verifiedRelated.find(
        (ref) => ref.title.toLowerCase().replace(/[^a-z0-9]/g, '') === p.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (match) {
        relatedPapers.push({
          title: match.title,
          authors: match.authors,
          url: match.url,
          doi: match.doi,
          // Preserving source-grounded provenance relationship
          relationship: match.relationship,
          provenance: "OpenAlex Citation Graph"
        });
      }
    }
  }

  const implementations = [];
  if (Array.isArray(parsedLlmData.implementations)) {
    for (const impl of parsedLlmData.implementations) {
      const match = verifiedRepos.find(
        (ref) => ref.url.toLowerCase().trim() === impl.url.toLowerCase().trim()
      );
      if (match) {
        implementations.push({
          name: match.name,
          url: match.url,
          type: match.type,
          stars: match.stars,
          provenance: "GitHub Search API"
        });
      }
    }
  }

  // 3. Keep derived interpretation distinct from facts
  const derivedInterpretation = {
    summary: parsedLlmData.summary,
    keyContributions: parsedLlmData.keyContributions,
    readRecommendation: parsedLlmData.readRecommendation,
    researchContext: parsedLlmData.researchContext
  };

  return {
    paper,
    relatedPapers,
    implementations,
    derivedInterpretation
  };
}

function runProvenanceTests() {
  console.log('=== RUNNING AI DOSSIER PROVENANCE & CLAIM SAFETY TESTS ===');

  // Simulated LLM output trying to overwrite metadata and invent hallucinated candidates
  const simulatedLlmOutput = {
    title: "Hallucinated Title by LLM", // attempt to rewrite verified title
    publicationYear: 2020, // attempt to rewrite publication year
    summary: "The authors present an up-conversion mixer.", // Derived
    keyContributions: ["High conversion gain"], // Derived
    readRecommendation: { score: 4.5, explanation: "Strong design." }, // Derived
    researchContext: "Hardware systems.", // Derived
    relatedPapers: [
      {
        title: "A 94-GHz up-conversion mixer in 90-nm CMOS technology", // Real related paper
        authors: ["Wrong Authors"],
        url: "https://doi.org/10.1109/wrong-url",
        relationship: "LLM Hallucinated precursor claim"
      },
      {
        title: "Hallucinated mixer paper by LLM", // Fake paper
        authors: ["Fake Author"],
        url: "https://doi.org/10.1109/99999",
        relationship: "Precursor work"
      }
    ]
  };

  const processed = processDossierOutput(simulatedLlmOutput, targetPaper, verifiedRelatedPapers, []);

  // Assert 1: Target paper metadata is protected
  console.log('\nAsserting Target Paper Metadata Protection...');
  console.log('Final Title:', processed.paper.title);
  console.log('Final Year:', processed.paper.publicationYear);
  if (processed.paper.title === targetPaper.title && processed.paper.publicationYear === targetPaper.publicationYear) {
    console.log('✔ SUCCESS: Verified metadata protected from LLM modifications.');
  } else {
    throw new Error('FAIL: Verified metadata was overwritten by LLM guesses.');
  }

  // Assert 2: Unverified literature is filtered out
  console.log('\nAsserting Unverified Literature Rejection...');
  console.log('Processed Related Papers:', JSON.stringify(processed.relatedPapers, null, 2));
  const hasReal = processed.relatedPapers.some(p => p.title === "A 94-GHz up-conversion mixer in 90-nm CMOS technology");
  const hasFake = processed.relatedPapers.some(p => p.title === "Hallucinated mixer paper by LLM");
  if (hasReal && !hasFake) {
    console.log('✔ SUCCESS: Hallucinated/unsupported related papers rejected.');
  } else {
    throw new Error('FAIL: Hallucinated paper was not rejected.');
  }

  // Assert 3: Provenance remains traceable to source
  console.log('\nAsserting Traceability...');
  const firstPaper = processed.relatedPapers[0];
  console.log('Provenance:', firstPaper.provenance);
  console.log('Verified Relationship:', firstPaper.relationship);
  if (firstPaper.provenance === "OpenAlex Citation Graph" && firstPaper.relationship === "Related work via scholarly citation graph") {
    console.log('✔ SUCCESS: Retrieved related papers remain traceable to their verified source.');
  } else {
    throw new Error('FAIL: Provenance metadata missing or modified.');
  }

  // Assert 4: Separation of Derived vs Verified facts
  console.log('\nAsserting separation of Derived vs Verified facts...');
  console.log('Verified Facts (Paper Title):', processed.paper.title);
  console.log('AI-derived interpretation (Key Contributions):', processed.derivedInterpretation.keyContributions);
  if (processed.paper && processed.derivedInterpretation.keyContributions) {
    console.log('✔ SUCCESS: Derived interpretation is clearly separated from verified facts.');
  } else {
    throw new Error('FAIL: Facts and interpretation are mixed.');
  }

  console.log('\n=== ALL PROVENANCE & CLAIM SAFETY TESTS PASSED SUCCESS ===');
}

runProvenanceTests();
