const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock browser objects for Node.js validation test
global.window = global;
global.localStorage = {
  getItem: () => null,
  setItem: () => null
};

console.log("=== Testing Curriculum and Data Files ===");

// 1. Check audio.js
try {
  const audioCode = fs.readFileSync(path.join(__dirname, 'js', 'audio.js'), 'utf8');
  vm.runInThisContext(audioCode);
  console.log("✔ audio.js evaluated successfully");
} catch (err) {
  console.error("❌ Error in audio.js:", err);
}

// 2. Check levels-data.js
try {
  const levelsCode = fs.readFileSync(path.join(__dirname, 'js', 'levels-data.js'), 'utf8');
  vm.runInThisContext(levelsCode);
  
  const totalLevels = levelRepo.getTotalLevels();
  console.log(`✔ levels-data.js loaded. Total levels generated: ${totalLevels}`);

  if (totalLevels < 105) {
    console.error(`❌ Expected at least 105 levels, got ${totalLevels}`);
  } else {
    console.log("✔ 105 Levels verified!");
  }

  // Validate questions inside each level
  let totalQuestions = 0;
  let errorCount = 0;

  for (let i = 1; i <= totalLevels; i++) {
    const lvl = levelRepo.getLevel(i);
    if (!lvl || !lvl.questions || lvl.questions.length === 0) {
      console.error(`❌ Level ${i} is missing or has no questions!`);
      errorCount++;
      continue;
    }

    totalQuestions += lvl.questions.length;

    lvl.questions.forEach((q, qIdx) => {
      if (q.type === 'audio_pick' || q.type === 'spelling_fix' || q.type === 'newspaper_headline' || q.type === 'news_comprehension') {
        if (!q.target) {
          console.error(`❌ Level ${i} Q${qIdx} missing target`);
          errorCount++;
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          console.error(`❌ Level ${i} Q${qIdx} missing valid options array`);
          errorCount++;
        }
        if (!q.options.includes(q.target)) {
          console.error(`❌ Level ${i} Q${qIdx} target "${q.target}" not found in options: ${q.options.join(', ')}`);
          errorCount++;
        }
      } else if (q.type === 'sentence_build') {
        if (!q.sentence || !Array.isArray(q.sentence) || q.sentence.length === 0) {
          console.error(`❌ Level ${i} Q${qIdx} invalid sentence`);
          errorCount++;
        }
        if (!q.jumbled || !Array.isArray(q.jumbled) || q.jumbled.length === 0) {
          console.error(`❌ Level ${i} Q${qIdx} invalid jumbled`);
          errorCount++;
        }
      }
    });
  }

  console.log(`✔ Validated all ${totalLevels} levels with a total of ${totalQuestions} questions!`);
  if (errorCount === 0) {
    console.log("✔ Zero curriculum validation errors!");
  } else {
    console.error(`❌ Found ${errorCount} errors in curriculum!`);
  }

} catch (err) {
  console.error("❌ Error in levels-data.js:", err);
}

// 3. Check newspaper-data.js
try {
  const newsCode = fs.readFileSync(path.join(__dirname, 'js', 'newspaper-data.js'), 'utf8');
  vm.runInThisContext(newsCode);
  console.log(`✔ newspaper-data.js loaded. Total news articles: ${NEWSPAPER_DATA.length}`);
} catch (err) {
  console.error("❌ Error in newspaper-data.js:", err);
}

// 4. Check game-engine.js
try {
  const engineCode = fs.readFileSync(path.join(__dirname, 'js', 'game-engine.js'), 'utf8');
  vm.runInThisContext(engineCode);
  
  // Test starting level 1
  const q1 = game.startLevel(1);
  console.log(`✔ Game Engine test: Started level 1, loaded Q1 type: "${q1.type}"`);

  const totalStars = game.getTotalStars();
  console.log(`✔ Game Engine initial stars: ${totalStars}`);
} catch (err) {
  console.error("❌ Error in game-engine.js:", err);
}

console.log("=== All Tests Complete ===");
