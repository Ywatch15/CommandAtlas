import { searchIndex } from '../../apps/web/lib/search/queryEngine.js';
import { FIELD_BOOST } from '../../packages/shared/constants.js';

// Mock pre-built index
const mockIndex = {
  tokens: {
    cp: [{ slug: 'cp', boost: FIELD_BOOST.NAME }],
    copy: [
      { slug: 'cp', boost: FIELD_BOOST.INTENT_PHRASE_EXACT, phrase: 'copy files and directories' },
    ],
    grep: [{ slug: 'grep', boost: FIELD_BOOST.NAME }],
    egrep: [{ slug: 'grep', boost: FIELD_BOOST.ALIASES }],
    search: [
      { slug: 'grep', boost: FIELD_BOOST.INTENT_PHRASE_EXACT, phrase: 'search text in files' },
    ],
  },
  trigrams: {
    '^gr': ['grep'],
    gre: ['grep'],
    ep$: ['grep'],
  },
  facets: {
    cp: {
      category: 'linux',
      difficulty: 'beginner',
      supportedOS: ['linux', 'macos', 'unix'],
      tags: ['file-management', 'copy'],
    },
    grep: {
      category: 'linux',
      difficulty: 'intermediate',
      supportedOS: ['linux', 'macos', 'unix'],
      tags: ['text-processing', 'search'],
    },
  },
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`✓ ${testName}`);
  } else {
    failed++;
    console.error(`✗ ${testName}`);
  }
}

// 1. Name query
const resName = searchIndex('cp', mockIndex);
assert(resName.length > 0 && resName[0].slug === 'cp', 'Search by exact name "cp" returns cp');

// 2. Alias query
const resAlias = searchIndex('egrep', mockIndex);
assert(resAlias.length > 0 && resAlias[0].slug === 'grep', 'Search by alias "egrep" returns grep');

// 3. Intent phrase query
const resIntent = searchIndex('search text in files', mockIndex);
assert(
  resIntent.length > 0 && resIntent[0].slug === 'grep',
  'Search by intent phrase returns grep'
);

// 4. Typo query
const resTypo = searchIndex('grpe', mockIndex);
assert(resTypo.length > 0 && resTypo[0].slug === 'grep', 'Search with typo "grpe" returns grep');

// 5. Facet filter query
const resFacet = searchIndex('grep', mockIndex, { difficulty: 'beginner' });
assert(resFacet.length === 0, 'Facet filter difficulty=beginner excludes intermediate grep');

const resFacetMatch = searchIndex('grep', mockIndex, { difficulty: 'intermediate' });
assert(
  resFacetMatch.length > 0 && resFacetMatch[0].slug === 'grep',
  'Facet filter difficulty=intermediate includes grep'
);

console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
