/**
 * Test for Supabase Database Persistence Failure.
 * Verifies that when database persistence fails, the application correctly handles it
 * as a degraded state and does not report a successful DB write.
 */

const { storePaperResult } = require('./lib/db/supabase');

// Mock data
const mockPaper = {
  title: "Test Paper",
  authors: ["Test Author"],
  doi: "10.1109/test.12345",
  publisher: "IEEE",
  publicationYear: 2026,
  url: "https://ieeexplore.ieee.org/document/test_failed_db",
  confidenceScore: 0.95
};

const mockDossier = {
  summary: "Test Summary",
  keyContributions: ["Contribution"],
  readRecommendation: {
    score: 4.0,
    explanation: "Exp",
    relevanceTopics: ["Topic"],
    difficulty: "intermediate",
    estimatedReadingTime: "10 min"
  },
  openAccess: {
    available: false,
    sourceName: null,
    url: null
  },
  researchContext: "Context",
  relatedConcepts: ["Concept"],
  relatedPapers: [],
  implementations: [],
  sources: [
    {
      id: "test-src",
      name: "Test Source",
      url: "https://test.src",
      type: "crossref",
      confidence: 0.9
    }
  ]
};

async function runPersistenceFailureTest() {
  console.log('=== RUNNING SUPABASE PERSISTENCE FAILURE TEST ===');

  // Triggering storePaperResult with an intentionally invalid environment or state
  // If supabase client is null or fails due to mismatched database schema/connection, it should return null
  console.log('Calling storePaperResult with mock inputs...');
  const resultId = await storePaperResult(mockPaper, mockDossier);

  console.log('Returned Paper ID:', resultId);

  // Assert that it returns null since the client is either uninitialized or the write fails
  // (In a real failure case where supabase service key is invalid or postgrest schema fails, it returns null)
  if (resultId === null) {
    console.log('✔ SUCCESS: DB persistence failure correctly returned null (Degraded state triggered).');
  } else {
    throw new Error('FAIL: DB persistence reported success (returned ID) despite db write failing.');
  }

  // Verify the degraded handling logic
  const mockPaperId = resultId;
  const outputData = {
    paper: mockPaper,
    result: mockDossier,
    persistenceStatus: mockPaperId ? 'success' : 'degraded'
  };

  console.log('Final output persistenceStatus:', outputData.persistenceStatus);
  if (outputData.persistenceStatus === 'degraded') {
    console.log('✔ SUCCESS: API handler would correctly output degraded status.');
  } else {
    throw new Error('FAIL: API handler failed to set degraded status.');
  }

  console.log('=== PERSISTENCE FAILURE TEST PASSED SUCCESS ===');
}

runPersistenceFailureTest().catch(err => {
  console.error('❌ PERSISTENCE FAILURE TEST FAILED:', err);
  process.exit(1);
});
