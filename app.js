(() => {
  const SIZE = 7;
  const QUEUE_SIZE = 7;
  const TOOL_COST = 100;
  const TIMED_DURATION_SECONDS = 5 * 60;
  const ENDLESS_SCORE_TARGETS = [500, 700, 1000, 1500];
  const SHAPE_ACHIEVEMENT_TARGETS = [3, 6, 10, 14];
  const LINE_ACHIEVEMENT_TARGETS = [3, 10, 20, 50];
  const SCORE_ACHIEVEMENT_TARGETS = [500, 1000, 1500, 2000];
  const TOOL_ACHIEVEMENT_TARGETS = [1, 5, 10, 20];
  const PROFILE_KEY = 'chroma-lines-profile-v1';
  const COLORS = [
    { id: 'coral', name: '珊瑚红', value: '#ff6577' },
    { id: 'yellow', name: '明亮黄', value: '#ffd056' },
    { id: 'blue', name: '湖水蓝', value: '#58bfff' }
  ];
  const TOOL_NAMES = { wild: '万能色', hammer: '敲除', undo: '撤回' };
  const ACHIEVEMENT_CATEGORY_META = {
    coral: { title: '红色成就', summary: '收集红色棋子形状；累计完成红色行列消除', icon: '■' },
    yellow: { title: '黄色成就', summary: '收集黄色棋子形状；累计完成黄色行列消除', icon: '■' },
    blue: { title: '蓝色成就', summary: '收集蓝色棋子形状；累计完成蓝色行列消除', icon: '■' },
    progress: { title: '游玩进度', summary: '单局得分挑战；万能色、敲除与撤回使用次数', icon: '★' }
  };
  const SHAPES = {
    1: [[[0, 0]]],
    2: [
      [[0, 0], [0, 1]], [[0, 0], [1, 0]]
    ],
    3: [
      [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]]
    ],
    4: [
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 1], [1, 1], [2, 0], [2, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 1], [1, 0], [1, 1], [2, 1]]
    ]
  };

  const boardEl = document.querySelector('#board');
  const homeScreen = document.querySelector('#homeScreen');
  const gameScreen = document.querySelector('#gameScreen');
  const queueEl = document.querySelector('#queue');
  const scoreEl = document.querySelector('#score');
  const highScoreEl = document.querySelector('#highScore');
  const comboBadge = document.querySelector('#comboBadge');
  const statusText = document.querySelector('#statusText');
  const toolHelp = document.querySelector('#toolHelp');
  const cancelTool = document.querySelector('#cancelTool');
  const toastEl = document.querySelector('#toast');
  const resetDialog = document.querySelector('#resetDialog');
  const gameOverDialog = document.querySelector('#gameOverDialog');
  const profileDialog = document.querySelector('#profileDialog');
  const clearFlash = document.querySelector('#clearFlash');
  const modeLabel = document.querySelector('#modeLabel');
  const progressLabel = document.querySelector('#progressLabel');
  const timeDisplay = document.querySelector('#timeDisplay');
  const queueNote = document.querySelector('#queueNote');
  const headerAvatar = document.querySelector('#headerAvatar');
  const headerAvatarFallback = document.querySelector('#headerAvatarFallback');
  const homeAvatar = document.querySelector('#homeAvatar');
  const homeAvatarFallback = document.querySelector('#homeAvatarFallback');
  const profileAvatar = document.querySelector('#profileAvatar');
  const profileAvatarFallback = document.querySelector('#profileAvatarFallback');
  const usernameInput = document.querySelector('#usernameInput');
  const avatarInput = document.querySelector('#avatarInput');
  const profileHighScore = document.querySelector('#profileHighScore');
  const profileScoreMode = document.querySelector('#profileScoreMode');
  const recentTitle = document.querySelector('#recentTitle');
  const recentList = document.querySelector('#recentList');
  const gameOverMark = document.querySelector('#gameOverMark');
  const gameOverTitle = document.querySelector('#gameOverTitle');
  const gameOverMessage = document.querySelector('#gameOverMessage');
  const achievementDialog = document.querySelector('#achievementDialog');
  const achievementInfoDialog = document.querySelector('#achievementInfoDialog');
  const dailyDialog = document.querySelector('#dailyDialog');
  const achievementList = document.querySelector('#achievementList');
  const achievementOverview = document.querySelector('#achievementOverview');
  const achievementDetail = document.querySelector('#achievementDetail');
  const achievementCategoryList = document.querySelector('#achievementCategoryList');
  const achievementDetailTitle = document.querySelector('#achievementDetailTitle');
  const achievementDetailSummary = document.querySelector('#achievementDetailSummary');
  const achievementPercent = document.querySelector('#achievementPercent');
  const achievementProgressFill = document.querySelector('#achievementProgressFill');
  const achievementStarField = document.querySelector('#achievementStarField');
  const achievementInfoIcon = document.querySelector('#achievementInfoIcon');
  const achievementInfoTitle = document.querySelector('#achievementInfoTitle');
  const achievementInfoCondition = document.querySelector('#achievementInfoCondition');
  const achievementInfoProgress = document.querySelector('#achievementInfoProgress');
  const achievementInfoStatusLabel = document.querySelector('#achievementInfoStatusLabel');
  const achievementInfoStatus = document.querySelector('#achievementInfoStatus');
  const achievementInfoProgressFill = document.querySelector('#achievementInfoProgressFill');
  const dailyList = document.querySelector('#dailyList');

  let board;
  let queue;
  let pieces;
  let nextPieceId;
  let score;
  let lines;
  let moves;
  let combo;
  let profile;
  let pendingAvatar = '';
  let activeAchievementCategory = 'coral';
  let activeTool = null;
  let selectedQueueIndex = 0;
  let dragState = null;
  let hoverAnchor = null;
  let toastTimer = null;
  let helpTimer = null;
  let resolving = false;
  let gameEnded = false;
  let timerId = null;
  let timerDeadline = 0;
  let timeRemaining = TIMED_DURATION_SECONDS;
  let undoSnapshot = null;
  let hasPlayed = false;
  let gameRecorded = false;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function defaultAchievementStats() {
    return {
      shapes: { coral: [], yellow: [], blue: [] },
      clearedLines: { coral: 0, yellow: 0, blue: 0 },
      bestSingleScores: { endless: 0, timed: 0 },
      toolUses: { wild: 0, hammer: 0, undo: 0 }
    };
  }

  function defaultDailyState() {
    return {
      date: localDateKey(),
      colorId: randomItem(COLORS).id,
      toolId: randomItem(Object.keys(TOOL_NAMES)),
      progress: { games: 0, colorClears: 0, toolUses: 0 },
      seenCompleted: []
    };
  }

  function defaultProfile() {
    return {
      username: '玩家',
      avatar: '',
      highScores: { endless: 0, timed: 0 },
      recentScoresByMode: { endless: [], timed: [] },
      mode: 'timed',
      achievementStats: defaultAchievementStats(),
      seenAchievements: [],
      daily: defaultDailyState()
    };
  }

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
      const legacyMode = saved?.difficulty === 'hard' ? 'timed' : 'endless';
      const mode = saved?.mode === 'timed' || saved?.mode === 'endless' ? saved.mode : legacyMode;
      const highScores = {
        endless: Math.max(0, Number(saved?.highScores?.endless ?? saved?.highScores?.normal) || 0),
        timed: Math.max(0, Number(saved?.highScores?.timed ?? saved?.highScores?.hard) || 0)
      };
      const legacyHighScore = Math.max(0, Number(saved?.highScore) || 0);
      highScores[mode] = Math.max(highScores[mode], legacyHighScore);
      const recentScoresByMode = {
        endless: (saved?.recentScoresByMode?.endless || saved?.recentScoresByMode?.normal || []).slice(0, 5),
        timed: (saved?.recentScoresByMode?.timed || saved?.recentScoresByMode?.hard || []).slice(0, 5)
      };
      if (Array.isArray(saved?.recentScores)) {
        saved.recentScores.forEach(item => {
          const itemMode = item?.mode === 'timed' || item?.difficulty === 'hard' ? 'timed' : 'endless';
          if (recentScoresByMode[itemMode].length < 5) recentScoresByMode[itemMode].push(item);
        });
      }
      const baseStats = defaultAchievementStats();
      const savedStats = saved?.achievementStats || {};
      const achievementStats = {
        shapes: Object.fromEntries(COLORS.map(color => [color.id,
          Array.isArray(savedStats?.shapes?.[color.id]) ? [...new Set(savedStats.shapes[color.id])].slice(0, 30) : []
        ])),
        clearedLines: Object.fromEntries(COLORS.map(color => [color.id,
          Math.max(0, Number(savedStats?.clearedLines?.[color.id] ?? baseStats.clearedLines[color.id]) || 0)
        ])),
        bestSingleScores: {
          endless: Math.max(highScores.endless, Number(savedStats?.bestSingleScores?.endless) || 0),
          timed: Math.max(highScores.timed, Number(savedStats?.bestSingleScores?.timed) || 0)
        },
        toolUses: Object.fromEntries(Object.keys(TOOL_NAMES).map(tool => [tool,
          Math.max(0, Number(savedStats?.toolUses?.[tool]) || 0)
        ]))
      };
      const savedDaily = saved?.daily;
      const daily = savedDaily?.date === localDateKey()
        ? {
            date: savedDaily.date,
            colorId: COLORS.some(color => color.id === savedDaily.colorId) ? savedDaily.colorId : randomItem(COLORS).id,
            toolId: TOOL_NAMES[savedDaily.toolId] ? savedDaily.toolId : randomItem(Object.keys(TOOL_NAMES)),
            progress: {
              games: Math.max(0, Number(savedDaily?.progress?.games) || 0),
              colorClears: Math.max(0, Number(savedDaily?.progress?.colorClears) || 0),
              toolUses: Math.max(0, Number(savedDaily?.progress?.toolUses) || 0)
            },
            seenCompleted: Array.isArray(savedDaily.seenCompleted) ? savedDaily.seenCompleted : []
          }
        : defaultDailyState();
      return {
        username: typeof saved?.username === 'string' ? saved.username.slice(0, 12) : '玩家',
        avatar: typeof saved?.avatar === 'string' ? saved.avatar : '',
        mode,
        highScores,
        recentScoresByMode,
        achievementStats,
        seenAchievements: Array.isArray(saved?.seenAchievements) ? saved.seenAchievements : [],
        daily
      };
    } catch (_) {
      return defaultProfile();
    }
  }

  function highScoreFor(mode = profile.mode) {
    return profile.highScores?.[mode] || 0;
  }

  function saveProfileData() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (_) {}
  }

  function avatarLetter() {
    return (profile.username || '玩').trim().charAt(0) || '玩';
  }

  function setAvatarElement(image, fallback, source) {
    image.hidden = !source;
    fallback.hidden = !!source;
    if (source) image.src = source;
    else fallback.textContent = avatarLetter();
  }

  function updateProfileUI() {
    highScoreEl.textContent = highScoreFor();
    const profileMode = profile.mode;
    profileHighScore.textContent = highScoreFor(profileMode);
    profileScoreMode.textContent = `${modeName(profileMode)}模式最高分`;
    recentTitle.textContent = `${modeName(profileMode)}模式最近五局`;
    modeLabel.textContent = `丨${modeName(profile.mode)}模式`;
    queueNote.textContent = '两种模式都可从七枚待选棋子中任选一枚。';
    setAvatarElement(headerAvatar, headerAvatarFallback, profile.avatar);
    setAvatarElement(homeAvatar, homeAvatarFallback, profile.avatar);
    setAvatarElement(profileAvatar, profileAvatarFallback, pendingAvatar || profile.avatar);
    usernameInput.value = profile.username;
    renderRecentScores(profileMode);
    updateNotificationDots();
  }

  function modeName(mode) {
    return mode === 'timed' ? '限时' : '无尽';
  }

  function renderRecentScores(mode = profile.mode) {
    const scores = profile.recentScoresByMode?.[mode] || [];
    recentList.innerHTML = '';
    if (!scores.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-history';
      empty.textContent = `${modeName(mode)}模式还没有记录`;
      recentList.appendChild(empty);
      return;
    }
    scores.slice(0, 5).forEach(item => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = new Date(item.at).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const value = document.createElement('strong');
      value.textContent = `${item.score}分`;
      row.append(label, value);
      recentList.appendChild(row);
    });
  }

  function ensureDailyState() {
    if (profile.daily?.date === localDateKey()) return;
    profile.daily = defaultDailyState();
    saveProfileData();
  }

  function shapeKey(shape) {
    return shape.map(([r, c]) => `${r},${c}`).sort().join('|');
  }

  function achievementDefinitions() {
    const colorLabels = { coral: '红色', yellow: '黄色', blue: '蓝色' };
    const definitions = [];
    COLORS.forEach(color => {
      SHAPE_ACHIEVEMENT_TARGETS.forEach(target => definitions.push({
        id: `${color.id}-shapes-${target}`,
        category: color.id,
        icon: '◆',
        title: `收集${target}种${colorLabels[color.id]}棋子形状`,
        condition: `放置并收集${target}种不同形状的${colorLabels[color.id]}棋子`,
        current: profile.achievementStats.shapes[color.id].length,
        target
      }));
      LINE_ACHIEVEMENT_TARGETS.forEach(target => definitions.push({
        id: `${color.id}-lines-${target}`,
        category: color.id,
        icon: '━',
        title: `累计消除${target}行${colorLabels[color.id]}棋子`,
        condition: `累计完成${target}次${colorLabels[color.id]}整行或整列消除`,
        current: profile.achievementStats.clearedLines[color.id],
        target
      }));
    });
    ['endless', 'timed'].forEach(mode => {
      SCORE_ACHIEVEMENT_TARGETS.forEach(target => definitions.push({
        id: `${mode}-score-${target}`,
        category: 'progress',
        icon: mode === 'timed' ? '⌛' : '∞',
        title: `${modeName(mode)}模式单局获得${target}分`,
        condition: `在${modeName(mode)}模式的单局游戏中达到${target}分`,
        current: profile.achievementStats.bestSingleScores[mode],
        target
      }));
    });
    Object.keys(TOOL_NAMES).forEach(tool => {
      TOOL_ACHIEVEMENT_TARGETS.forEach(target => definitions.push({
        id: `${tool}-uses-${target}`,
        category: 'progress',
        icon: '✦',
        title: `使用${TOOL_NAMES[tool]}${target}次`,
        condition: `累计成功使用${TOOL_NAMES[tool]}道具${target}次`,
        current: profile.achievementStats.toolUses[tool],
        target
      }));
    });
    return definitions;
  }

  function completedAchievementIds() {
    return achievementDefinitions().filter(item => item.current >= item.target).map(item => item.id);
  }

  function acknowledgeAchievement(id) {
    profile.seenAchievements = [...new Set([...profile.seenAchievements, id])];
    saveProfileData();
    updateNotificationDots();
  }

  function playAchievementStars() {
    const paths = [
      [10, -22, 0, 15], [18, 12, 90, 11], [26, -8, 180, 18], [35, 24, 40, 13],
      [44, -18, 140, 10], [53, 18, 220, 16], [61, -26, 70, 12], [70, 10, 170, 18],
      [78, -14, 260, 11], [86, 22, 110, 15], [31, -30, 300, 9], [67, 30, 330, 10]
    ];
    achievementStarField.innerHTML = '';
    paths.forEach(([left, drift, delay, size], index) => {
      const star = document.createElement('i');
      star.textContent = index % 3 === 0 ? '✧' : '✦';
      star.style.setProperty('--star-left', `${left}%`);
      star.style.setProperty('--star-drift', `${drift}px`);
      star.style.setProperty('--star-delay', `${delay}ms`);
      star.style.setProperty('--star-size', `${size}px`);
      achievementStarField.appendChild(star);
    });
  }

  function openAchievementInfo(item, row, state) {
    const complete = item.current >= item.target;
    const newlyCompleted = complete && !profile.seenAchievements.includes(item.id);
    achievementInfoDialog.dataset.category = item.category;
    achievementInfoIcon.textContent = item.icon;
    achievementInfoTitle.textContent = item.title;
    achievementInfoCondition.textContent = `达成条件：${item.condition}`;
    achievementInfoProgress.classList.toggle('complete', complete && !newlyCompleted);
    achievementInfoStatusLabel.textContent = complete && !newlyCompleted ? '完成状态' : '当前进度';
    achievementInfoStatus.textContent = complete && !newlyCompleted
      ? '已达成'
      : `${Math.min(item.current, item.target)} / ${item.target}`;
    achievementInfoProgressFill.style.width = `${Math.min(100, item.current / item.target * 100)}%`;
    achievementStarField.innerHTML = '';
    achievementInfoDialog.showModal();
    if (!newlyCompleted) return;
    playAchievementStars();
    acknowledgeAchievement(item.id);
    row.querySelector('.item-notification-dot')?.remove();
    row.classList.remove('newly-complete');
    state.textContent = '已达成';
  }

  function dailyTaskDefinitions() {
    ensureDailyState();
    const color = COLORS.find(item => item.id === profile.daily.colorId) || COLORS[0];
    const progress = profile.daily.progress;
    return [
      { id: 'game', icon: '▶', title: '完成一局游戏', current: progress.games, target: 1 },
      { id: 'color', icon: '━', title: `完成5次${color.name}行列消除`, current: progress.colorClears, target: 5 },
      { id: 'tool', icon: '✦', title: `使用${TOOL_NAMES[profile.daily.toolId]}1次`, current: progress.toolUses, target: 1 }
    ];
  }

  function updateNotificationDots() {
    if (!profile) return;
    ensureDailyState();
    const completedAchievements = completedAchievementIds();
    const unseenAchievements = completedAchievements.some(id => !profile.seenAchievements.includes(id));
    const completedDaily = dailyTaskDefinitions().filter(task => task.current >= task.target).map(task => task.id);
    const unseenDaily = completedDaily.some(id => !profile.daily.seenCompleted.includes(id));
    document.querySelectorAll('[data-notification="achievement"]').forEach(dot => dot.classList.toggle('show', unseenAchievements));
    document.querySelectorAll('[data-notification="daily"]').forEach(dot => dot.classList.toggle('show', unseenDaily));
    document.querySelectorAll('[data-notification="back"]').forEach(dot => dot.classList.toggle('show', unseenAchievements || unseenDaily));
  }

  function updateAchievementCollectionProgress(all = achievementDefinitions()) {
    const completed = all.filter(item => item.current >= item.target).length;
    const percent = Math.round(completed / all.length * 100);
    achievementPercent.textContent = `${percent}%`;
    achievementProgressFill.style.width = `${percent}%`;
  }

  function renderAchievementOverview() {
    const all = achievementDefinitions();
    updateAchievementCollectionProgress(all);
    achievementOverview.hidden = false;
    achievementDetail.hidden = true;
    achievementCategoryList.innerHTML = '';
    Object.entries(ACHIEVEMENT_CATEGORY_META).forEach(([category, meta]) => {
      const items = all.filter(item => item.category === category);
      const completed = items.filter(item => item.current >= item.target).length;
      const hasUnseenCompletion = items.some(item => item.current >= item.target && !profile.seenAchievements.includes(item.id));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'achievement-category-card';
      button.dataset.category = category;
      button.setAttribute('aria-label', `查看${meta.title}`);
      const icon = document.createElement('span');
      icon.className = 'achievement-category-icon';
      icon.textContent = meta.icon;
      const copy = document.createElement('span');
      copy.className = 'achievement-category-copy';
      const title = document.createElement('strong');
      title.textContent = meta.title;
      const summary = document.createElement('small');
      summary.textContent = meta.summary;
      copy.append(title, summary);
      const state = document.createElement('span');
      state.className = 'achievement-category-state';
      const stateValue = document.createElement('strong');
      stateValue.textContent = `${completed}/${items.length}`;
      const stateLabel = document.createElement('small');
      stateLabel.textContent = '已收集';
      state.append(stateValue, stateLabel);
      const arrow = document.createElement('b');
      arrow.textContent = '›';
      button.append(icon, copy, state, arrow);
      if (hasUnseenCompletion) {
        const dot = document.createElement('i');
        dot.className = 'notification-dot category-notification-dot show';
        dot.setAttribute('aria-hidden', 'true');
        button.appendChild(dot);
      }
      button.addEventListener('click', () => renderAchievements(category));
      achievementCategoryList.appendChild(button);
    });
  }

  function renderAchievements(category = activeAchievementCategory) {
    activeAchievementCategory = category;
    const all = achievementDefinitions();
    const meta = ACHIEVEMENT_CATEGORY_META[category];
    updateAchievementCollectionProgress(all);
    achievementOverview.hidden = true;
    achievementDetail.hidden = false;
    achievementDetailTitle.textContent = meta.title;
    achievementDetailSummary.textContent = meta.summary;
    achievementList.innerHTML = '';
    all.filter(item => item.category === category).forEach(item => {
      const complete = item.current >= item.target;
      const newlyCompleted = complete && !profile.seenAchievements.includes(item.id);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `achievement-item${complete ? ' complete' : ''}${newlyCompleted ? ' newly-complete' : ''}`;
      row.dataset.category = item.category;
      row.setAttribute('aria-label', `查看成就：${item.title}`);
      const icon = document.createElement('span');
      icon.className = 'achievement-icon';
      icon.textContent = item.icon;
      const copy = document.createElement('div');
      copy.className = 'achievement-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      copy.appendChild(title);
      const state = document.createElement('span');
      state.className = 'achievement-state';
      state.textContent = newlyCompleted ? '新达成' : complete ? '已达成' : '未达成';
      row.append(icon, copy, state);
      if (newlyCompleted) {
        const dot = document.createElement('i');
        dot.className = 'notification-dot item-notification-dot show';
        dot.setAttribute('aria-hidden', 'true');
        row.appendChild(dot);
      }
      row.addEventListener('click', () => openAchievementInfo(item, row, state));
      achievementList.appendChild(row);
    });
  }

  function renderDailyTasks() {
    dailyList.innerHTML = '';
    dailyTaskDefinitions().forEach(task => {
      const complete = task.current >= task.target;
      const row = document.createElement('article');
      row.className = `daily-item${complete ? ' complete' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'daily-icon';
      icon.textContent = task.icon;
      const copy = document.createElement('div');
      copy.className = 'daily-copy';
      const head = document.createElement('div');
      head.className = 'daily-copy-head';
      const title = document.createElement('strong');
      title.textContent = task.title;
      const state = document.createElement('span');
      state.className = 'daily-state';
      state.textContent = complete ? '已完成' : `${Math.min(task.current, task.target)}/${task.target}`;
      head.append(title, state);
      const track = document.createElement('div');
      track.className = 'daily-progress';
      const fill = document.createElement('i');
      fill.style.width = `${Math.min(100, task.current / task.target * 100)}%`;
      track.appendChild(fill);
      copy.append(head, track);
      row.append(icon, copy);
      dailyList.appendChild(row);
    });
  }

  function recordPlacedShape(piece) {
    const collection = profile.achievementStats.shapes[piece.color.id];
    const key = shapeKey(piece.shape);
    if (!collection.includes(key)) collection.push(key);
    saveProfileData();
    updateNotificationDots();
  }

  function recordScoreProgress() {
    profile.achievementStats.bestSingleScores[profile.mode] = Math.max(
      profile.achievementStats.bestSingleScores[profile.mode], score
    );
    saveProfileData();
    updateNotificationDots();
  }

  function recordLineProgress(clearedLines) {
    ensureDailyState();
    clearedLines.forEach(line => {
      if (!profile.achievementStats.clearedLines[line.colorId] && profile.achievementStats.clearedLines[line.colorId] !== 0) return;
      profile.achievementStats.clearedLines[line.colorId] += 1;
      if (line.colorId === profile.daily.colorId) profile.daily.progress.colorClears += 1;
    });
    saveProfileData();
    updateNotificationDots();
  }

  function recordToolProgress(tool) {
    ensureDailyState();
    profile.achievementStats.toolUses[tool] += 1;
    if (tool === profile.daily.toolId) profile.daily.progress.toolUses += 1;
    saveProfileData();
    updateNotificationDots();
  }

  function recordCurrentGame() {
    if (!hasPlayed || gameRecorded) return;
    ensureDailyState();
    const mode = profile.mode;
    if (!Array.isArray(profile.recentScoresByMode[mode])) profile.recentScoresByMode[mode] = [];
    profile.recentScoresByMode[mode].unshift({ score, mode, at: Date.now() });
    profile.recentScoresByMode[mode] = profile.recentScoresByMode[mode].slice(0, 5);
    profile.highScores[mode] = Math.max(highScoreFor(mode), score);
    profile.achievementStats.bestSingleScores[mode] = Math.max(profile.achievementStats.bestSingleScores[mode], score);
    profile.daily.progress.games += 1;
    gameRecorded = true;
    saveProfileData();
    updateNotificationDots();
  }

  function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
  function randomColor() {
    return randomItem(COLORS);
  }
  function weightedSize() {
    const n = Math.random();
    if (n < .20) return 1;
    if (n < .48) return 2;
    if (n < .78) return 3;
    return 4;
  }
  function normalizeShape(cells) {
    const minR = Math.min(...cells.map(c => c[0]));
    const minC = Math.min(...cells.map(c => c[1]));
    return cells.map(([r, c]) => [r - minR, c - minC]);
  }
  function makeQueuePiece() {
    const size = weightedSize();
    return {
      previewId: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      shape: normalizeShape(randomItem(SHAPES[size])).map(cell => [...cell]),
      color: randomColor()
    };
  }
  function freshBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function createUndoSnapshot() {
    return {
      board: board.map(row => row.map(cell => cell ? { ...cell } : null)),
      queue: queue.map(piece => ({ ...piece, shape: piece.shape.map(cell => [...cell]) })),
      pieces: new Map([...pieces].map(([id, piece]) => [id, {
        ...piece,
        cells: piece.cells.map(cell => ({ ...cell }))
      }])),
      nextPieceId,
      score,
      lines,
      moves,
      combo,
      selectedQueueIndex
    };
  }

  function restoreUndoSnapshot(snapshot) {
    board = snapshot.board;
    queue = snapshot.queue;
    pieces = snapshot.pieces;
    nextPieceId = snapshot.nextPieceId;
    score = snapshot.score;
    lines = snapshot.lines;
    moves = snapshot.moves;
    combo = snapshot.combo;
    selectedQueueIndex = snapshot.selectedQueueIndex;
    activeTool = null;
  }

  function initGame(announce = true) {
    stopTimer();
    board = freshBoard();
    queue = Array.from({ length: QUEUE_SIZE }, makeQueuePiece);
    pieces = new Map();
    nextPieceId = 1;
    score = 0;
    lines = 0;
    moves = 0;
    combo = 0;
    selectedQueueIndex = 0;
    dragState = null;
    resolving = false;
    gameEnded = false;
    undoSnapshot = null;
    hasPlayed = false;
    gameRecorded = false;
    setTool(null);
    renderAll();
    updateProfileUI();
    startGameTimer();
    if (announce) showToast('新的一局开始了');
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function updateTimerDisplay() {
    if (profile.mode === 'endless') {
      const target = ENDLESS_SCORE_TARGETS.find(value => score < value);
      progressLabel.textContent = '目标分数';
      timeDisplay.textContent = target ?? '已完成';
      timeDisplay.setAttribute('aria-label', target
        ? `无尽模式，当前目标${target}分`
        : '无尽模式，全部目标已完成');
      timeDisplay.classList.remove('urgent');
      timeDisplay.parentElement.classList.remove('urgent');
      return;
    }
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = String(timeRemaining % 60).padStart(2, '0');
    progressLabel.textContent = '剩余时间';
    timeDisplay.textContent = `${minutes}:${seconds}`;
    timeDisplay.setAttribute('aria-label', `限时模式，剩余${minutes}分${seconds}秒`);
    timeDisplay.classList.toggle('urgent', timeRemaining <= 30);
    timeDisplay.parentElement.classList.toggle('urgent', timeRemaining <= 30);
  }

  function updateTimer() {
    if (profile.mode !== 'timed' || gameEnded) return;
    const nextRemaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
    if (nextRemaining === timeRemaining) return;
    timeRemaining = nextRemaining;
    updateTimerDisplay();
    if (timeRemaining === 0) endGame('time');
  }

  function startGameTimer() {
    timeRemaining = TIMED_DURATION_SECONDS;
    updateTimerDisplay();
    if (profile.mode !== 'timed') return;
    timerDeadline = Date.now() + TIMED_DURATION_SECONDS * 1000;
    timerId = setInterval(updateTimer, 250);
  }

  function createCells() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `第${r + 1}行第${c + 1}列，空格`);
        cell.addEventListener('click', () => handleCellClick(r, c));
        cell.addEventListener('mouseenter', () => { hoverAnchor = [r, c]; renderBoard(); });
        cell.addEventListener('mouseleave', () => { hoverAnchor = null; renderBoard(); });
        boardEl.appendChild(cell);
      }
    }
  }

  function renderAll() {
    renderQueue();
    renderBoard();
    scoreEl.textContent = score;
    highScoreEl.textContent = highScoreFor();
    comboBadge.hidden = combo < 2;
    comboBadge.textContent = combo >= 2 ? `连消 ×${2 ** (combo - 1)}` : '';
    updateTimerDisplay();
    updateStatus();
  }

  function shapeBounds(shape) {
    return {
      rows: Math.max(...shape.map(c => c[0])) + 1,
      cols: Math.max(...shape.map(c => c[1])) + 1
    };
  }

  function renderMiniPiece(piece) {
    const bounds = shapeBounds(piece.shape);
    const mini = document.createElement('div');
    mini.className = 'mini-piece';
    mini.style.gridTemplateRows = `repeat(${bounds.rows}, 15px)`;
    mini.style.gridTemplateColumns = `repeat(${bounds.cols}, 15px)`;
    piece.shape.forEach(([r, c]) => {
      const block = document.createElement('i');
      block.className = 'mini-cell';
      block.style.gridRow = r + 1;
      block.style.gridColumn = c + 1;
      block.style.background = piece.color.value;
      mini.appendChild(block);
    });
    return mini;
  }

  function renderQueue() {
    queueEl.innerHTML = '';
    queue.forEach((piece, i) => {
      const card = document.createElement('div');
      const selected = i === selectedQueueIndex;
      card.className = `queue-card${selected ? ' selected' : ''}`;
      card.dataset.order = String(i + 1).padStart(2, '0');
      card.dataset.index = i;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      card.setAttribute('aria-disabled', 'false');
      card.setAttribute('aria-label', `待选第${i + 1}枚：${piece.color.name}，${piece.shape.length}格棋子，可拖入棋盘`);
      card.appendChild(renderMiniPiece(piece));
      card.addEventListener('pointerdown', event => beginPieceDrag(event, i, card));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectQueuePiece(i);
        }
      });
      queueEl.appendChild(card);
    });
  }

  function selectQueuePiece(index) {
    selectedQueueIndex = Math.max(0, Math.min(index, queue.length - 1));
    [...queueEl.children].forEach((card, i) => {
      const selected = i === selectedQueueIndex;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    if (activeTool) {
      activeTool = null;
      document.querySelectorAll('.tool-action').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      cancelTool.hidden = true;
    }
    renderBoard();
    updateStatus();
    return true;
  }

  function beginPieceDrag(event, index, card) {
    if (event.button !== undefined && event.button !== 0) return;
    if (resolving || gameEnded) return;
    event.preventDefault();
    if (!selectQueuePiece(index)) return;
    dragState = {
      pointerId: event.pointerId,
      index,
      card,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
      ghost: null
    };
    card.setPointerCapture?.(event.pointerId);
    card.addEventListener('pointermove', movePieceDrag);
    card.addEventListener('pointerup', endPieceDrag);
    card.addEventListener('pointercancel', cancelPieceDrag);
  }

  function movePieceDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (!dragState.started && distance > 6) {
      dragState.started = true;
      dragState.card.classList.add('dragging');
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.appendChild(renderDragPiece(queue[dragState.index]));
      document.body.appendChild(ghost);
      dragState.ghost = ghost;
    }
    if (!dragState.started) return;
    dragState.ghost.style.left = `${event.clientX}px`;
    dragState.ghost.style.top = `${event.clientY}px`;
    hoverAnchor = dragAnchorAtPoint(event.clientX, event.clientY, queue[dragState.index]);
    dragState.dropAnchor = hoverAnchor;
    renderBoard();
  }

  function renderDragPiece(piece) {
    const bounds = shapeBounds(piece.shape);
    const dragPiece = document.createElement('div');
    dragPiece.className = 'drag-piece';
    dragPiece.style.gridTemplateRows = `repeat(${bounds.rows}, var(--cell))`;
    dragPiece.style.gridTemplateColumns = `repeat(${bounds.cols}, var(--cell))`;
    piece.shape.forEach(([r, c]) => {
      const cell = document.createElement('i');
      cell.className = 'drag-cell';
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;
      cell.style.background = piece.color.value;
      dragPiece.appendChild(cell);
    });
    return dragPiece;
  }

  function dragAnchorAtPoint(x, y, piece) {
    const boardRect = boardEl.getBoundingClientRect();
    if (x < boardRect.left || x > boardRect.right || y < boardRect.top || y > boardRect.bottom) return null;

    const firstCell = boardEl.querySelector('.cell');
    if (!firstCell) return null;
    const cellRect = firstCell.getBoundingClientRect();
    const boardStyle = getComputedStyle(boardEl);
    const columnGap = Number.parseFloat(boardStyle.columnGap) || 0;
    const rowGap = Number.parseFloat(boardStyle.rowGap) || 0;
    const bounds = shapeBounds(piece.shape);

    // Snap the centered drag preview to the nearest board origin. This avoids
    // forcing even-width/height shapes a whole cell to either side of the pointer.
    const pieceWidth = bounds.cols * cellRect.width + (bounds.cols - 1) * columnGap;
    const pieceHeight = bounds.rows * cellRect.height + (bounds.rows - 1) * rowGap;
    const columnPitch = cellRect.width + columnGap;
    const rowPitch = cellRect.height + rowGap;
    return [
      Math.round((y - boardRect.top - pieceHeight / 2) / rowPitch),
      Math.round((x - boardRect.left - pieceWidth / 2) / columnPitch)
    ];
  }

  function finishDragVisuals() {
    if (!dragState) return;
    dragState.card.classList.remove('dragging');
    dragState.ghost?.remove();
    dragState.card.removeEventListener('pointermove', movePieceDrag);
    dragState.card.removeEventListener('pointerup', endPieceDrag);
    dragState.card.removeEventListener('pointercancel', cancelPieceDrag);
    hoverAnchor = null;
  }

  function endPieceDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const state = dragState;
    const anchor = state.started ? state.dropAnchor : null;
    finishDragVisuals();
    dragState = null;
    renderBoard();
    if (anchor) placeSelected(state.index, anchor[0], anchor[1]);
  }

  function cancelPieceDrag() {
    finishDragVisuals();
    dragState = null;
    renderBoard();
  }

  function getPreviewCells(anchorR, anchorC) {
    if (activeTool) return [];
    return queue[selectedQueueIndex].shape.map(([dr, dc]) => ({ r: anchorR + dr, c: anchorC + dc }));
  }

  function isPreviewValid(cells) {
    return cells.length > 0 && cells.every(({ r, c }) => {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      return !board[r][c];
    });
  }

  function renderBoard() {
    const preview = hoverAnchor ? getPreviewCells(...hoverAnchor) : [];
    const previewValid = isPreviewValid(preview);
    const previewKeys = new Set(preview.map(x => `${x.r}-${x.c}`));
    [...boardEl.children].forEach((cellEl, index) => {
      const r = Math.floor(index / SIZE);
      const c = index % SIZE;
      const data = board[r][c];
      cellEl.className = 'cell';
      cellEl.style.background = '';
      if (data) {
        cellEl.classList.add('filled');
        if (data.wild) cellEl.classList.add('wild');
        else cellEl.style.background = data.color.value;
        cellEl.setAttribute('aria-label', `第${r + 1}行第${c + 1}列，${data.wild ? '万能色' : data.color.name}`);
      } else {
        cellEl.setAttribute('aria-label', `第${r + 1}行第${c + 1}列，空格`);
      }
      if (previewKeys.has(`${r}-${c}`)) cellEl.classList.add(previewValid ? 'preview-ok' : 'preview-bad');
    });
  }

  function updateStatus() {
    const dot = document.querySelector('.status-dot');
    if (gameEnded) {
      statusText.textContent = '本局已结束，请开始新一局';
      dot.style.background = '#ee4f5f';
      return;
    }
    if (!activeTool) {
      const selectedFits = hasValidPlacement(queue[selectedQueueIndex].shape);
      statusText.textContent = selectedFits
        ? '拖动任意待选棋子到棋盘'
        : '所选棋子无处可放，可改选其他棋子';
      dot.style.background = selectedFits ? '#5ee6a8' : '#ff6577';
      toolHelp.innerHTML = `<strong>${modeName(profile.mode)}模式</strong><p>可拖动七枚待选棋子中的任意一枚。</p>`;
    } else if (activeTool === 'wild') {
      statusText.textContent = '选择一个已放置格子，将它变成万能色';
      dot.style.background = '#a979ff';
      toolHelp.innerHTML = '<strong>万能颜色 · −100分</strong><p>只能改变一格；若它处于交叉点，可分别适配横线与竖线的颜色。</p>';
    } else if (activeTool === 'hammer') {
      statusText.textContent = '选择一个已放置格子敲除';
      dot.style.background = '#ffd056';
      toolHelp.innerHTML = '<strong>敲掉一格 · −100分</strong><p>只清除点击的格子。</p>';
    }
  }

  function handleCellClick(r, c) {
    if (resolving || gameEnded) return;
    if (activeTool === 'wild') return applyWild(r, c);
    if (activeTool === 'hammer') return applyHammer(r, c);
    placeSelected(selectedQueueIndex, r, c);
  }

  async function placeSelected(index, r, c) {
    if (gameEnded) return false;
    const current = queue[index];
    if (!current) return false;
    const targets = current.shape.map(([dr, dc]) => ({ r: r + dr, c: c + dc }));
    if (!isPreviewValid(targets)) {
      showToast('这里放不下所选棋子');
      return false;
    }
    undoSnapshot = createUndoSnapshot();
    hasPlayed = true;
    const id = nextPieceId++;
    const placed = { id, intact: true, color: current.color, cells: [] };
    targets.forEach(pos => {
      const data = { pieceId: id, color: current.color, wild: false };
      board[pos.r][pos.c] = data;
      placed.cells.push({ ...pos, wild: false });
    });
    recordPlacedShape(current);
    pieces.set(id, placed);
    queue.splice(index, 1);
    queue.push(makeQueuePiece());
    selectedQueueIndex = Math.min(index, queue.length - 1);
    moves++;
    renderAll();
    await resolveLines();
    return true;
  }

  function lineColor(cells) {
    if (cells.some(x => !x)) return null;
    const normalColors = new Set(cells.filter(x => !x.wild).map(x => x.color.id));
    return normalColors.size <= 1 ? [...normalColors][0] || 'wild' : null;
  }

  function clearScoreGroups(rows, cols, multiplier) {
    const assignedColors = new Map();
    rows.forEach(line => {
      for (let c = 0; c < SIZE; c++) assignedColors.set(`${line.index}-${c}`, line.colorId);
    });
    cols.forEach(line => {
      for (let r = 0; r < SIZE; r++) {
        const key = `${r}-${line.index}`;
        if (!assignedColors.has(key)) assignedColors.set(key, line.colorId);
      }
    });
    const groups = new Map();
    assignedColors.forEach((colorId, key) => {
      if (!groups.has(colorId)) groups.set(colorId, []);
      groups.get(colorId).push(key);
    });
    return [...groups].map(([colorId, keys]) => ({
      colorId,
      keys,
      points: keys.length * 10 * multiplier
    }));
  }

  function showClearScorePopups(groups) {
    groups.forEach((group, groupIndex) => {
      const centers = group.keys.map(key => {
        const [r, c] = key.split('-').map(Number);
        const rect = boardEl.children[r * SIZE + c]?.getBoundingClientRect();
        return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
      }).filter(Boolean);
      if (!centers.length) return;
      const left = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
      const top = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;
      const color = COLORS.find(item => item.id === group.colorId)?.value || '#7c66ee';
      const popup = document.createElement('div');
      popup.className = 'clear-score-popup';
      popup.textContent = `+${group.points}`;
      popup.style.left = `${left}px`;
      popup.style.top = `${top + groupIndex * 8}px`;
      popup.style.color = color;
      popup.style.fontSize = `${Math.min(38, 17 + Math.log2(group.points / 10 + 1) * 4.5)}px`;
      document.body.appendChild(popup);
      popup.addEventListener('animationend', () => popup.remove(), { once: true });
    });
  }

  function endGame(reason) {
    if (gameEnded) return;
    if (reason === 'score') score = 0;
    gameEnded = true;
    stopTimer();
    activeTool = null;
    document.querySelectorAll('.tool-action').forEach(button => {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    });
    recordCurrentGame();
    renderAll();
    if (resetDialog.open) resetDialog.close('cancel');
    if (profileDialog.open) profileDialog.close();
    if (reason === 'time') {
      gameOverMark.textContent = '⏱';
      gameOverTitle.textContent = '时间到';
      gameOverMessage.textContent = `5分钟已结束，本局得分为${score}分。`;
    } else {
      gameOverMark.textContent = '0';
      gameOverTitle.textContent = '游戏结束';
      gameOverMessage.textContent = '道具费用会使积分低于0，本局得分已停在0分。';
    }
    if (!gameOverDialog.open) gameOverDialog.showModal();
  }

  function chargeTool() {
    if (score - TOOL_COST < 0) {
      endGame('score');
      return false;
    }
    score -= TOOL_COST;
    renderAll();
    return true;
  }

  async function resolveLines() {
    if (gameEnded) return 0;
    const rows = [];
    const cols = [];
    for (let r = 0; r < SIZE; r++) {
      const colorId = lineColor(board[r]);
      if (colorId) rows.push({ index: r, colorId });
    }
    for (let c = 0; c < SIZE; c++) {
      const column = board.map(row => row[c]);
      const colorId = lineColor(column);
      if (colorId) cols.push({ index: c, colorId });
    }
    if (!rows.length && !cols.length) {
      combo = 0;
      renderAll();
      return 0;
    }
    resolving = true;
    const keys = new Set();
    rows.forEach(line => { for (let c = 0; c < SIZE; c++) keys.add(`${line.index}-${c}`); });
    cols.forEach(line => { for (let r = 0; r < SIZE; r++) keys.add(`${r}-${line.index}`); });
    keys.forEach(key => {
      const [r, c] = key.split('-').map(Number);
      boardEl.children[r * SIZE + c].classList.add('clearing');
    });
    clearFlash.classList.remove('show');
    void clearFlash.offsetWidth;
    clearFlash.classList.add('show');
    await new Promise(resolve => setTimeout(resolve, 390));
    if (gameEnded) {
      resolving = false;
      renderAll();
      return 0;
    }
    const affected = new Map();
    keys.forEach(key => {
      const [r, c] = key.split('-').map(Number);
      const data = board[r][c];
      if (data) affected.set(data.pieceId, (affected.get(data.pieceId) || 0) + 1);
      board[r][c] = null;
    });
    affected.forEach((removed, id) => {
      const piece = pieces.get(id);
      if (!piece) return;
      piece.cells = piece.cells.filter(x => board[x.r][x.c]?.pieceId === id);
      if (!piece.cells.length) pieces.delete(id);
      else piece.intact = false;
    });
    const count = rows.length + cols.length;
    lines += count;
    combo += 1;
    const multiplier = 2 ** (combo - 1);
    const gained = keys.size * 10 * multiplier;
    const scoreGroups = clearScoreGroups(rows, cols, multiplier);
    score += gained;
    recordLineProgress([...rows, ...cols]);
    recordScoreProgress();
    if (score > highScoreFor()) {
      profile.highScores[profile.mode] = score;
      saveProfileData();
    }
    resolving = false;
    renderAll();
    showClearScorePopups(scoreGroups);
    showToast(combo > 1 ? `连消 ×${multiplier}，+${gained}分` : `消除成功，+${gained}分`);
    return count;
  }

  async function applyWild(r, c) {
    const data = board[r][c];
    if (!data) { showToast('请选择一个已放置的格子'); return false; }
    if (data.wild) { showToast('这个格子已经是万能色'); return false; }
    undoSnapshot = createUndoSnapshot();
    hasPlayed = true;
    data.wild = true;
    const piece = pieces.get(data.pieceId);
    const part = piece?.cells.find(x => x.r === r && x.c === c);
    if (part) part.wild = true;
    if (!chargeTool()) return true;
    recordToolProgress('wild');
    const cleared = await resolveLines();
    if (!cleared) showToast('万能色已生效，−100分');
    return true;
  }

  function applyHammer(r, c) {
    const data = board[r][c];
    if (!data) { showToast('这里没有可以敲掉的棋子'); return false; }
    undoSnapshot = createUndoSnapshot();
    hasPlayed = true;
    const piece = pieces.get(data.pieceId);
    board[r][c] = null;
    if (piece) {
      piece.cells = piece.cells.filter(x => x.r !== r || x.c !== c);
      piece.intact = false;
      if (!piece.cells.length) pieces.delete(piece.id);
    }
    combo = 0;
    if (!chargeTool()) return true;
    recordToolProgress('hammer');
    showToast('已敲除一格，−100分');
    return true;
  }

  function applyUndo() {
    toolHelp.classList.remove('show');
    if (gameEnded) return showToast('本局已经结束');
    if (resolving) return showToast('请等待消除动画结束');
    if (!undoSnapshot) return showToast('暂无可撤回的操作');
    const snapshot = undoSnapshot;
    undoSnapshot = null;
    restoreUndoSnapshot(snapshot);
    hasPlayed = true;
    if (!chargeTool()) return true;
    recordToolProgress('undo');
    renderAll();
    showToast('已撤回上一步，−100分');
    return true;
  }

  function hasValidPlacement(shape) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cells = shape.map(([dr, dc]) => ({ r: r + dr, c: c + dc }));
        if (isPreviewValid(cells)) return true;
      }
    }
    return false;
  }

  function setTool(tool) {
    if (gameEnded && tool) return;
    activeTool = tool;
    document.querySelectorAll('.tool-action').forEach(btn => {
      const active = btn.dataset.tool === tool;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    cancelTool.hidden = !tool;
    if (board) renderAll();
    toolHelp.classList.remove('show');
  }

  function revealToolHelp() {
    clearTimeout(helpTimer);
    toolHelp.classList.add('show');
    helpTimer = setTimeout(() => toolHelp.classList.remove('show'), 3600);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  function gameState() {
    return {
      score,
      clearedLines: lines,
      moves,
      combo,
      highScore: highScoreFor(),
      highScores: { ...profile.highScores },
      mode: profile.mode,
      timeRemaining: profile.mode === 'timed' ? timeRemaining : null,
      targetScore: profile.mode === 'endless' ? (ENDLESS_SCORE_TARGETS.find(value => score < value) ?? null) : null,
      gameEnded,
      undoAvailable: !!undoSnapshot,
      selectedQueuePosition: selectedQueueIndex + 1,
      candidatePieces: queue.map(piece => ({ color: piece.color.name, size: piece.shape.length, shape: piece.shape })),
      board: board.map(row => row.map(cell => cell ? (cell.wild ? '万能色' : cell.color.name) : null))
    };
  }

  function assertCoordinate(value, name) {
    if (!Number.isInteger(value) || value < 1 || value > SIZE) throw new Error(`${name}必须是1到7之间的整数`);
    return value - 1;
  }

  function registerWebMCP() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const register = tool => {
      try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch (_) {}
    };
    const coordinateSchema = {
      type: 'object',
      properties: {
        row: { type: 'integer', minimum: 1, maximum: 7 },
        column: { type: 'integer', minimum: 1, maximum: 7 }
      },
      required: ['row', 'column'],
      additionalProperties: false
    };
    register({
      name: 'read_game_state', title: '读取本局状态',
      description: '读取当前棋盘、手牌、得分、模式和剩余时间，不改变游戏。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => gameState()
    });
    register({
      name: 'place_candidate_piece', title: '放置待选棋子',
      description: '从七枚待选棋子中任选一枚，放到指定左上角坐标，并执行同色行列消除。',
      inputSchema: {
        type: 'object',
        properties: {
          queuePosition: { type: 'integer', minimum: 1, maximum: 7 },
          row: { type: 'integer', minimum: 1, maximum: 7 },
          column: { type: 'integer', minimum: 1, maximum: 7 }
        },
        required: ['queuePosition', 'row', 'column'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async input => {
        const r = assertCoordinate(input.row, 'row');
        const c = assertCoordinate(input.column, 'column');
        const index = assertCoordinate(input.queuePosition, 'queuePosition');
        if (!(await placeSelected(index, r, c))) throw new Error('所选棋子无法放在该位置');
        return gameState();
      }
    });
    register({
      name: 'change_cell_to_wild', title: '将一格变为万能色',
      description: '花费100分，把指定已占用格变为万能颜色，并检查消除；使用次数不限。',
      inputSchema: coordinateSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async input => {
        const r = assertCoordinate(input.row, 'row');
        const c = assertCoordinate(input.column, 'column');
        if (!(await applyWild(r, c))) throw new Error('该格无法变为万能色');
        return gameState();
      }
    });
    register({
      name: 'hammer_cell', title: '敲掉一格',
      description: '花费100分，敲掉指定位置的一格棋子；使用次数不限。',
      inputSchema: coordinateSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: input => {
        const r = assertCoordinate(input.row, 'row');
        const c = assertCoordinate(input.column, 'column');
        if (!applyHammer(r, c)) throw new Error('指定位置没有棋子');
        return gameState();
      }
    });
    register({
      name: 'undo_last_action', title: '撤回上一步',
      description: '花费100分，恢复最近一次落子或道具操作前的棋盘与待选区；不会恢复限时模式已经流逝的时间。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        if (!applyUndo()) throw new Error('当前没有可撤回的操作');
        return gameState();
      }
    });
  }

  document.querySelectorAll('.tool-action').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tool === 'undo') {
        applyUndo();
        return;
      }
      setTool(activeTool === button.dataset.tool ? null : button.dataset.tool);
    });
  });
  const toolCopy = {
    wild: ['万能颜色 · −100分', '选择棋盘上的一格，将它变成可适配任意颜色的万能格；多格棋子也只改变这一格。'],
    hammer: ['敲掉一格 · −100分', '选择棋盘上的一格将其移除；多格棋子只会被敲掉所选的一格。'],
    undo: ['撤回上一步 · −100分', '恢复最近一次落子或道具操作前的棋盘与待选区；限时模式不会恢复已经流逝的时间。']
  };
  document.querySelectorAll('.tool-info').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const [title, copy] = toolCopy[button.dataset.info];
      toolHelp.innerHTML = `<strong>${title}</strong><p>${copy}</p>`;
      revealToolHelp();
    });
  });
  cancelTool.addEventListener('click', () => setTool(null));
  document.querySelector('#resetButton').addEventListener('click', () => resetDialog.showModal());
  resetDialog.addEventListener('close', () => {
    if (resetDialog.returnValue === 'confirm') {
      recordCurrentGame();
      initGame();
    }
  });
  gameOverDialog.addEventListener('close', () => {
    if (gameOverDialog.returnValue === 'restart') initGame();
  });

  function openProfile() {
    pendingAvatar = profile.avatar;
    updateProfileUI();
    profileDialog.showModal();
  }

  function showHome(recordGame = true) {
    if (recordGame) recordCurrentGame();
    stopTimer();
    if (resetDialog.open) resetDialog.close('cancel');
    if (gameOverDialog.open) gameOverDialog.close('cancel');
    gameScreen.hidden = true;
    homeScreen.hidden = false;
    updateProfileUI();
  }

  function startMode(mode) {
    profile.mode = mode === 'endless' ? 'endless' : 'timed';
    saveProfileData();
    homeScreen.hidden = true;
    gameScreen.hidden = false;
    initGame();
  }

  async function createAvatarDataUrl(file) {
    if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
    if (file.size > 10 * 1024 * 1024) throw new Error('头像原图请控制在10MB以内');
    const objectUrl = URL.createObjectURL(file);
    try {
      const sourceImage = new Image();
      sourceImage.decoding = 'async';
      sourceImage.src = objectUrl;
      await new Promise((resolve, reject) => {
        sourceImage.onload = resolve;
        sourceImage.onerror = () => reject(new Error('无法读取这张图片，请换一张重试'));
      });
      if (!sourceImage.naturalWidth || !sourceImage.naturalHeight) throw new Error('图片尺寸无效，请换一张重试');
      const sourceSize = Math.min(sourceImage.naturalWidth, sourceImage.naturalHeight);
      const sourceX = (sourceImage.naturalWidth - sourceSize) / 2;
      const sourceY = (sourceImage.naturalHeight - sourceSize) / 2;
      const outputSize = Math.min(512, sourceSize);
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('当前浏览器无法处理头像图片');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(sourceImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
      return canvas.toDataURL('image/jpeg', .86);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  document.querySelector('#profileButton').addEventListener('click', openProfile);
  document.querySelector('#homeProfileButton').addEventListener('click', openProfile);
  document.querySelector('#backHomeButton').addEventListener('click', () => showHome(true));
  document.querySelectorAll('[data-start-mode]').forEach(button => {
    button.addEventListener('click', () => startMode(button.dataset.startMode));
  });
  document.querySelector('#closeProfile').addEventListener('click', () => profileDialog.close());
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    try {
      pendingAvatar = await createAvatarDataUrl(file);
      setAvatarElement(profileAvatar, profileAvatarFallback, pendingAvatar);
      showToast('头像预览已更新，记得保存');
    } catch (error) {
      showToast(error.message || '头像处理失败，请重试');
    } finally {
      avatarInput.value = '';
    }
  });
  document.querySelector('#saveProfile').addEventListener('click', () => {
    const nextName = usernameInput.value.trim().slice(0, 12) || '玩家';
    profile.username = nextName;
    profile.avatar = pendingAvatar;
    saveProfileData();
    profileDialog.close();
    updateProfileUI();
    renderAll();
    showToast('个人设置已保存');
  });
  profileDialog.addEventListener('close', () => {
    pendingAvatar = profile.avatar;
    avatarInput.value = '';
  });

  document.querySelector('#achievementButton').addEventListener('click', () => {
    renderAchievementOverview();
    achievementDialog.showModal();
  });
  document.querySelector('#dailyButton').addEventListener('click', () => {
    const completed = dailyTaskDefinitions().filter(task => task.current >= task.target).map(task => task.id);
    profile.daily.seenCompleted = [...new Set([...profile.daily.seenCompleted, ...completed])];
    saveProfileData();
    renderDailyTasks();
    updateNotificationDots();
    dailyDialog.showModal();
  });
  document.querySelector('#achievementBack').addEventListener('click', renderAchievementOverview);
  document.querySelector('#closeAchievementInfo').addEventListener('click', () => achievementInfoDialog.close());
  document.querySelector('#confirmAchievementInfo').addEventListener('click', () => achievementInfoDialog.close());
  document.querySelector('#closeAchievement').addEventListener('click', () => achievementDialog.close());
  document.querySelector('#closeDaily').addEventListener('click', () => dailyDialog.close());
  achievementDialog.addEventListener('close', () => {
    if (achievementInfoDialog.open) achievementInfoDialog.close();
    achievementOverview.hidden = false;
    achievementDetail.hidden = true;
  });
  achievementInfoDialog.addEventListener('close', () => {
    achievementStarField.innerHTML = '';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeTool) setTool(null);
  });

  profile = loadProfile();
  ensureDailyState();
  pendingAvatar = profile.avatar;
  createCells();
  initGame(false);
  showHome(false);
  registerWebMCP();
})();
