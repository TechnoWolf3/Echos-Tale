const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const defaultBotRoot = path.join(process.env.USERPROFILE || 'C:\\Users\\sheyn', 'Documents', 'Echo of Elsewhere');
const botRoot = process.env.ECHO_BOT_ROOT || defaultBotRoot;
const outputPath = path.join(repoRoot, 'services', 'content', 'bot-pools.json');

const modules = {
  botGames: {
    doubleOrNothing: 'data/botgames/events/doubleOrNothing.js',
    echoCups: 'data/botgames/events/echoCups.js',
    index: 'data/botgames/index.js',
    mysteryBox: 'data/botgames/events/mysteryBox.js',
    quickdraw: 'data/botgames/events/quickdraw.js',
    riskLadder: 'data/botgames/events/riskLadder.js',
    staticSweep: 'data/botgames/events/staticSweep.js',
  },
  community: {
    contracts: 'data/communityContracts/index.js',
    levelUpLines: 'data/community/levelUpLines.js',
    places: 'data/communityContracts/places.js',
  },
  contracts: {
    config: 'data/contracts/config.js',
  },
  crime: {
    heist: 'data/work/categories/crime/heist.scenarios.js',
    layLow: 'data/work/categories/crime/layLow.js',
    scamCall: 'data/work/categories/crime/scamCall.data.js',
    storeRobbery: 'data/work/categories/crime/storeRobbery.scenarios.js',
  },
  echoRift: {
    legacy: 'utils/echoRift.js',
    scenarios: 'utils/echoRift/riftScenarios.js',
    textPools: 'utils/echoRift/riftTextPools.js',
  },
  ese: {
    companies: 'data/ese/companies.js',
    newsTemplates: 'data/ese/newsTemplates.js',
    rumors: 'data/ese/rumors.js',
  },
  farming: {
    contractTemplates: 'data/farming/contractTemplates.js',
    weather: 'data/farming/weather.js',
    weatherChances: 'data/farming/weatherChances.js',
  },
  funGames: {
    echoWhisper: 'data/games/echoWhisper.js',
    echoWhisperConfig: 'data/games/echoWhisperConfig.js',
    emojiGuess: 'data/games/emojiGuess.js',
    hangman: 'data/games/hangman.js',
    memeRating: 'data/games/memeRating.js',
    movieQuote: 'data/games/movieQuote.js',
    storyBuilder: 'data/games/storyBuilder.js',
    trivia: 'data/games/trivia.js',
    voteAndDrink: 'data/games/votendrink.js',
    voteQuestionsSpicy: 'data/voteQuestions_spicy.js',
    wordScramble: 'data/games/wordScramble.js',
  },
  grind: {
    fishing: 'data/work/categories/grind/fishing.js',
    quarry: 'data/work/categories/grind/quarry.js',
    storeClerk: 'data/work/categories/grind/storeClerk.js',
    taxiDriver: 'data/work/categories/grind/taxiDriver.scenarios.js',
    warehousing: 'data/work/categories/grind/warehousing.js',
  },
  jail: {
    config: 'data/jail/config.js',
    npcs: 'data/jail/npcs.js',
  },
  manufacturing: {
    materials: 'data/manufacturing/materials.js',
    recipes: 'data/manufacturing/recipes.js',
  },
  nightWalker: {
    flirt: 'data/work/categories/nightwalker/flirt.js',
    lapDance: 'data/work/categories/nightwalker/lapDance.js',
    prostitute: 'data/work/categories/nightwalker/prostitute.js',
  },
  rituals: {
    bladeGrid: 'data/rituals/bladeGrid.js',
    daily: 'data/rituals/daily.js',
    echoArrangement: 'data/rituals/echoArrangement.js',
    echoArrangementScenarios: 'data/rituals/echoArrangementScenarios.js',
    echoCipher: 'data/rituals/echoCipher.js',
    echoWheel: 'data/rituals/echoWheel.js',
    monthly: 'data/rituals/monthly.js',
    veilSequence: 'data/rituals/veilSequence.js',
    weekly: 'data/rituals/weekly.js',
  },
  underworld: {
    branches: 'data/underworld/branches.js',
    buildings: 'data/underworld/buildings.js',
    operations: 'data/underworld/operations.js',
    products: 'data/underworld/products.js',
    smugglingEvents: 'data/underworld/smugglingEvents.js',
    smugglingVehicles: 'data/underworld/smugglingVehicles.js',
    storageGoods: 'data/underworld/storageGoods.js',
    upgrades: 'data/underworld/upgrades.js',
  },
};

function load(relativePath) {
  const fullPath = path.join(botRoot, relativePath);
  delete require.cache[require.resolve(fullPath)];
  return require(fullPath);
}

function tryLoad(relativePath) {
  try {
    return { ok: true, value: sanitize(load(relativePath)) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      path: relativePath,
      skipped: true,
    };
  }
}

function sanitize(value, seen = new WeakSet()) {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') {
    return undefined;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => sanitize(entry, seen)).filter((entry) => typeof entry !== 'undefined');
  }

  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    const next = sanitize(entry, seen);
    if (typeof next !== 'undefined') {
      out[key] = next;
    }
  }
  return out;
}

function loadTree(tree) {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === 'string' ? tryLoad(value) : loadTree(value),
    ])
  );
}

function emailPools() {
  const email = load('data/work/categories/nineToFive/emailSorter.js');
  const emailKey = { urgent: 'Urgent', todo: 'To-Do', spam: 'Spam', scam: 'Scam' };
  return Object.fromEntries(
    Object.entries(email.templates).map(([key, families]) => [
      emailKey[key] || key,
      families.map((family) => ({
        key: family.key,
        fromPool: family.fromPool,
        subjectPool: family.subjectPool,
        paragraph1Pool: family.paragraph1Pool,
        paragraph2Pool: family.paragraph2Pool,
        signoffPool: family.signoffPool,
      })),
    ])
  );
}

function truckerPools() {
  const routes = load('data/work/categories/nineToFive/trucker.routes.js');
  const freight = load('data/work/categories/nineToFive/trucker.freight.js');
  return {
    routes: routes.map((route) => ({
      route: `${route.from.city} to ${route.to.city}`,
      distanceKm: route.distanceKm,
    })),
    freightPool: freight.freightPool,
    trailerConfigs: freight.trailerConfigs,
    manifestLines: freight.manifestLines,
  };
}

function insideTrackPools() {
  const track = load('data/games/casino/insideTrackConfig.js');
  return {
    horseNames: track.horseNames,
    trackConditions: track.trackConditions.map((condition) => condition.name),
    majorRaces: track.majorRaces,
    formLines: track.formLines,
  };
}

function extractConstArray(relativePath, constName) {
  const source = fs.readFileSync(path.join(botRoot, relativePath), 'utf8');
  const startToken = `const ${constName} = `;
  const start = source.indexOf(startToken);
  if (start < 0) {
    return [];
  }

  const arrayStart = source.indexOf('[', start + startToken.length);
  if (arrayStart < 0) {
    return [];
  }

  let depth = 0;
  let inString = null;
  let escaped = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return sanitize(vm.runInNewContext(`(${source.slice(arrayStart, index + 1)})`));
      }
    }
  }

  return [];
}

function main() {
  const data = {
    generatedAt: new Date().toISOString(),
    sourceRoot: botRoot,
    emailTemplates: emailPools(),
    trucker: truckerPools(),
    insideTrack: insideTrackPools(),
    allPools: loadTree(modules),
  };
  data.allPools.crime.layLow = {
    ok: true,
    value: extractConstArray('data/work/categories/crime/layLow.js', 'SCENARIOS'),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);

  const counts = {
    emailFamilies: Object.fromEntries(Object.entries(data.emailTemplates).map(([key, value]) => [key, value.length])),
    truckerRoutes: data.trucker.routes.length,
    truckerFreight: data.trucker.freightPool.length,
    insideTrackHorseNames: data.insideTrack.horseNames.length,
    echoArrangementScenarios: data.allPools.rituals.echoArrangementScenarios.value?.length ?? 0,
    layLowScenarios: data.allPools.crime.layLow.value?.length ?? 0,
    topLevelPoolGroups: Object.keys(data.allPools).length,
  };
  console.log(JSON.stringify(counts, null, 2));
}

main();
