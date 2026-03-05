// CJ Focus Chronicles - Script principal

// --- Variables globales ---
let timerInterval = null;
let totalSeconds = 1500;
let remainingSeconds = 1500;
let running = false;
let resourceCount = 0;
let antiCheatTriggered = false;
const ranks = [
  { name: "Novice", min: 0, icon: "🥉", color: "#00ffe7" },
  { name: "Apprenti", min: 5, icon: "🥈", color: "#a259ff" },
  { name: "Aventurier", min: 15, icon: "🥇", color: "#ffd700" },
  { name: "Maître", min: 30, icon: "🏆", color: "#ffb347" },
  { name: "Légende", min: 100, icon: "👑", color: "#ffd700" }
];
const badges = [
  { id: "badge1", label: "Premier Pas", icon: "🌱", tooltip: "Terminer sa toute première session de focus.", check: (r, s) => r >= 1 },
  { id: "badgeStreak", label: "Série de Feu", icon: "🔥", tooltip: "Réussir 3 sessions de focus d'affilée sans aucune triche.", check: (r, s) => s >= 3 },
  { id: "badge10", label: "Routine Installée", icon: "🧩", tooltip: "Atteindre 10 ressources.", check: (r) => r >= 10 },
  { id: "badge30", label: "Focus Pro", icon: "💼", tooltip: "Atteindre 30 ressources.", check: (r) => r >= 30 },
  { id: "badge50", label: "Machine à Focus", icon: "🤖", tooltip: "Atteindre 50 ressources.", check: (r) => r >= 50 },
  { id: "badge100", label: "Légende du Focus", icon: "👑", tooltip: "Atteindre 100 ressources pour débloquer ce badge ultime.", check: (r) => r >= 100 },
  { id: "badge60min", label: "L'Indestructible", icon: "🛡️", tooltip: "Finir une quête de 60 minutes sans quitter l'écran une seule fois.", check: (r, s, l) => l.lastQuest60 },
  { id: "badgeLong", label: "Marathonien", icon: "🏅", tooltip: "Terminer une session de 90 minutes ou plus.", check: (r, s, l) => l.lastQuest90 },
  { id: "badgeStreak10", label: "Inarrêtable", icon: "🚀", tooltip: "Atteindre une série de 10 sessions réussies sans triche.", check: (r, s) => s >= 10 },
  { id: "badgeKofi", label: "Soutien Élite", icon: "☕", tooltip: "Cliquer sur le bouton Ko-fi pour soutenir le créateur.", check: (r, s, l) => l.kofi },
];
let userBadges = {};
let userRank = 0;
let streak = 0;
let lastQuest60 = false;
let lastQuest90 = false;
let kofiClicked = false;

// --- Sélecteurs DOM ---
window.addEventListener('DOMContentLoaded', function() {
      // Info bulle sauvegarde locale
      const infoIcon = document.getElementById('infoIcon');
      const infoPopup = document.getElementById('infoPopup');
      if (infoIcon && infoPopup) {
        infoIcon.addEventListener('click', function(e) {
          e.stopPropagation();
          infoPopup.style.display = (infoPopup.style.display === 'none' || infoPopup.style.display === '') ? 'block' : 'none';
        });
        infoPopup.addEventListener('click', function(e) {
          e.stopPropagation(); // Ne pas fermer si on clique dans la bulle
        });
        document.addEventListener('click', function() {
          infoPopup.style.display = 'none';
        });
      }
    // Overlay de verrouillage
    const lockOverlay = document.getElementById('lockOverlay');
    const unlockBtn = document.getElementById('unlockBtn');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', function() {
        stopSessionAndLose();
      });
    }

    function showLockOverlay() {
      if (lockOverlay) lockOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('lock-active');
    }
    function hideLockOverlay() {
      if (lockOverlay) lockOverlay.style.display = 'none';
      document.body.style.overflow = '';
      document.body.classList.remove('lock-active');
    }
    function stopSessionAndLose() {
      running = false;
      clearInterval(timerInterval);
      releaseWakeLock();
      hideLockOverlay();
      alertBox.textContent = "Session annulée : écran débloqué avant la fin.";
      alertBox.style.display = 'block';
      streak = 0;
      streakDisplay.style.display = 'none';
      miner.classList.remove('mining');
      startBtn.disabled = false;
    }
  // Fermer le menu badges par défaut sur mobile
  if (window.innerWidth <= 600) {
    const accordion = document.getElementById('badgesAccordion');
    if (accordion) accordion.removeAttribute('open');
  }
    // Suppression du système anti-inactivité : la session continue même sans interaction utilisateur.
  const timerDisplay = document.getElementById('timer');
  const minutesInput = document.getElementById('minutes');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const resourceDisplay = document.getElementById('resourceCount');
  const alertBox = document.getElementById('alert');
  const miner = document.getElementById('miner');
  const victory = document.getElementById('victory');
  const victoryClose = document.getElementById('victoryClose');
  const rankTitle = document.getElementById('rankTitle');
  const rankIcon = document.getElementById('rankIcon');
  const badgesList = document.getElementById('badgesList');
  const rankUpAnim = document.getElementById('rankUpAnim');
  const streakDisplay = document.getElementById('streak');
  const kofiBtn = document.getElementById('kofiBtn');
  const copySuccess = document.getElementById('copySuccess');
  const mainContainer = document.getElementById('mainContainer');

  // --- Wake Lock ---
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock libéré');
      });
      console.log('Wake Lock activé');
    } catch (err) {
      console.warn('Wake Lock non disponible:', err);
    }
  }
  async function releaseWakeLock() {
    if (wakeLock) {
      try {
        await wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock désactivé');
      } catch (err) {
        console.warn('Erreur lors de la libération du Wake Lock:', err);
      }
    }
  }
  function updateTimerDisplay() {
    const min = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const sec = (remainingSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${min}:${sec}`;
    // Barre de progression circulaire
    const circle = document.getElementById('progressCircle');
    if (circle) {
      const r = 54;
      const c = 2 * Math.PI * r;
      circle.setAttribute('stroke-dasharray', c);
      // Barre qui se vide au fil du temps
      circle.setAttribute('stroke-dashoffset', (remainingSeconds / totalSeconds) * c);
    }
  }

  function resetTimer(keepDiamonds = true) {
    running = false;
    clearInterval(timerInterval);
    totalSeconds = parseInt(minutesInput.value, 10) * 60;
    remainingSeconds = totalSeconds;
    updateTimerDisplay();
    startBtn.disabled = false;
    miner.classList.remove('mining');
    alertBox.style.display = 'none';
    antiCheatTriggered = false;
    lastQuest60 = false;
    lastQuest90 = false;
      // (anti-inactivité supprimé, rien à arrêter ici)
  }

  function startTimer() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    alertBox.style.display = 'none';
    antiCheatTriggered = false;
    miner.classList.add('mining');
    requestWakeLock();
    showLockOverlay();
    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        running = false;
        startBtn.disabled = false;
        miner.classList.remove('mining');
        releaseWakeLock();
        hideLockOverlay();
        let questDuration = totalSeconds / 60;
        // --- Streak & badges ---
        if (!antiCheatTriggered) {
          streak++;
          if (streak >= 3) streakDisplay.style.display = 'inline';
        } else {
          streak = 0;
          streakDisplay.style.display = 'none';
        }
        // Badge 60min
        if (!antiCheatTriggered && questDuration >= 60) lastQuest60 = true;
        else lastQuest60 = false;
        // Badge 90min
        if (!antiCheatTriggered && questDuration >= 90) lastQuest90 = true;
        else lastQuest90 = false;
        // Gain ressources (X2 si streak)
        let gain = 1;
        if (streak >= 3) gain = 2;
        resourceCount += gain;
        resourceDisplay.textContent = resourceCount;
        // Animation ressource
        resourceDisplay.animate([
          { transform: 'scale(1)', color: '#fff' },
          { transform: 'scale(1.4)', color: 'var(--neon-color,#ffd700)' },
          { transform: 'scale(1)', color: '#fff' }
        ], { duration: 600 });
        // Victoire
        showVictory(gain);
      }
    }, 1000);
    // Ajout bouton copier succès
    if (!document.getElementById('copyBtn')) {
      let btn = document.createElement('button');
      btn.id = 'copyBtn';
      btn.className = 'victory-btn';
      btn.innerText = 'Copier mon succès';
      btn.onclick = function() {
        let txt = `🔥 J'ai réussi ${resourceCount} quêtes sur CJ Focus Chronicles ! Rang : ${ranks[userRank].name}${streak>=3?' (Streak X2!)':''} 🪙 https://cjajlk.github.io/cjajlkGames/`;
        navigator.clipboard.writeText(txt);
        copySuccess.style.display = 'block';
        setTimeout(()=>{copySuccess.style.display='none';}, 1800);
      };
      victory.querySelector('.victory-inner').appendChild(btn);
    }
  }

  function showVictory(gain) {
    const victoryContent = victory.querySelector('.victory-content');
    if (victoryContent) {
      if (gain > 1) {
        victoryContent.textContent = `Bravo, tu as gagné ${gain} ressources ! 🔥 Streak X2`;
      } else {
        victoryContent.textContent = `Bravo, tu as gagné ${gain} ressource !`;
      }
    }
    updateProgression();
    victory.style.display = 'flex';
  }

  victoryClose.addEventListener('click', () => {
    victory.style.display = 'none';
    resetTimer();
  });
  startBtn.addEventListener('click', () => {
    resetTimer();
    startTimer();
  });
  resetBtn.addEventListener('click', () => {
    resetTimer();
  });
  minutesInput.addEventListener('change', () => {
    if (!running) {
      resetTimer();
    }
  });
  // --- Anti-cheat ---
  function triggerAntiCheat() {
    if (running && !antiCheatTriggered) {
      clearInterval(timerInterval);
      running = false;
      remainingSeconds = totalSeconds;
      updateTimerDisplay();
      alertBox.style.display = 'block';
      startBtn.disabled = false;
      miner.classList.remove('mining');
      antiCheatTriggered = true;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      triggerAntiCheat();
    }
  });
  window.addEventListener('blur', () => {
    triggerAntiCheat();
  });
  // --- Progression Logic ---
  function getCurrentRankIdx(quests) {
    let idx = 0;
    for (let i = 0; i < ranks.length; i++) {
      if (quests >= ranks[i].min) idx = i;
    }
    return idx;
  }
  function updateProgression() {
    // Badges
    for (const badge of badges) {
      if (badge.check(resourceCount, streak, {lastQuest60, rank:userRank, kofi:kofiClicked})) {
        userBadges[badge.id] = true;
      }
    }
    saveProgression();
    renderBadges();
    // Rang
    const prevRank = userRank;
    userRank = getCurrentRankIdx(resourceCount);
    renderRank();
    if (userRank !== prevRank) {
      showRankUpAnim();
      updateNeonColor();
    }
    updateNeonColor();
  }
  function renderRank() {
    rankTitle.textContent = `Rang : ${ranks[userRank].name}`;
    rankIcon.textContent = ranks[userRank].icon;
    rankIcon.style.color = ranks[userRank].color;
  }
  function renderBadges() {
    badgesList.innerHTML = '';
    for (const badge of badges) {
      const earned = userBadges[badge.id];
      const span = document.createElement('span');
      span.setAttribute('tabindex', '0');
      span.setAttribute('aria-label', badge.label);
      span.style.fontSize = '2rem';
      span.style.transition = 'filter 0.3s, box-shadow 0.3s';
      span.textContent = badge.icon;
      span.className = 'badge-ico';
      if (earned) {
        span.style.filter = 'none';
        span.style.boxShadow = '0 0 16px 4px var(--neon-color,#00ffe7), 0 0 0 2px var(--neon-color,#00ffe7) inset';
        span.style.background = 'rgba(0,255,231,0.08)';
        span.classList.add('badge-shine');
        // Ajout bouton partager
        const shareBtn = document.createElement('button');
        shareBtn.className = 'badge-share-btn';
        shareBtn.innerText = 'Partager';
        shareBtn.style.marginLeft = '0.5rem';
        shareBtn.onclick = function() {
          let txt = `🎖️ J'ai débloqué le badge "${badge.label}" sur CJ Focus Chronicles ! ${badge.icon} ${badge.tooltip} 🪙 https://cjajlk.github.io/cjajlkGames/`;
          if (navigator.share) {
            navigator.share({ title: 'CJ Focus Chronicles', text: txt, url: 'https://cjajlk.github.io/cjajlkGames/' });
          } else {
            navigator.clipboard.writeText(txt);
            copySuccess.style.display = 'block';
            copySuccess.innerText = 'Badge copié !';
            setTimeout(()=>{copySuccess.style.display='none';}, 1800);
          }
        };
        span.appendChild(shareBtn);
      } else {
        span.style.filter = 'grayscale(1) brightness(0.5)';
        span.style.boxShadow = 'none';
        span.style.background = 'none';
      }
      // Tooltip
      span.addEventListener('mouseenter', function(e){
        showTooltip(badge.tooltip, span);
      });
      span.addEventListener('mouseleave', hideTooltip);
      span.addEventListener('focus', function(e){
        showTooltip(badge.tooltip, span);
      });
      span.addEventListener('blur', hideTooltip);
      badgesList.appendChild(span);
    }
  }
  function saveProgression() {
    localStorage.setItem('cjfc_badges', JSON.stringify(userBadges));
    localStorage.setItem('cjfc_rank', userRank);
    localStorage.setItem('cjfc_resources', resourceCount);
    localStorage.setItem('cjfc_streak', streak);
    localStorage.setItem('cjfc_lastQuest60', lastQuest60?'1':'');
    localStorage.setItem('cjfc_lastQuest90', lastQuest90?'1':'');
    localStorage.setItem('cjfc_kofi', kofiClicked?'1':'');
  }
  function loadProgression() {
    try {
      userBadges = JSON.parse(localStorage.getItem('cjfc_badges')) || {};
      userRank = parseInt(localStorage.getItem('cjfc_rank'), 10) || 0;
      resourceCount = parseInt(localStorage.getItem('cjfc_resources'), 10) || 0;
      streak = parseInt(localStorage.getItem('cjfc_streak'), 10) || 0;
      lastQuest60 = !!localStorage.getItem('cjfc_lastQuest60');
      lastQuest90 = !!localStorage.getItem('cjfc_lastQuest90');
      kofiClicked = !!localStorage.getItem('cjfc_kofi');
      resourceDisplay.textContent = resourceCount;
      if (streak >= 3) streakDisplay.style.display = 'inline';
    } catch(e) {
      userBadges = {};
      userRank = 0;
      streak = 0;
      lastQuest60 = false;
      lastQuest90 = false;
      kofiClicked = false;
    }
    renderRank();
    renderBadges();
    updateNeonColor();
  }
  // --- Neon color évolutive ---
  function updateNeonColor() {
    let color = ranks[userRank].color;
    document.documentElement.style.setProperty('--neon-color', color);
    mainContainer.style.boxShadow = `0 0 32px 4px ${color}, 0 0 0 2px ${color} inset`;
    let h2 = document.querySelector('.badges-section h2');
    if(h2) h2.style.color = color;
  }
  // --- Tooltip badges ---
  let tooltipDiv = null;
  function showTooltip(text, el) {
    hideTooltip();
    tooltipDiv = document.createElement('div');
    tooltipDiv.className = 'badge-tooltip';
    tooltipDiv.innerText = text;
    document.body.appendChild(tooltipDiv);
    let rect = el.getBoundingClientRect();
    tooltipDiv.style.position = 'fixed';
    tooltipDiv.style.left = (rect.left + rect.width/2 - 80) + 'px';
    tooltipDiv.style.top = (rect.top - 38) + 'px';
    tooltipDiv.style.minWidth = '160px';
    tooltipDiv.style.background = 'rgba(24,28,36,0.98)';
    tooltipDiv.style.color = 'var(--neon-color,#00ffe7)';
    tooltipDiv.style.padding = '0.5rem 1rem';
    tooltipDiv.style.borderRadius = '12px';
    tooltipDiv.style.boxShadow = '0 0 12px var(--neon-color,#00ffe7)';
    tooltipDiv.style.fontSize = '1rem';
    tooltipDiv.style.textAlign = 'center';
    tooltipDiv.style.zIndex = 4000;
    tooltipDiv.style.pointerEvents = 'none';
  }
  function hideTooltip() {
    if (tooltipDiv) { tooltipDiv.remove(); tooltipDiv = null; }
  }
  // --- Badge Ko-fi ---
  kofiBtn.addEventListener('click', function() {
    kofiClicked = true;
    updateProgression();
  });
  function showRankUpAnim() {
    rankUpAnim.innerHTML = `<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;'><div style='font-size:3.5rem;text-shadow:0 0 24px #00ffe7;'>${ranks[userRank].icon}</div><div style='color:${ranks[userRank].color};font-size:2.2rem;font-weight:bold;text-shadow:0 0 16px #00ffe7;margin-top:1rem;'>Nouveau rang : ${ranks[userRank].name} !</div></div>`;
    rankUpAnim.style.display = 'flex';
    setTimeout(() => { rankUpAnim.style.display = 'none'; }, 2200);
  }
  // --- Initialisation ---
  loadProgression();
  resetTimer();
});
