/**
 * app.js - मुख्य एप्लिकेशन यूज़र इंटरफ़ेस नियंत्रक (UI Controller)
 */

class App {
  constructor() {
    this.deferredInstallPrompt = null;
    this.currentScreen = 'home';
    this.currentNewsIndex = 0;
    this.init();
  }

  // इनिशियलाइजेशन
  init() {
    this.bindEvents();
    this.setupPWAInstall();
    this.registerServiceWorker();
    this.renderHome();
    this.renderStages();
    this.renderSoundChart();
    this.renderNewspaper();
    
    // ऑडियो दर सिंक करें
    if (game.state.speechRate) {
      audio.setRate(game.state.speechRate);
    }
  }

  // सर्विस वर्कर रजिस्टर करें
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('Service Worker Registered successfully');
        }).catch((err) => {
          console.warn('SW registration failed:', err);
        });
      });
    }
  }

  // PWA इंस्टॉल सेटअप
  setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const banner = document.getElementById('install-banner');
      if (banner) banner.style.display = 'flex';
    });

    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            const banner = document.getElementById('install-banner');
            if (banner) banner.style.display = 'none';
          }
          this.deferredInstallPrompt = null;
        } else {
          this.showToast('ऐप को क्रोम मेनू (⋮) से "Add to Home screen" करें');
        }
      });
    }
  }

  // स्क्रीन नेविगेशन
  navigateTo(screenId) {
    audio.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
      window.scrollTo(0, 0);

      // स्क्रीन अनुसार रेंडर
      if (screenId === 'home') this.renderHome();
      if (screenId === 'levels') this.renderStages();
      if (screenId === 'newspaper') this.renderNewspaper();
      if (screenId === 'progress') this.renderProgressScreen();
    }
  }

  // इवेंट बाइंडिंग
  bindEvents() {
    // बैक बटन्स
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const to = btn.getAttribute('data-to') || 'home';
        this.navigateTo(to);
        audio.playClickTone();
      });
    });

    // नेविगेशन बटन्स
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const to = btn.getAttribute('data-nav');
        this.navigateTo(to);
        audio.playClickTone();
      });
    });

    // होम से सीधा खेलें (जारी रखें)
    const playContinueBtn = document.getElementById('btn-continue-play');
    if (playContinueBtn) {
      playContinueBtn.addEventListener('click', () => {
        this.startLevelGame(game.state.unlockedLevel || 1);
      });
    }

    // खेल के दौरान आवाज़ दोहराने का बटन
    const speakQBtn = document.getElementById('btn-speak-question');
    if (speakQBtn) {
      speakQBtn.addEventListener('click', () => {
        this.speakCurrentQuestionPrompt();
      });
    }

    // धीमी आवाज़ टॉगल
    const slowAudioBtn = document.getElementById('btn-slow-audio');
    if (slowAudioBtn) {
      slowAudioBtn.addEventListener('click', () => {
        const currentRate = audio.getRate();
        if (currentRate > 0.7) {
          audio.setRate(0.65);
          slowAudioBtn.innerHTML = `<span>🐢 धीमी आवाज़ (चालू)</span>`;
          this.showToast('आवाज़ धीमी कर दी गई है');
        } else {
          audio.setRate(0.85);
          slowAudioBtn.innerHTML = `<span>🔊 सामान्य आवाज़</span>`;
          this.showToast('सामान्य आवाज़');
        }
        audio.playClickTone();
        this.speakCurrentQuestionPrompt();
      });
    }

    // वाक्य जाँचने का बटन
    const checkSentenceBtn = document.getElementById('btn-check-sentence');
    if (checkSentenceBtn) {
      checkSentenceBtn.addEventListener('click', () => {
        this.handleSentenceSubmit();
      });
    }

    // अगला प्रश्न बटन
    const nextQBtn = document.getElementById('btn-next-question');
    if (nextQBtn) {
      nextQBtn.addEventListener('click', () => {
        this.handleNextQuestion();
      });
    }

    // स्तर पूरा होने पर अगला स्तर बटन
    const modalNextLvlBtn = document.getElementById('modal-next-level-btn');
    if (modalNextLvlBtn) {
      modalNextLvlBtn.addEventListener('click', () => {
        this.closeModal('level-complete-modal');
        const next = modalNextLvlBtn.getAttribute('data-next');
        if (next) {
          this.startLevelGame(parseInt(next, 10));
        } else {
          this.navigateTo('levels');
        }
      });
    }

    // फिर से खेलें बटन
    const modalReplayBtn = document.getElementById('modal-replay-btn');
    if (modalReplayBtn) {
      modalReplayBtn.addEventListener('click', () => {
        this.closeModal('level-complete-modal');
        this.startLevelGame(game.currentLevel);
      });
    }

    // अखबार कैटेगरी टैब्स
    const categoryContainer = document.getElementById('newspaper-tabs');
    if (categoryContainer) {
      categoryContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab-btn');
        if (tab) {
          const idx = parseInt(tab.getAttribute('data-index'), 10);
          this.switchNewspaperTab(idx);
        }
      });
    }

    // पूरा अखबार लेख पढ़ने का बटन
    const readFullNewsBtn = document.getElementById('btn-read-full-news');
    if (readFullNewsBtn) {
      readFullNewsBtn.addEventListener('click', () => {
        this.readCurrentNewsArticle();
      });
    }
  }

  // -------------------------------------------------------------
  // होम स्क्रीन रेंडर
  // -------------------------------------------------------------
  renderHome() {
    const unlocked = game.state.unlockedLevel || 1;
    const totalStars = game.getTotalStars();
    const streak = game.state.streakDays || 1;

    const levelDisplay = document.getElementById('home-current-level');
    if (levelDisplay) levelDisplay.textContent = `स्तर ${unlocked}`;

    const starsDisplay = document.getElementById('home-stars-count');
    if (starsDisplay) starsDisplay.textContent = `${totalStars}`;

    const streakDisplay = document.getElementById('header-streak-count');
    if (streakDisplay) streakDisplay.textContent = `${streak} दिन`;

    const scoreDisplay = document.getElementById('home-total-score');
    if (scoreDisplay) scoreDisplay.textContent = `${game.state.totalScore || 0}`;
  }

  // -------------------------------------------------------------
  // स्तर सूची (Stages & 105 Levels) रेंडर
  // -------------------------------------------------------------
  renderStages() {
    const container = document.getElementById('stages-container');
    if (!container) return;

    container.innerHTML = '';

    STAGES_DATA.forEach(stage => {
      const stageCard = document.createElement('div');
      stageCard.className = 'stage-card';

      const [startLvl, endLvl] = stage.levelsRange;
      let completedInStage = 0;
      let stageStars = 0;

      for (let l = startLvl; l <= endLvl; l++) {
        if (game.state.completedLevels[l]) {
          completedInStage++;
          stageStars += game.state.completedLevels[l].stars || 0;
        }
      }

      stageCard.innerHTML = `
        <div class="stage-header">
          <div class="stage-title-group">
            <h3>${stage.icon} ${stage.title}</h3>
            <p>${stage.subtitle}</p>
          </div>
          <span class="stage-badge">⭐ ${stageStars}</span>
        </div>
        <div class="levels-grid" id="grid-stage-${stage.id}"></div>
      `;

      container.appendChild(stageCard);

      const grid = stageCard.querySelector(`#grid-stage-${stage.id}`);

      for (let lvlNum = startLvl; lvlNum <= endLvl; lvlNum++) {
        const box = document.createElement('button');
        box.className = 'level-box';

        const isCompleted = !!game.state.completedLevels[lvlNum];
        const isUnlocked = lvlNum <= game.state.unlockedLevel;
        const isCurrent = lvlNum === game.state.unlockedLevel;

        if (isCompleted) {
          box.classList.add('completed');
          const stars = game.state.completedLevels[lvlNum].stars || 1;
          const starsText = '⭐'.repeat(stars);
          box.innerHTML = `
            <span class="level-num">${lvlNum}</span>
            <span class="level-stars">${starsText}</span>
          `;
          box.addEventListener('click', () => this.startLevelGame(lvlNum));
        } else if (isUnlocked) {
          box.classList.add('unlocked');
          if (isCurrent) box.classList.add('current');
          box.innerHTML = `
            <span class="level-num">${lvlNum}</span>
            <span class="level-stars">शुरू करें</span>
          `;
          box.addEventListener('click', () => this.startLevelGame(lvlNum));
        } else {
          box.classList.add('locked');
          box.innerHTML = `
            <span class="lock-icon">🔒</span>
            <span class="level-num" style="font-size:1.1rem">${lvlNum}</span>
          `;
        }

        grid.appendChild(box);
      }
    });
  }

  // -------------------------------------------------------------
  // खेल शुरू करना
  // -------------------------------------------------------------
  startLevelGame(lvlNum) {
    const q = game.startLevel(lvlNum);
    if (!q) {
      this.showToast('स्तर डेटा लोड नहीं हो सका');
      return;
    }

    this.navigateTo('game');
    this.renderCurrentQuestion();
  }

  // वर्तमान प्रश्न रेंडर करना
  renderCurrentQuestion() {
    const q = game.currentQuestion;
    if (!q) return;

    // हेडर अपडेट
    const titleEl = document.getElementById('game-level-title');
    if (titleEl) titleEl.textContent = `स्तर ${game.currentLevel}: ${game.currentLevelData.title}`;

    const counterEl = document.getElementById('game-q-counter');
    if (counterEl) counterEl.textContent = `${game.currentQIndex + 1}/${game.currentLevelData.questions.length}`;

    const progressFill = document.getElementById('game-progress-fill');
    if (progressFill) {
      const pct = ((game.currentQIndex) / game.currentLevelData.questions.length) * 100;
      progressFill.style.width = `${pct}%`;
    }

    // निर्देश अपडेट
    const instructionEl = document.getElementById('game-instruction-text');
    if (instructionEl) {
      instructionEl.innerHTML = `<span>📢</span> ${q.instruction || 'सही उत्तर चुनें'}`;
    }

    // फीडबैक बैनर छिपाएं
    const feedbackBanner = document.getElementById('game-feedback-banner');
    if (feedbackBanner) feedbackBanner.style.display = 'none';

    // बटन स्थिति
    const nextBtn = document.getElementById('btn-next-question');
    if (nextBtn) nextBtn.style.display = 'none';

    const checkSentenceBtn = document.getElementById('btn-check-sentence');
    if (checkSentenceBtn) checkSentenceBtn.style.display = (q.type === 'sentence_build') ? 'block' : 'none';

    // प्रश्न कंटेनर टॉगल
    const optionsContainer = document.getElementById('game-options-container');
    const sentenceContainer = document.getElementById('game-sentence-container');
    const targetDisplayContainer = document.getElementById('game-target-display');

    if (q.type === 'sentence_build') {
      optionsContainer.style.display = 'none';
      targetDisplayContainer.style.display = 'none';
      sentenceContainer.style.display = 'flex';
      this.renderSentenceBuilder();
    } else {
      sentenceContainer.style.display = 'none';
      optionsContainer.style.display = 'grid';

      if (q.prompt || q.text) {
        targetDisplayContainer.style.display = 'block';
        const targetText = document.getElementById('target-display-text');
        if (targetText) {
          targetText.innerHTML = q.prompt || q.text;
        }
      } else {
        targetDisplayContainer.style.display = 'none';
      }

      this.renderChoiceOptions(q.options);
    }

    // स्वतः आवाज़ में बोलना (बुजुर्गों की सुविधा हेतु)
    setTimeout(() => {
      this.speakCurrentQuestionPrompt();
    }, 250);
  }

  // प्रश्न की आवाज़ बोलना
  speakCurrentQuestionPrompt() {
    const q = game.currentQuestion;
    if (!q) return;

    const speakBtn = document.getElementById('btn-speak-question');
    if (speakBtn) speakBtn.classList.add('speaking');

    const onEnd = () => {
      if (speakBtn) speakBtn.classList.remove('speaking');
    };

    if (q.type === 'audio_pick') {
      // शब्द बोलना
      audio.speak(q.target, null, onEnd);
    } else if (q.type === 'sentence_build') {
      // पूरा वाक्य बोलना
      const full = q.sentence.join(' ');
      audio.speak(full, null, onEnd);
    } else if (q.type === 'newspaper_headline' || q.type === 'news_comprehension') {
      audio.speak(q.prompt || q.target, null, onEnd);
    } else if (q.prompt) {
      audio.speak(q.prompt, null, onEnd);
    } else if (q.target) {
      audio.speak(q.target, null, onEnd);
    }
  }

  // 4 बहुविकल्पीय कार्ड रेंडर करना
  renderChoiceOptions(options) {
    const container = document.getElementById('game-options-container');
    if (!container) return;

    container.innerHTML = '';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (game.answeredCurrent) return;
        this.handleChoiceAnswer(opt, btn);
      });

      container.appendChild(btn);
    });
  }

  // बहुविकल्पीय उत्तर संभालना
  handleChoiceAnswer(selectedOption, clickedBtn) {
    const result = game.checkChoiceAnswer(selectedOption);
    if (!result) return;

    const allBtns = document.querySelectorAll('.option-btn');

    if (result.isCorrect) {
      clickedBtn.classList.add('correct');
      audio.speakPraise();
      this.showGameFeedback(true, "शाबाश! बिल्कुल सही उत्तर।");
    } else {
      clickedBtn.classList.add('wrong');
      // सही वाला दिखाएँ
      allBtns.forEach(btn => {
        if (btn.textContent.trim() === result.target) {
          btn.classList.add('correct');
        }
      });
      this.showGameFeedback(false, `सही उत्तर: ${result.target}`);
      audio.speak(`सही शब्द है ${result.target}`);
    }

    const nextBtn = document.getElementById('btn-next-question');
    if (nextBtn) nextBtn.style.display = 'block';
  }

  // वाक्य निर्माण रेंडर करना
  renderSentenceBuilder() {
    const dropZone = document.getElementById('sentence-drop-zone');
    const poolZone = document.getElementById('sentence-pool-zone');

    if (!dropZone || !poolZone) return;

    dropZone.innerHTML = '';
    poolZone.innerHTML = '';

    if (game.sentenceSelectedWords.length === 0) {
      dropZone.classList.add('empty');
    } else {
      dropZone.classList.remove('empty');
      game.sentenceSelectedWords.forEach(word => {
        const chip = document.createElement('button');
        chip.className = 'word-chip in-sentence';
        chip.textContent = word;
        chip.addEventListener('click', () => {
          game.toggleSentenceWord(word, false);
          this.renderSentenceBuilder();
        });
        dropZone.appendChild(chip);
      });
    }

    game.sentenceAvailableWords.forEach(word => {
      const chip = document.createElement('button');
      chip.className = 'word-chip';
      chip.textContent = word;
      chip.addEventListener('click', () => {
        game.toggleSentenceWord(word, true);
        this.renderSentenceBuilder();
      });
      poolZone.appendChild(chip);
    });
  }

  // वाक्य निर्माण उत्तर संभालना
  handleSentenceSubmit() {
    if (game.sentenceSelectedWords.length === 0) {
      this.showToast('पहले नीचे दिए शब्दों को छूकर वाक्य में जोड़ें');
      return;
    }

    const result = game.checkSentenceAnswer();
    if (!result) return;

    const checkBtn = document.getElementById('btn-check-sentence');
    if (checkBtn) checkBtn.style.display = 'none';

    if (result.isCorrect) {
      audio.speakPraise();
      this.showGameFeedback(true, "शाबाश! वाक्य बिल्कुल सही बना।");
    } else {
      this.showGameFeedback(false, `सही वाक्य: "${result.targetSentence}"`);
      audio.speak(`सही वाक्य है: ${result.targetSentence}`);
    }

    const nextBtn = document.getElementById('btn-next-question');
    if (nextBtn) nextBtn.style.display = 'block';
  }

  // गेम फीडबैक बैनर दिखाना
  showGameFeedback(isSuccess, message) {
    const banner = document.getElementById('game-feedback-banner');
    if (!banner) return;

    banner.className = `feedback-banner ${isSuccess ? 'success' : 'error'}`;
    banner.innerHTML = `
      <div class="feedback-text">
        <span>${isSuccess ? '🎉' : '💡'}</span>
        <span>${message}</span>
      </div>
    `;
    banner.style.display = 'flex';
  }

  // अगला प्रश्न या स्तर समाप्त
  handleNextQuestion() {
    if (game.hasNextQuestion()) {
      game.loadQuestion(game.currentQIndex + 1);
      this.renderCurrentQuestion();
    } else {
      // स्तर समाप्त
      const summary = game.finishLevel();
      this.showLevelCompleteModal(summary);
    }
  }

  // स्तर पूर्ण होने का मोडल दिखाना
  showLevelCompleteModal(summary) {
    const modal = document.getElementById('level-complete-modal');
    if (!modal) return;

    const starsEl = document.getElementById('modal-stars-container');
    if (starsEl) {
      starsEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const starSpan = document.createElement('span');
        starSpan.className = 'star-animated';
        starSpan.style.animationDelay = `${i * 0.2}s`;
        starSpan.textContent = (i < summary.stars) ? '⭐' : '☆';
        starsEl.appendChild(starSpan);
        if (i < summary.stars) {
          setTimeout(() => audio.playStarTone(i), (i + 1) * 200);
        }
      }
    }

    const titleEl = document.getElementById('modal-win-title');
    if (titleEl) titleEl.textContent = `शाबाश! स्तर ${summary.level} पूरा हुआ`;

    const descEl = document.getElementById('modal-win-desc');
    if (descEl) {
      descEl.textContent = `आपने ${summary.totalCount} में से ${summary.correctCount} प्रश्नों के बिल्कुल सही उत्तर दिए! कुल अंक: +${summary.score}`;
    }

    const nextBtn = document.getElementById('modal-next-level-btn');
    if (nextBtn) {
      if (summary.nextLevel) {
        nextBtn.style.display = 'block';
        nextBtn.setAttribute('data-next', summary.nextLevel);
        nextBtn.textContent = `अगला स्तर (${summary.nextLevel}) ➔`;
      } else {
        nextBtn.style.display = 'none';
      }
    }

    modal.classList.add('active');

    // 105वें स्तर पर महा प्रमाण पत्र
    if (summary.level >= 105) {
      setTimeout(() => {
        this.showGrandMasterCertificate();
      }, 1500);
    }
  }

  // महा प्रमाण पत्र दिखाना (Level 105)
  showGrandMasterCertificate() {
    const certModal = document.getElementById('certificate-modal');
    if (certModal) certModal.classList.add('active');
  }

  // मोडल बंद करना
  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  }

  // -------------------------------------------------------------
  // अखबार कॉर्नर (Newspaper Reading Room)
  // -------------------------------------------------------------
  renderNewspaper() {
    const tabsContainer = document.getElementById('newspaper-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      NEWSPAPER_DATA.forEach((item, idx) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${idx === this.currentNewsIndex ? 'active' : ''}`;
        btn.setAttribute('data-index', idx);
        btn.textContent = `${item.categoryIcon} ${item.category}`;
        tabsContainer.appendChild(btn);
      });
    }

    this.renderCurrentNewsArticle();
  }

  switchNewspaperTab(index) {
    this.currentNewsIndex = index;
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
    this.renderCurrentNewsArticle();
    audio.playClickTone();
  }

  renderCurrentNewsArticle() {
    const article = NEWSPAPER_DATA[this.currentNewsIndex] || NEWSPAPER_DATA[0];
    if (!article) return;

    const mastheadEl = document.getElementById('paper-edition-tag');
    if (mastheadEl) mastheadEl.textContent = article.edition;

    const dateEl = document.getElementById('paper-date-tag');
    if (dateEl) dateEl.textContent = article.date;

    const headlineEl = document.getElementById('paper-headline-text');
    if (headlineEl) headlineEl.textContent = article.headline;

    const contentEl = document.getElementById('paper-content-text');
    if (contentEl) {
      contentEl.innerHTML = '';
      // शब्दों को अलग करके क्लिकेबल बनाना
      const words = article.content.split(/(\s+)/);
      words.forEach(chunk => {
        if (chunk.trim() === '') {
          contentEl.appendChild(document.createTextNode(chunk));
        } else {
          const span = document.createElement('span');
          span.className = 'interactive-word';
          span.textContent = chunk;

          span.addEventListener('click', () => {
            // शब्द का उच्चारण
            const cleanWord = chunk.replace(/[।,॥\n\r।?!]/g, '').trim();
            if (cleanWord) {
              document.querySelectorAll('.interactive-word').forEach(w => w.classList.remove('speaking-now'));
              span.classList.add('speaking-now');
              audio.speak(cleanWord, null, () => {
                span.classList.remove('speaking-now');
              });
            }
          });

          contentEl.appendChild(span);
        }
      });
    }
  }

  readCurrentNewsArticle() {
    const article = NEWSPAPER_DATA[this.currentNewsIndex];
    if (!article) return;

    const fullText = `${article.headline}। ${article.content}`;
    this.showToast('पूरा समाचार पढ़ा जा रहा है...');
    audio.speak(fullText);
  }

  // -------------------------------------------------------------
  // ध्वनि चार्ट (ल, र, य विशेष तुलना)
  // -------------------------------------------------------------
  renderSoundChart() {
    const confusionContainer = document.getElementById('confusion-cards-container');
    if (confusionContainer) {
      confusionContainer.innerHTML = '';

      const confusionLetters = [
        { letter: "ल", word: "लड्डू / जल", audio: "ल, ल से लड्डू, जल" },
        { letter: "र", word: "रथ / घर", audio: "र, र से रथ, घर" },
        { letter: "य", word: "यज्ञ / जय", audio: "य, य से यज्ञ, जय" }
      ];

      confusionLetters.forEach(item => {
        const card = document.createElement('div');
        card.className = 'char-sound-card';
        card.innerHTML = `
          <span class="big-letter">${item.letter}</span>
          <span class="sample-word">${item.word}</span>
        `;
        card.addEventListener('click', () => {
          audio.speak(item.audio);
          audio.playClickTone();
        });
        confusionContainer.appendChild(card);
      });
    }

    // सभी स्वर और व्यंजन चार्ट
    const lettersGrid = document.getElementById('all-letters-grid');
    if (lettersGrid) {
      lettersGrid.innerHTML = '';
      const letters = [
        "अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ", "अं", "अः",
        "क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ",
        "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र",
        "ल", "व", "श", "ष", "स", "ह", "क्ष", "त्र", "ज्ञ"
      ];

      letters.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.textContent = char;
        btn.addEventListener('click', () => {
          audio.speak(char);
        });
        lettersGrid.appendChild(btn);
      });
    }
  }

  // -------------------------------------------------------------
  // प्रगति और रिवीजन स्क्रीन
  // -------------------------------------------------------------
  renderProgressScreen() {
    const scoreVal = document.getElementById('report-total-score');
    if (scoreVal) scoreVal.textContent = `${game.state.totalScore || 0}`;

    const starsVal = document.getElementById('report-total-stars');
    if (starsVal) starsVal.textContent = `${game.getTotalStars()}`;

    const levelVal = document.getElementById('report-current-level');
    if (levelVal) levelVal.textContent = `स्तर ${game.state.unlockedLevel || 1}`;

    const mistakesContainer = document.getElementById('mistakes-list-container');
    if (mistakesContainer) {
      mistakesContainer.innerHTML = '';
      if (!game.state.mistakes || game.state.mistakes.length === 0) {
        mistakesContainer.innerHTML = `<p style="text-align:center; color:#94A3B8; padding:16px;">अभी कोई गलत शब्द नहीं है! बहुत बढ़िया।</p>`;
      } else {
        game.state.mistakes.forEach(m => {
          const item = document.createElement('div');
          item.className = 'char-sound-card';
          item.style.marginBottom = '10px';
          item.innerHTML = `
            <span style="font-size:1.6rem; color:#FEF08A; font-weight:800;">${m.target}</span>
            <span style="font-size:1rem; color:#CBD5E1; display:block;">छूकर आवाज़ सुनें</span>
          `;
          item.addEventListener('click', () => {
            audio.speak(m.target);
          });
          mistakesContainer.appendChild(item);
        });
      }
    }
  }

  // टोस्ट संदेश
  showToast(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2400);
    }
  }
}

// ऍप आरंभ करना जब DOM तैयार हो
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
