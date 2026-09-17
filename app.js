(() => {
  const SIZE = 7;
  const QUEUE_SIZE = 7;
  const PROFILE_KEY = 'chroma-lines-profile-v1';
  const COLORS = [
    { id: 'coral', name: '珊瑚红', value: '#ff6577' },
    { id: 'yellow', name: '明亮黄', value: '#ffd056' },
    { id: 'blue', name: '湖水蓝', value: '#58bfff' }
  ];
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
      [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 1], [1, 1], [2, 0], [2, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 1], [1, 0], [1, 1], [2, 1]],
      [[0, 1], [0, 2], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]
    ]
  };

  const boardEl = document.querySelector('#board');
  const queueEl = document.querySelector('#queue');
  const scoreEl = document.querySelector('#score');
  const highScoreEl = document.querySelector('#highScore');
  const comboBadge = document.querySelector('#comboBadge');
  const refreshButton = document.querySelector('#refreshButton');
  const refreshCountEl = document.querySelector('#refreshCount');
  const statusText = document.querySelector('#statusText');
  const toolHelp = document.querySelector('#toolHelp');
  const cancelTool = document.querySelector('#cancelTool');
  const toastEl = document.querySelector('#toast');
  const resetDialog = document.querySelector('#resetDialog');
  const profileDialog = document.querySelector('#profileDialog');
  const clearFlash = document.querySelector('#clearFlash');
  const modeLabel = document.querySelector('#modeLabel');
  const queueNote = document.querySelector('#queueNote');
  const headerAvatar = document.querySelector('#headerAvatar');
  const headerAvatarFallback = document.querySelector('#headerAvatarFallback');
  const profileAvatar = document.querySelector('#profileAvatar');
  const profileAvatarFallback = document.querySelector('#profileAvatarFallback');
  const usernameInput = document.querySelector('#usernameInput');
  const avatarInput = document.querySelector('#avatarInput');
  const profileHighScore = document.querySelector('#profileHighScore');
  const profileScoreMode = document.querySelector('#profileScoreMode');
  const recentTitle = document.querySelector('#recentTitle');
  const recentList = document.querySelector('#recentList');

  let board;
  let queue;
  let pieces;
  let nextPieceId;
  let refreshes;
  let score;
  let lines;
  let moves;
  let combo;
  let profile;
  let pendingAvatar = '';
  let pendingDifficulty = 'normal';
  let activeTool = null;
  let movePieceId = null;
  let selectedQueueIndex = 0;
  let dragState = null;
  let hoverAnchor = null;
  let toastTimer = null;
  let helpTimer = null;
  let resolving = false;

  function defaultProfile() {
    return {
      username: '玩家',
      avatar: '',
      highScores: { normal: 0, hard: 0 },
      recentScoresByMode: { normal: [], hard: [] },
      difficulty: 'normal'
    };
  }

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
      const difficulty = saved?.difficulty === 'hard' ? 'hard' : 'normal';
      const highScores = {
        normal: Math.max(0, Number(saved?.highScores?.normal) || 0),
        hard: Math.max(0, Number(saved?.highScores?.hard) || 0)
      };
      const legacyHighScore = Math.max(0, Number(saved?.highScore) || 0);
      highScores[difficulty] = Math.max(highScores[difficulty], legacyHighScore);
      const recentScoresByMode = { normal: [], hard: [] };
      ['normal', 'hard'].forEach(mode => {
        if (Array.isArray(saved?.recentScoresByMode?.[mode])) {
          recentScoresByMode[mode] = saved.recentScoresByMode[mode].slice(0, 5);
        }
      });
      if (Array.isArray(saved?.recentScores)) {
        saved.recentScores.forEach(item => {
          const mode = item?.difficulty === 'hard' ? 'hard' : 'normal';
          if (recentScoresByMode[mode].length < 5) recentScoresByMode[mode].push(item);
        });
      }
      return {
        username: typeof saved?.username === 'string' ? saved.username.slice(0, 12) : '玩家',
        avatar: typeof saved?.avatar === 'string' ? saved.avatar : '',
        difficulty,
        highScores,
        recentScoresByMode
      };
    } catch (_) {
      return defaultProfile();
    }
  }

  function highScoreFor(mode = profile.difficulty) {
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
    const profileMode = pendingDifficulty === 'hard' ? 'hard' : 'normal';
    profileHighScore.textContent = highScoreFor(profileMode);
    profileScoreMode.textContent = profileMode === 'hard' ? '困难模式最高分' : '普通模式最高分';
    recentTitle.textContent = profileMode === 'hard' ? '困难模式最近五局' : '普通模式最近五局';
    modeLabel.textContent = profile.difficulty === 'hard' ? '丨困难模式' : '丨普通模式';
    queueNote.textContent = profile.difficulty === 'hard'
      ? '困难模式必须从左到右依次使用；刷新会重抽全部棋子的形状和颜色。'
      : '普通模式可任选一枚；刷新会同时重抽全部棋子的形状和颜色。';
    setAvatarElement(headerAvatar, headerAvatarFallback, profile.avatar);
    setAvatarElement(profileAvatar, profileAvatarFallback, pendingAvatar || profile.avatar);
    usernameInput.value = profile.username;
    document.querySelectorAll('[data-difficulty]').forEach(button => {
      const checked = button.dataset.difficulty === pendingDifficulty;
      button.setAttribute('aria-checked', checked ? 'true' : 'false');
    });
    renderRecentScores(profileMode);
  }

  function renderRecentScores(mode = profile.difficulty) {
    const scores = profile.recentScoresByMode?.[mode] || [];
    recentList.innerHTML = '';
    if (!scores.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-history';
      empty.textContent = `${mode === 'hard' ? '困难' : '普通'}模式还没有记录`;
      recentList.appendChild(empty);
      return;
    }
    scores.slice(0, 5).forEach(item => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = new Date(item.at).toLocaleDateString('zh-CN');
      const value = document.createElement('strong');
      value.textContent = `${item.score}分`;
      row.append(label, value);
      recentList.appendChild(row);
    });
  }

  function recordCurrentGame() {
    if (moves <= 0) return;
    const mode = profile.difficulty;
    profile.recentScoresByMode[mode].unshift({ score, difficulty: mode, at: Date.now() });
    profile.recentScoresByMode[mode] = profile.recentScoresByMode[mode].slice(0, 5);
    profile.highScores[mode] = Math.max(highScoreFor(mode), score);
    saveProfileData();
  }

  function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
  function randomColor(excludeId = null) {
    // Intentionally does not exclude the previous color: a refresh can be ineffective.
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

  function initGame() {
    board = freshBoard();
    queue = Array.from({ length: QUEUE_SIZE }, makeQueuePiece);
    pieces = new Map();
    nextPieceId = 1;
    refreshes = 10;
    score = 0;
    lines = 0;
    moves = 0;
    combo = 0;
    selectedQueueIndex = 0;
    dragState = null;
    resolving = false;
    setTool(null);
    renderAll();
    updateProfileUI();
    showToast('新的一局开始了');
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
    refreshCountEl.textContent = refreshes;
    refreshButton.setAttribute('aria-label', `刷新全部待选棋子，剩余${refreshes}次`);
    refreshButton.disabled = refreshes <= 0 || resolving;
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
      const allowed = profile.difficulty === 'normal' || i === 0;
      const selected = allowed && i === selectedQueueIndex;
      card.className = `queue-card${selected ? ' selected' : ''}${!allowed ? ' locked' : ''}${profile.difficulty === 'hard' && i === 0 ? ' sequence-current' : ''}`;
      card.dataset.order = String(i + 1).padStart(2, '0');
      card.dataset.index = i;
      card.tabIndex = allowed ? 0 : -1;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      card.setAttribute('aria-disabled', allowed ? 'false' : 'true');
      card.setAttribute('aria-label', `待选第${i + 1}枚：${piece.color.name}，${piece.shape.length}格棋子。${allowed ? '可拖入棋盘' : '困难模式中需等待前面的棋子'}`);
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
    if (profile.difficulty === 'hard' && index !== 0) {
      showToast('困难模式必须按顺序使用棋子');
      return false;
    }
    selectedQueueIndex = Math.max(0, Math.min(index, queue.length - 1));
    [...queueEl.children].forEach((card, i) => {
      const selected = i === selectedQueueIndex;
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    if (activeTool) {
      activeTool = null;
      movePieceId = null;
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
    if (resolving) return;
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
    const target = document.elementFromPoint(x, y)?.closest('.cell');
    if (!target) return null;
    const bounds = shapeBounds(piece.shape);
    return [
      Number(target.dataset.row) - Math.floor((bounds.rows - 1) / 2),
      Number(target.dataset.col) - Math.floor((bounds.cols - 1) / 2)
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
    if (activeTool === 'move' && movePieceId) {
      const piece = pieces.get(movePieceId);
      if (!piece) return [];
      const minR = Math.min(...piece.cells.map(x => x.r));
      const minC = Math.min(...piece.cells.map(x => x.c));
      return piece.cells.map(x => ({ r: anchorR + x.r - minR, c: anchorC + x.c - minC }));
    }
    if (activeTool) return [];
    return queue[selectedQueueIndex].shape.map(([dr, dc]) => ({ r: anchorR + dr, c: anchorC + dc }));
  }

  function isPreviewValid(cells, movingId = null) {
    return cells.length > 0 && cells.every(({ r, c }) => {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      return !board[r][c] || (movingId && board[r][c].pieceId === movingId);
    });
  }

  function renderBoard() {
    const preview = hoverAnchor ? getPreviewCells(...hoverAnchor) : [];
    const previewValid = isPreviewValid(preview, movePieceId);
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
        if (movePieceId && data.pieceId === movePieceId) cellEl.classList.add('piece-selected');
        cellEl.setAttribute('aria-label', `第${r + 1}行第${c + 1}列，${data.wild ? '万能色' : data.color.name}`);
      } else {
        cellEl.setAttribute('aria-label', `第${r + 1}行第${c + 1}列，空格`);
      }
      if (previewKeys.has(`${r}-${c}`)) cellEl.classList.add(previewValid ? 'preview-ok' : 'preview-bad');
    });
  }

  function updateStatus() {
    const dot = document.querySelector('.status-dot');
    if (!activeTool) {
      const selectedFits = hasValidPlacement(queue[selectedQueueIndex].shape);
      statusText.textContent = selectedFits
        ? (profile.difficulty === 'hard' ? '拖动第一枚棋子到棋盘' : '拖动任意待选棋子到棋盘')
        : (profile.difficulty === 'hard' ? '当前棋子无处可放，请使用道具' : '所选棋子无处可放，可改选其他棋子');
      dot.style.background = selectedFits ? '#5ee6a8' : '#ff6577';
      toolHelp.innerHTML = profile.difficulty === 'hard'
        ? '<strong>困难模式</strong><p>只能使用待选区最左侧的棋子，放置后队列向前移动。</p>'
        : '<strong>普通模式</strong><p>可拖动七枚待选棋子中的任意一枚。</p>';
    } else if (activeTool === 'wild') {
      statusText.textContent = '选择一个已放置格子，将它变成万能色';
      dot.style.background = '#a979ff';
      toolHelp.innerHTML = '<strong>万能颜色</strong><p>只能改变一格；若它处于交叉点，可分别适配横线与竖线的颜色。</p>';
    } else if (activeTool === 'hammer') {
      statusText.textContent = '选择一个已放置格子敲除';
      dot.style.background = '#ffd056';
      toolHelp.innerHTML = '<strong>敲掉一格</strong><p>只清除点击的格子。被破坏的多格棋子之后不能再整体移动。</p>';
    } else if (!movePieceId) {
      statusText.textContent = '先选择一个完整棋子';
      dot.style.background = '#58bfff';
      toolHelp.innerHTML = '<strong>整体移动 · 第一步</strong><p>点击完整棋子的任意格。已被敲除或部分消除的棋子不能移动。</p>';
    } else {
      statusText.textContent = '再选择新位置的左上角';
      dot.style.background = '#58bfff';
      toolHelp.innerHTML = '<strong>整体移动 · 第二步</strong><p>绿色预览表示新位置可用。再次点击原棋子可以取消选择。</p>';
    }
  }

  function handleCellClick(r, c) {
    if (resolving) return;
    if (activeTool === 'wild') return applyWild(r, c);
    if (activeTool === 'hammer') return applyHammer(r, c);
    if (activeTool === 'move') return handleMove(r, c);
    placeSelected(selectedQueueIndex, r, c);
  }

  async function placeSelected(index, r, c) {
    if (profile.difficulty === 'hard' && index !== 0) {
      showToast('困难模式必须使用第一枚棋子');
      return false;
    }
    const current = queue[index];
    if (!current) return false;
    const targets = current.shape.map(([dr, dc]) => ({ r: r + dr, c: c + dc }));
    if (!isPreviewValid(targets)) {
      showToast('这里放不下所选棋子');
      return false;
    }
    const id = nextPieceId++;
    const placed = { id, intact: true, color: current.color, cells: [] };
    targets.forEach(pos => {
      const data = { pieceId: id, color: current.color, wild: false };
      board[pos.r][pos.c] = data;
      placed.cells.push({ ...pos, wild: false });
    });
    pieces.set(id, placed);
    queue.splice(index, 1);
    queue.push(makeQueuePiece());
    selectedQueueIndex = profile.difficulty === 'hard' ? 0 : Math.min(index, queue.length - 1);
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

  async function resolveLines() {
    const rows = [];
    const cols = [];
    for (let r = 0; r < SIZE; r++) if (lineColor(board[r])) rows.push(r);
    for (let c = 0; c < SIZE; c++) {
      const column = board.map(row => row[c]);
      if (lineColor(column)) cols.push(c);
    }
    if (!rows.length && !cols.length) {
      combo = 0;
      renderAll();
      return 0;
    }
    resolving = true;
    const keys = new Set();
    rows.forEach(r => { for (let c = 0; c < SIZE; c++) keys.add(`${r}-${c}`); });
    cols.forEach(c => { for (let r = 0; r < SIZE; r++) keys.add(`${r}-${c}`); });
    keys.forEach(key => {
      const [r, c] = key.split('-').map(Number);
      boardEl.children[r * SIZE + c].classList.add('clearing');
    });
    clearFlash.classList.remove('show');
    void clearFlash.offsetWidth;
    clearFlash.classList.add('show');
    await new Promise(resolve => setTimeout(resolve, 390));
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
    score += gained;
    if (score > highScoreFor()) {
      profile.highScores[profile.difficulty] = score;
      saveProfileData();
    }
    resolving = false;
    renderAll();
    showToast(combo > 1 ? `连消 ×${multiplier}，+${gained}分` : `消除成功，+${gained}分`);
    return count;
  }

  async function applyWild(r, c) {
    const data = board[r][c];
    if (!data) { showToast('请选择一个已放置的格子'); return false; }
    if (data.wild) { showToast('这个格子已经是万能色'); return false; }
    data.wild = true;
    const piece = pieces.get(data.pieceId);
    const part = piece?.cells.find(x => x.r === r && x.c === c);
    if (part) part.wild = true;
    renderBoard();
    await resolveLines();
    return true;
  }

  function applyHammer(r, c) {
    const data = board[r][c];
    if (!data) { showToast('这里没有可以敲掉的棋子'); return false; }
    const piece = pieces.get(data.pieceId);
    board[r][c] = null;
    if (piece) {
      piece.cells = piece.cells.filter(x => x.r !== r || x.c !== c);
      piece.intact = false;
      if (!piece.cells.length) pieces.delete(piece.id);
    }
    combo = 0;
    renderAll();
    showToast('已腾出一个空格');
    return true;
  }

  async function handleMove(r, c) {
    const data = board[r][c];
    if (!movePieceId) {
      if (!data) { showToast('请先选择一个完整棋子'); return false; }
      const piece = pieces.get(data.pieceId);
      if (!piece?.intact) { showToast('这个棋子已经残缺，无法整体移动'); return false; }
      movePieceId = piece.id;
      renderAll();
      return true;
    }
    if (data?.pieceId === movePieceId) {
      movePieceId = null;
      renderAll();
      return false;
    }
    const piece = pieces.get(movePieceId);
    if (!piece) { movePieceId = null; renderAll(); return false; }
    const minR = Math.min(...piece.cells.map(x => x.r));
    const minC = Math.min(...piece.cells.map(x => x.c));
    const targets = piece.cells.map(x => ({ r: r + x.r - minR, c: c + x.c - minC, wild: x.wild }));
    if (!isPreviewValid(targets, movePieceId)) { showToast('新位置放不下整个棋子'); return false; }
    piece.cells.forEach(x => { board[x.r][x.c] = null; });
    targets.forEach(pos => {
      board[pos.r][pos.c] = { pieceId: piece.id, color: piece.color, wild: pos.wild };
    });
    piece.cells = targets;
    movePieceId = null;
    renderAll();
    await resolveLines();
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
    activeTool = tool;
    movePieceId = null;
    document.querySelectorAll('.tool-action').forEach(btn => {
      const active = btn.dataset.tool === tool;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    cancelTool.hidden = !tool;
    if (board) renderAll();
    if (tool) revealToolHelp();
    else toolHelp.classList.remove('show');
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

  function refreshAllCandidates() {
    if (refreshes <= 0 || resolving) return { ok: false, reason: '没有剩余换色次数' };
    const before = queue.map(piece => `${piece.color.id}:${JSON.stringify(piece.shape)}`);
    queue = Array.from({ length: QUEUE_SIZE }, makeQueuePiece);
    selectedQueueIndex = 0;
    refreshes--;
    const unchanged = queue.reduce((total, piece, index) => {
      const signature = `${piece.color.id}:${JSON.stringify(piece.shape)}`;
      return total + (signature === before[index] ? 1 : 0);
    }, 0);
    renderAll();
    showToast(unchanged ? `全部刷新完成，其中${unchanged}枚没有变化` : '待选区已全部刷新');
    return { ok: true, unchanged, refreshes };
  }

  function gameState() {
    return {
      score,
      clearedLines: lines,
      moves,
      refreshes,
      combo,
      highScore: highScoreFor(),
      highScores: { ...profile.highScores },
      difficulty: profile.difficulty,
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
      description: '读取当前棋盘、手牌、得分和剩余换色次数，不改变游戏。',
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
      name: 'refresh_all_candidates', title: '刷新全部待选棋子',
      description: '消耗一次机会，重新随机生成七枚待选棋子的形状和颜色；可能出现未变化的棋子。',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        const result = refreshAllCandidates();
        if (!result.ok) throw new Error(result.reason);
        return result;
      }
    });
    register({
      name: 'change_cell_to_wild', title: '将一格变为万能色',
      description: '使用无限测试道具，把指定已占用格变为万能颜色，并检查消除。',
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
      description: '使用无限测试道具，敲掉指定位置的一格棋子。',
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
      name: 'move_intact_piece', title: '整体移动棋子',
      description: '将来源格所属的完整棋子整体平移，以目标格作为新形状左上角。',
      inputSchema: {
        type: 'object',
        properties: {
          sourceRow: { type: 'integer', minimum: 1, maximum: 7 },
          sourceColumn: { type: 'integer', minimum: 1, maximum: 7 },
          targetRow: { type: 'integer', minimum: 1, maximum: 7 },
          targetColumn: { type: 'integer', minimum: 1, maximum: 7 }
        },
        required: ['sourceRow', 'sourceColumn', 'targetRow', 'targetColumn'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async input => {
        const sr = assertCoordinate(input.sourceRow, 'sourceRow');
        const sc = assertCoordinate(input.sourceColumn, 'sourceColumn');
        const tr = assertCoordinate(input.targetRow, 'targetRow');
        const tc = assertCoordinate(input.targetColumn, 'targetColumn');
        setTool('move');
        if (!(await handleMove(sr, sc))) throw new Error('来源格不属于可移动的完整棋子');
        if (!(await handleMove(tr, tc))) throw new Error('整个棋子无法移动到目标位置');
        return gameState();
      }
    });
  }

  document.querySelectorAll('.tool-action').forEach(button => {
    button.addEventListener('click', () => setTool(activeTool === button.dataset.tool ? null : button.dataset.tool));
  });
  const toolCopy = {
    wild: ['万能颜色', '选择棋盘上的一格，将它变成可适配任意颜色的万能格；多格棋子也只改变这一格。'],
    hammer: ['敲掉一格', '选择棋盘上的一格将其移除；多格棋子只会被敲掉所选的一格。'],
    move: ['整体移动', '先选择一个完整的已放置棋子，再选择新位置；保持原形状且不能旋转。']
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
  refreshButton.addEventListener('click', refreshAllCandidates);
  document.querySelector('#resetButton').addEventListener('click', () => resetDialog.showModal());
  resetDialog.addEventListener('close', () => {
    if (resetDialog.returnValue === 'confirm') {
      recordCurrentGame();
      initGame();
    }
  });
  document.querySelector('#profileButton').addEventListener('click', () => {
    pendingAvatar = profile.avatar;
    pendingDifficulty = profile.difficulty;
    updateProfileUI();
    profileDialog.showModal();
  });
  document.querySelector('#closeProfile').addEventListener('click', () => profileDialog.close());
  document.querySelectorAll('[data-difficulty]').forEach(button => {
    button.addEventListener('click', () => {
      pendingDifficulty = button.dataset.difficulty;
      document.querySelectorAll('[data-difficulty]').forEach(option => {
        option.setAttribute('aria-checked', option.dataset.difficulty === pendingDifficulty ? 'true' : 'false');
      });
      profileHighScore.textContent = highScoreFor(pendingDifficulty);
      profileScoreMode.textContent = pendingDifficulty === 'hard' ? '困难模式最高分' : '普通模式最高分';
      recentTitle.textContent = pendingDifficulty === 'hard' ? '困难模式最近五局' : '普通模式最近五局';
      renderRecentScores(pendingDifficulty);
    });
  });
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('请选择图片文件');
    if (file.size > 1024 * 1024) {
      avatarInput.value = '';
      return showToast('头像图片请控制在1MB以内');
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingAvatar = String(reader.result || '');
      setAvatarElement(profileAvatar, profileAvatarFallback, pendingAvatar);
    };
    reader.readAsDataURL(file);
  });
  document.querySelector('#saveProfile').addEventListener('click', () => {
    const nextName = usernameInput.value.trim().slice(0, 12) || '玩家';
    const difficultyChanged = pendingDifficulty !== profile.difficulty;
    if (difficultyChanged) recordCurrentGame();
    profile.username = nextName;
    profile.avatar = pendingAvatar;
    profile.difficulty = pendingDifficulty;
    saveProfileData();
    profileDialog.close();
    if (difficultyChanged) initGame();
    else {
      updateProfileUI();
      renderAll();
      showToast('个人设置已保存');
    }
  });
  profileDialog.addEventListener('close', () => {
    pendingAvatar = profile.avatar;
    pendingDifficulty = profile.difficulty;
    avatarInput.value = '';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeTool) setTool(null);
  });

  profile = loadProfile();
  pendingAvatar = profile.avatar;
  pendingDifficulty = profile.difficulty;
  createCells();
  initGame();
  registerWebMCP();
})();
