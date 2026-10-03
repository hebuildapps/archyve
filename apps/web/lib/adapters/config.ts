export interface AdapterOption {
  id: string;
  name: string;
  sampleUrl: string;
  displayUrl: string;
  bgColor: string;
  fgColor: string;
}

export const SUPPORTED_ADAPTERS: AdapterOption[] = [
  {
    id: 'arxiv',
    name: 'arXiv',
    sampleUrl: 'https://arxiv.org/abs/1706.03762',
    displayUrl: 'arxiv.org/abs/1706.03762',
    // Rich forest moss green (like Telebirr / Oromia Bank)
    bgColor: '#315822',
    fgColor: '#8ee058',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    sampleUrl: 'https://pubmed.ncbi.nlm.nih.gov/31890786',
    displayUrl: 'pubmed.ncbi.nlm.nih.gov/31890786',
    // Deep royal purple (like CBE / CBE Birr)
    bgColor: '#641c6d',
    fgColor: '#e9a4f3',
  },
  {
    id: 'ieee',
    name: 'IEEE Xplore',
    sampleUrl: 'https://ieeexplore.ieee.org/document/9987654',
    displayUrl: 'ieeexplore.ieee.org/document/9987654',
    // Vivid vibrant amber yellow (like Berhan Bank)
    bgColor: '#f0ad00',
    fgColor: '#0a3068',
  },
  {
    id: 'sciencedirect',
    name: 'ScienceDirect',
    sampleUrl: 'https://sciencedirect.com/science/article/pii/S009286742100000X',
    displayUrl: 'sciencedirect.com/science/article/pii/S009286742100000X',
    // Rich deep burnt amber / terracotta (like Awash Bank / BOA)
    bgColor: '#7a3e14',
    fgColor: '#f7ad5f',
  },
  {
    id: 'springer',
    name: 'Springer',
    sampleUrl: 'https://link.springer.com/article/10.1007/s00521-023-08500-1',
    displayUrl: 'link.springer.com/article/10.1007/s00521-023-08500-1',
    // Rich berry wine crimson (like Zemen Bank / Ahadu Bank)
    bgColor: '#961536',
    fgColor: '#fca2b9',
  },
  {
    id: 'jstor',
    name: 'JSTOR',
    sampleUrl: 'https://jstor.org/stable/4130000',
    displayUrl: 'jstor.org/stable/4130000',
    // Midnight sapphire blue (like Dashen Bank / Kaafi Ebirr)
    bgColor: '#1c2e68',
    fgColor: '#8aaaf7',
  },
  {
    id: 'pmc',
    name: 'PubMed Central',
    sampleUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7095448',
    displayUrl: 'pmc.ncbi.nlm.nih.gov/articles/PMC7095448',
    // Deep emerald pine green (like M-PESA / ZamZam Bank)
    bgColor: '#005e3a',
    fgColor: '#53e49e',
  },
  {
    id: 'crossref',
    name: 'Crossref DOI',
    sampleUrl: 'https://doi.org/10.1038/s41586-020-2649-2',
    displayUrl: 'doi.org/10.1038/s41586-020-2649-2',
    // Vibrant deep ocean cobalt blue (like Amhara Bank / COOPay)
    bgColor: '#1152a3',
    fgColor: '#80beff',
  },
];
