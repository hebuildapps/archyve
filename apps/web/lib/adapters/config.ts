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
    bgColor: '#9ec94c', // Crisp lively chartreuse lime like Telebirr
    fgColor: '#1d3305',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    sampleUrl: 'https://pubmed.ncbi.nlm.nih.gov/31890786',
    displayUrl: 'pubmed.ncbi.nlm.nih.gov/31890786',
    bgColor: '#d488c9', // Rich lilac purple like CBE
    fgColor: '#3c0d35',
  },
  {
    id: 'ieee',
    name: 'IEEE Xplore',
    sampleUrl: 'https://ieeexplore.ieee.org/document/9987654',
    displayUrl: 'ieeexplore.ieee.org/document/9987654',
    bgColor: '#e69929', // Golden yellow/amber like BOA / Berhan Bank
    fgColor: '#3f2100',
  },
  {
    id: 'sciencedirect',
    name: 'ScienceDirect',
    sampleUrl: 'https://sciencedirect.com/science/article/pii/S009286742100000X',
    displayUrl: 'sciencedirect.com/science/article/pii/S009286742100000X',
    bgColor: '#ef7d26', // Warm deep orange like Awash Bank
    fgColor: '#3d1700',
  },
  {
    id: 'springer',
    name: 'Springer',
    sampleUrl: 'https://link.springer.com/article/10.1007/s00521-023-08500-1',
    displayUrl: 'link.springer.com/article/10.1007/s00521-023-08500-1',
    bgColor: '#d86577', // Rose berry pink like Ahadu Bank / Zemen Bank
    fgColor: '#380a14',
  },
  {
    id: 'jstor',
    name: 'JSTOR',
    sampleUrl: 'https://jstor.org/stable/4130000',
    displayUrl: 'jstor.org/stable/4130000',
    bgColor: '#718ed6', // Soft periwinkle blue like Dashen / Amara Bank
    fgColor: '#0e1e47',
  },
  {
    id: 'pmc',
    name: 'PubMed Central',
    sampleUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7095448',
    displayUrl: 'pmc.ncbi.nlm.nih.gov/articles/PMC7095448',
    bgColor: '#3ec778', // Vivid mint emerald green like M-PESA
    fgColor: '#032c14',
  },
];
