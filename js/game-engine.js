/**
 * game-engine.js - खेल प्रगति, स्कोरिंग एवं प्रश्न प्रवाह नियंत्रक
 */

class GameEngine {
  constructor() {
    this.storageKey = 'hindi_gyandeep_progress_v1';
    this.state = this.loadState();
    
    // वर्तमान सत्र स्थिति
    this.currentLevel = 1;
    this.currentLevelData = null;
    this.currentQIndex = 0;
    this.currentQuestion = null;
    
    this.levelScore = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.answeredCurrent = false;

    // वाक्य निर्माण स्थिति
    this.sentenceSelectedWords = [];
    this.sentenceAvailableWords = [];
  }

  // LocalStorage से प्रगति लोड करना
  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }

    return {
      unlockedLevel: 105, // सभी १०५ स्तर पहले से खुले हैं
      completedLevels: {}, // { levelNum: { stars: 3, score: 100 } }
      totalScore: 0,
      streakDays: 1,
      lastPlayedDate: new Date().toDateString(),
      speechRate: 0.85,
      mistakes: [] // गलत हुए शब्द रिवीजन के लिए
    };
  }

  // प्रगति सहेजना
  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }

  // स्तर शुरू करना
  startLevel(levelNum) {
    const levelData = levelRepo.getLevel(levelNum);
    if (!levelData) return false;

    this.currentLevel = levelNum;
    this.currentLevelData = levelData;
    this.currentQIndex = 0;
    this.levelScore = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.answeredCurrent = false;

    // दैनिक स्ट्रीक अपडेट
    this.updateStreak();

    return this.loadQuestion(0);
  }

  // स्ट्रीक अपडेट
  updateStreak() {
    const today = new Date().toDateString();
    if (this.state.lastPlayedDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (this.state.lastPlayedDate === yesterday) {
        this.state.streakDays = (this.state.streakDays || 0) + 1;
      } else {
        this.state.streakDays = 1;
      }
      this.state.lastPlayedDate = today;
      this.saveState();
    }
  }

  // प्रश्न लोड करना
  loadQuestion(index) {
    if (!this.currentLevelData || index >= this.currentLevelData.questions.length) {
      return null;
    }

    this.currentQIndex = index;
    this.currentQuestion = this.currentLevelData.questions[index];
    this.answeredCurrent = false;

    // यदि वाक्य निर्माण है तो भ्रामक शब्दों सहित पूरा पूल तैयार करें
    if (this.currentQuestion.type === 'sentence_build') {
      this.sentenceSelectedWords = [];
      const pool = this.currentQuestion.pool || this.currentQuestion.jumbled || this.currentQuestion.sentence;
      this.sentenceAvailableWords = levelRepo.shuffleArray([...pool]);
    }

    return this.currentQuestion;
  }

  // बहुविकल्पीय उत्तर जाँचना (audio_pick, spelling_fix, newspaper_headline, news_comprehension)
  checkChoiceAnswer(selectedAnswer) {
    if (this.answeredCurrent || !this.currentQuestion) return null;

    this.answeredCurrent = true;
    const isCorrect = (selectedAnswer === this.currentQuestion.target);

    if (isCorrect) {
      this.correctCount++;
      this.levelScore += 10;
      this.state.totalScore += 10;
      audio.playSuccessTone();
    } else {
      this.wrongCount++;
      audio.playWrongTone();
      this.recordMistake(this.currentQuestion.target, selectedAnswer, this.currentQuestion.prompt || this.currentQuestion.instruction);
    }

    this.saveState();

    return {
      isCorrect: isCorrect,
      target: this.currentQuestion.target,
      selected: selectedAnswer,
      scoreGained: isCorrect ? 10 : 0
    };
  }

  // वाक्य निर्माण: शब्द चुनना / हटाना
  toggleSentenceWord(word, fromPool = true) {
    if (this.answeredCurrent) return;

    if (fromPool) {
      // पूल से वाक्य में जोड़ें
      const idx = this.sentenceAvailableWords.indexOf(word);
      if (idx > -1) {
        this.sentenceAvailableWords.splice(idx, 1);
        this.sentenceSelectedWords.push(word);
        audio.playClickTone();
      }
    } else {
      // वाक्य से वापस पूल में भेजें
      const idx = this.sentenceSelectedWords.lastIndexOf(word);
      if (idx > -1) {
        this.sentenceSelectedWords.splice(idx, 1);
        this.sentenceAvailableWords.push(word);
        audio.playClickTone();
      }
    }
  }

  // वाक्य निर्माण उत्तर जाँचना
  checkSentenceAnswer() {
    if (this.answeredCurrent || !this.currentQuestion) return null;

    const userSentenceStr = this.sentenceSelectedWords.join(' ').trim();
    const correctSentenceStr = this.currentQuestion.sentence.join(' ').trim();

    this.answeredCurrent = true;
    const isCorrect = (userSentenceStr === correctSentenceStr);

    if (isCorrect) {
      this.correctCount++;
      this.levelScore += 15;
      this.state.totalScore += 15;
      audio.playSuccessTone();
    } else {
      this.wrongCount++;
      audio.playWrongTone();
      this.recordMistake(correctSentenceStr, userSentenceStr, "वाक्य निर्माण");
    }

    this.saveState();

    return {
      isCorrect: isCorrect,
      targetSentence: correctSentenceStr,
      userSentence: userSentenceStr,
      scoreGained: isCorrect ? 15 : 0
    };
  }

  // गलती रिकॉर्ड करना
  recordMistake(target, selected, context) {
    if (!target) return;
    // केवल ताज़ा 30 गलतियाँ रखें
    this.state.mistakes = this.state.mistakes.filter(m => m.target !== target);
    this.state.mistakes.unshift({
      target: target,
      selected: selected || '',
      context: context || '',
      date: new Date().toLocaleDateString('hi-IN')
    });
    if (this.state.mistakes.length > 30) {
      this.state.mistakes.pop();
    }
  }

  // अगला प्रश्न
  hasNextQuestion() {
    return this.currentLevelData && (this.currentQIndex + 1 < this.currentLevelData.questions.length);
  }

  // स्तर पूर्ण करना
  finishLevel() {
    const totalQ = this.currentLevelData ? this.currentLevelData.questions.length : 1;
    const accuracy = (this.correctCount / totalQ) * 100;

    let stars = 1;
    if (accuracy >= 85) {
      stars = 3;
    } else if (accuracy >= 60) {
      stars = 2;
    }

    // रिकॉर्ड सहेजना
    const existing = this.state.completedLevels[this.currentLevel] || { stars: 0, score: 0 };
    if (stars > existing.stars) {
      this.state.completedLevels[this.currentLevel] = {
        stars: stars,
        score: Math.max(existing.score, this.levelScore),
        date: new Date().toLocaleDateString('hi-IN')
      };
    }

    // अगला स्तर अनलॉक करना
    if (this.currentLevel >= this.state.unlockedLevel) {
      this.state.unlockedLevel = this.currentLevel + 1;
    }

    this.saveState();
    audio.playLevelCompleteTone();

    return {
      level: this.currentLevel,
      title: this.currentLevelData.title,
      stars: stars,
      correctCount: this.correctCount,
      totalCount: totalQ,
      score: this.levelScore,
      nextLevel: this.currentLevel + 1 <= levelRepo.getTotalLevels() ? this.currentLevel + 1 : null
    };
  }

  // कुल सितारे
  getTotalStars() {
    let total = 0;
    Object.values(this.state.completedLevels).forEach(lvl => {
      total += (lvl.stars || 0);
    });
    return total;
  }

  // प्रगति रीसेट
  resetProgress() {
    this.state = {
      unlockedLevel: 1,
      completedLevels: {},
      totalScore: 0,
      streakDays: 1,
      lastPlayedDate: new Date().toDateString(),
      speechRate: 0.85,
      mistakes: []
    };
    this.saveState();
  }
}

// ग्लोबल गेम इंजन इंस्टेंस
const game = new GameEngine();
