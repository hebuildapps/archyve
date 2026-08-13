import { Source } from '@archyve/shared';

export interface GithubRepoResult {
  name: string;
  url: string;
  type: 'github';
  stars: number;
  description: string;
}

/**
 * Searches GitHub for repositories related to the paper title.
 * Validates the candidates before returning them.
 */
export async function searchGithubImplementations(title: string): Promise<GithubRepoResult[]> {
  if (!title || title.startsWith('IEEE Document')) {
    return [];
  }

  // Clean the title and construct a query with key terms
  // Remove common stop words and punctuation
  const cleanTerms = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['with', 'from', 'that', 'this', 'their', 'using', 'mixer', 'mixer', 'power', 'high', 'excellent'].includes(word));

  // Take up to 4 significant terms to query GitHub
  const queryTerms = cleanTerms.slice(0, 4);
  if (queryTerms.length === 0) return [];

  const query = queryTerms.join(' ');
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ArchyveResearchAgent/2.0 (mailto:hello@archyve.app)',
      },
    });

    if (!res.ok) {
      console.warn(`GitHub search API returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    const validated: GithubRepoResult[] = [];

    // Verify candidates
    for (const item of data.items) {
      const name = item.full_name || item.name;
      const htmlUrl = item.html_url;
      const description = item.description || '';
      const stars = item.stargazers_count || 0;

      if (!htmlUrl || !htmlUrl.startsWith('https://github.com/')) {
        continue;
      }

      // Check keyword match in name or description to prevent completely unrelated repos
      const nameLower = name.toLowerCase();
      const descLower = description.toLowerCase();
      
      // Require at least two of the query terms to match name or description
      const matches = queryTerms.filter(term => nameLower.includes(term) || descLower.includes(term));
      
      if (matches.length >= 2) {
        validated.push({
          name,
          url: htmlUrl,
          type: 'github',
          stars,
          description,
        });
      }
    }

    return validated;
  } catch (error) {
    console.error('GitHub search failed:', error);
    return [];
  }
}
