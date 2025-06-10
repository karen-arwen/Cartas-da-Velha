 document.addEventListener('DOMContentLoaded', () => { // -- Cria uma função falando para o jogo só rodar quando o DOM estiver completamente carregado

        // --- CONSTANTS & DOM ELEMENTS ---
        const BOARD_SIZE = 15, ROUND_DURATION = 60, MAX_ROUNDS = 5, BASE_SCORE_VALUE = 5;
        const gameWrapper = document.getElementById('game-wrapper'); // -- getElementById pega o elemento HTML com o ID 'game-wrapper'
        const mainBoard = document.getElementById('main-board'); // -- getElementById pega o elemento HTML com o ID 'main-board'
        const scoreXEl = document.getElementById('scoreX'), scoreOEl = document.getElementById('scoreO'); // -- getElementById pega os elementos HTML com os IDs 'scoreX' e 'scoreO'
        const turnIndicatorEl = document.getElementById('turn-indicator'), scoreDisplayX = document.getElementById('score-display-X'); // -- getElementById pega o elemento HTML com o ID 'turn-indicator' e 'score-display-X'
        const scoreDisplayO = document.getElementById('score-display-O'), turnTimerEl = document.getElementById('turn-timer'); // -- getElementById pega o elemento HTML com o ID 'score-display-O' e 'turn-timer'
        const roundDisplayEl = document.getElementById('round-display'); // -- getElementById pega o elemento HTML com o ID 'round-display'
        const modalOverlay = document.getElementById('modal-overlay'), modalTitle = document.getElementById('modal-title'); // -- getElementById pega o elemento HTML com o ID 'modal-overlay' e 'modal-title'
        const modalMessage = document.getElementById('modal-message');// -- getElementById pega o elemento HTML com o ID 'modal-message'
        let modalButton = document.getElementById('modal-button'); // -- getElementById pega o elemento HTML com o ID 'modal-button'

        // --- GAME STATE & CARDS OBJECT ---
        let state = {};
        let CARDS = {}; 

        // --- CARD EFFECT FUNCTIONS (DEFINED BEFORE CARDS OBJECT) ---
        function enterTargetingMode(cardId) { state.targetingMode = { active: true, cardId: cardId }; mainBoard.classList.add('targeting'); turnIndicatorEl.textContent = `Escolha uma casinha para ${CARDS[cardId].title}.`; renderPlayerHand(state.currentPlayer); }
        function exitTargetingMode() { state.targetingMode = { active: false, cardId: null }; mainBoard.classList.remove('targeting'); updateUI(); renderPlayerHand(state.currentPlayer); }
        function activateExtraMove() { state.extraMoves++; turnIndicatorEl.textContent = 'JOGADA EXTRA!'; }
        function activateSwapHands() { [state.playerHands.X, state.playerHands.O] = [state.playerHands.O, state.playerHands.X]; renderPlayerHand('X'); renderPlayerHand('O'); }
        function activateInvasao(houseInfo) {
            const playerInvasor = state.currentPlayer;
            if (!houseInfo || houseInfo.owner === playerInvasor) { state.playerHands[playerInvasor].push('invasao'); renderPlayerHand(playerInvasor); exitTargetingMode(); return; }
            const originalOwner = houseInfo.owner;
            const pointsToTransfer = houseInfo.value;
            state.scores[originalOwner] -= pointsToTransfer;
            state.scores[playerInvasor] += pointsToTransfer;
            
            const oldSuffix = originalOwner.toLowerCase();
            const newSuffix = playerInvasor.toLowerCase();
            houseInfo.indices.forEach(idx => {
                state.houseData[idx].owner = playerInvasor;
                if (state.cellClasses[idx]) {
                    state.cellClasses[idx] = state.cellClasses[idx].map(c => c.replace(`conquered-${oldSuffix}`, `conquered-${newSuffix}`).replace(`casinha-top-${oldSuffix}`, `casinha-top-${newSuffix}`).replace(`casinha-bottom-${oldSuffix}`, `casinha-bottom-${newSuffix}`).replace(`casinha-left-${oldSuffix}`, `casinha-left-${newSuffix}`).replace(`casinha-right-${oldSuffix}`, `casinha-right-${newSuffix}`));
                }
            });
            renderBoard();
            updateUI();
            exitTargetingMode();
        }
        function activateApagao(houseInfo) {
            if(!houseInfo) { state.playerHands[state.currentPlayer].push('apagao'); renderPlayerHand(state.currentPlayer); exitTargetingMode(); return; }
            state.scores[houseInfo.owner] -= houseInfo.value;
            houseInfo.indices.forEach(idx => {
                state.boardState[idx] = null; 
                state.lockedCells.add(idx); 
                delete state.houseData[idx];
                state.cellClasses[idx] = ['removed'];
            });
            renderBoard();
            updateUI();
            exitTargetingMode();
        }

        // --- GAME FLOW ---
        function initGame() {
            CARDS = {
                'roubar_vez': { title: 'Roubar a Vez', description: 'Jogue mais uma vez.', effect: activateExtraMove },
                'troca_cartas': { title: 'Troca Troca', description: 'Troque suas cartas.', effect: activateSwapHands },
                'invasao': { title: 'Invasão', description: 'Roube uma casinha.', effect: () => enterTargetingMode('invasao') },
                'apagao': { title: 'Apagão', description: 'Remova uma casinha.', effect: () => enterTargetingMode('apagao') }
            };
            showModal("Cartas da Velha", "Conquiste o território e use cartas de poder para vencer.", "Iniciar Jogo", () => {
                hideModal();
                gameWrapper.style.display = 'flex';
                startNewGame();
            });
        }
        
        function startNewGame() {
            if (state.roundTimerId) clearInterval(state.roundTimerId);
            state = { boardState: Array(BOARD_SIZE * BOARD_SIZE).fill(null), lockedCells: new Set(), houseData: {}, currentPlayer: 'X', scores: { X: 0, O: 0 }, roundTimeLeft: ROUND_DURATION, roundTimerId: null, currentRound: 0, isGameOver: false, lastScoringPlayer: null, lastScoreValue: BASE_SCORE_VALUE, playerHands: { X: [], O: [] }, extraMoves: 0, targetingMode: { active: false, cardId: null }, gameDeck: [], cellClasses: {}, cardPlayedThisTurn: false };
            createAndShuffleDeck(); 
            createBoardGrid();
            renderBoard();
            startNewRound();
        }
        
        function endGame() {
            state.isGameOver = true; clearInterval(state.roundTimerId);
            turnTimerEl.textContent = "FIM"; roundDisplayEl.textContent = "Partida Encerrada";
            let winnerMessage, title;
            if (state.scores.X > state.scores.O) { title = "Jogador X Venceu!"; winnerMessage = `Placar Final: X (${state.scores.X}) - O (${state.scores.O})`; } 
            else if (state.scores.O > state.scores.X) { title = "Jogador O Venceu!"; winnerMessage = `Placar Final: O (${state.scores.O}) - X (${state.scores.X})`; } 
            else { title = "Empate!"; winnerMessage = `Ambos terminaram com ${state.scores.X} pontos.`; }
            turnIndicatorEl.textContent = title;
            setTimeout(() => showModal(title, winnerMessage, "Jogar Novamente", () => { hideModal(); startNewGame(); }), 1500);
        }
        
        // --- MODAL & UI ---
        function showModal(title, message, buttonText, onButtonClick) {
            modalTitle.textContent = title; modalMessage.textContent = message;
            const newButton = modalButton.cloneNode(false); newButton.textContent = buttonText;
            modalButton.parentNode.replaceChild(newButton, modalButton); modalButton = newButton;
            modalButton.addEventListener('click', onButtonClick);
            modalOverlay.classList.add('visible');
        }
        function hideModal() { modalOverlay.classList.remove('visible'); }
        function updateUI() {
            scoreXEl.textContent = state.scores.X; scoreOEl.textContent = state.scores.O;
            if (!state.isGameOver) {
                roundDisplayEl.textContent = `Rodada ${state.currentRound}/${MAX_ROUNDS}`;
                if (!state.targetingMode.active && state.extraMoves === 0) { turnIndicatorEl.textContent = `Vez do Jogador ${state.currentPlayer}`; }
            }
            scoreDisplayX.style.border = state.currentPlayer === 'X' && !state.isGameOver ? `3px solid var(--cor-destaque)` : 'none';
            scoreDisplayO.style.border = state.currentPlayer === 'O' && !state.isGameOver ? `3px solid var(--cor-destaque)` : 'none';
        }
        
        // --- GAME LOGIC (CORRECTED) ---
        function onCellClick(event) {
            if (state.isGameOver) return;
            const cell = event.target.closest('.cell');
            if (!cell) return;
            const index = parseInt(cell.dataset.index);

            if (state.targetingMode.active) {
                const houseInfo = getHouseInfoFromCell(index);
                if (houseInfo) {
                    if (state.targetingMode.cardId === 'invasao') activateInvasao(houseInfo);
                    else if (state.targetingMode.cardId === 'apagao') activateApagao(houseInfo);
                } else {
                    state.playerHands[state.currentPlayer].push(state.targetingMode.cardId);
                    exitTargetingMode();
                }
                return;
            }

            if (state.boardState[index] || state.lockedCells.has(index)) return;
            
            state.boardState[index] = state.currentPlayer;
            
            findAndProcessNewWins(state.currentPlayer);
            switchPlayer(); 
            updateUI(); 
            renderBoard(); 
        }
        
        function onCardClick(cardId) {
            if (state.cardPlayedThisTurn) return; // Regra de 1 carta por turno

            const owner = state.playerHands.X.includes(cardId) ? 'X' : 'O';
            if (state.isGameOver || state.targetingMode.active || state.currentPlayer !== owner) return;
            
            const player = state.currentPlayer;
            const cardIndex = state.playerHands[player].indexOf(cardId);
            if (cardIndex > -1) {
                state.cardPlayedThisTurn = true; // Marca a carta como jogada
                state.playerHands[player].splice(cardIndex, 1);
                renderPlayerHand(player);
                CARDS[cardId].effect();
            }
        }
        
        function processWin(houseIndices) {
            const winner = state.currentPlayer;
            let points = (state.lastScoringPlayer === winner) ? state.lastScoreValue * 2 : BASE_SCORE_VALUE;
            state.scores[winner] += points;
            state.lastScoringPlayer = winner; state.lastScoreValue = points;
            const houseInfo = { owner: winner, value: points, indices: houseIndices };
            
            const suffix = winner.toLowerCase();
            houseIndices.forEach((idx, i) => {
                state.houseData[idx] = houseInfo; 
                state.lockedCells.add(idx);
                
                const classes = state.cellClasses[idx] || [];
                if (!classes.includes('locked')) classes.push('locked');
                if (!classes.includes(`conquered-${suffix}`)) classes.push(`conquered-${suffix}`);
                if (i < 3 && !classes.includes(`casinha-top-${suffix}`)) classes.push(`casinha-top-${suffix}`);
                if (i >= 6 && !classes.includes(`casinha-bottom-${suffix}`)) classes.push(`casinha-bottom-${suffix}`);
                if (i % 3 === 0 && !classes.includes(`casinha-left-${suffix}`)) classes.push(`casinha-left-${suffix}`);
                if (i % 3 === 2 && !classes.includes(`casinha-right-${suffix}`)) classes.push(`casinha-right-${suffix}`);
                state.cellClasses[idx] = classes;
            });
            awardCard(winner);
        }

        // --- RENDERING & UTILITIES ---
        function createBoardGrid() {
            mainBoard.innerHTML = '';
            for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
                const cell = document.createElement('div');
                cell.dataset.index = i;
                cell.addEventListener('click', onCellClick);
                mainBoard.appendChild(cell);
            }
        }

        function renderBoard() {
            for (let i = 0; i < mainBoard.children.length; i++) {
                const cell = mainBoard.children[i];
                const classes = ['cell'];
                if (state.cellClasses[i]) {
                    classes.push(...state.cellClasses[i]);
                }
                
                const cellState = state.boardState[i];
                if (cellState) { 
                    cell.textContent = cellState; 
                    classes.push(`player-${cellState}`);
                } else {
                    cell.textContent = '';
                }
                cell.className = classes.join(' ');
            }
        }
        
        function renderPlayerHand(player) {
            const handEl = document.getElementById(`player-hand-${player}`);
            handEl.innerHTML = '';
            state.playerHands[player].forEach(cardId => {
                const cardData = CARDS[cardId];
                const cardEl = document.createElement('div');
                cardEl.classList.add('card');
                cardEl.dataset.cardId = cardId;
                cardEl.innerHTML = `<div class="card-title">${cardData.title}</div><div class="card-description">${cardData.description}</div>`;
                
                const canPlayCard = player === state.currentPlayer && !state.targetingMode.active && !state.cardPlayedThisTurn;

                if (canPlayCard) {
                    cardEl.classList.add('active'); 
                    cardEl.addEventListener('click', () => onCardClick(cardId));
                } else {
                    cardEl.style.cursor = 'not-allowed'; cardEl.style.opacity = '0.7';
                }
                handEl.appendChild(cardEl);
            });
        }
        
        function createAndShuffleDeck() { const deck = []; for (let i = 0; i < 4; i++) deck.push('roubar_vez'); for (let i = 0; i < 3; i++) deck.push('troca_cartas'); for (let i = 0; i < 2; i++) deck.push('invasao'); for (let i = 0; i < 2; i++) deck.push('apagao'); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } state.gameDeck = deck; }
        function awardCard(player) { if (state.isGameOver) return; if (state.gameDeck.length === 0) { createAndShuffleDeck(); } const cardId = state.gameDeck.pop(); if (cardId) { state.playerHands[player].push(cardId); renderPlayerHand(player); } }
        function getHouseInfoFromCell(cellIndex) { return state.houseData[cellIndex] || null; }
        
        function switchPlayer() {
            if (state.extraMoves > 0) {
                state.extraMoves--;
                state.cardPlayedThisTurn = false; // Permite jogar carta na jogada extra
                return;
            }
            state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
            state.cardPlayedThisTurn = false; // Reseta a regra ao trocar de jogador
            renderPlayerHand('X'); 
            renderPlayerHand('O');
        }
        
        function checkHouseForWin(indices, player) {
            const lines = [ [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6] ];
            for (const line of lines) {
                if (line.every(i => state.boardState[indices[i]] === player)) {
                    return true;
                }
            }
            return false;
        }

        function findAndProcessNewWins(player) {
            for (let r = 0; r <= BOARD_SIZE - 3; r++) {
                for (let c = 0; c <= BOARD_SIZE - 3; c++) {
                    const topLeftIndex = r * BOARD_SIZE + c;
                    const houseIndices = [];
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            houseIndices.push(topLeftIndex + (i * BOARD_SIZE) + j);
                        }
                    }

                    if (isHouseFree(houseIndices)) {
                        if (checkHouseForWin(houseIndices, player)) {
                            processWin(houseIndices);
                        }
                    }
                }
            }
        }
        
        function isHouseFree(houseIndices) { return houseIndices.every(idx => !state.lockedCells.has(idx)); }
        function startNewRound() { state.currentRound++; if (state.currentRound > MAX_ROUNDS) { endGame(); return; } state.roundTimeLeft = ROUND_DURATION; updateUI(); if(state.roundTimerId) clearInterval(state.roundTimerId); state.roundTimerId = setInterval(() => { state.roundTimeLeft--; updateTimerDisplay(); if (state.roundTimeLeft <= 0) { handleRoundEnd(); } }, 1000); }
        function handleRoundEnd() { clearInterval(state.roundTimerId); startNewRound(); }
        function updateTimerDisplay() { if(state.isGameOver) return; const seconds = String(state.roundTimeLeft % 60).padStart(2, '0'); turnTimerEl.textContent = `00:${seconds}`; }
        
        // --- INIT ---
        initGame();
    });