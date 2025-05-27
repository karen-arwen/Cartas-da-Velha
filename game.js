const boardSize = 10;
const board = document.getElementById('board');
let currentPlayer = 'X';
let score = { X: 0, O: 0 };

function createBoard() {
  for (let i = 0; i < boardSize * boardSize; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.addEventListener('click', () => makeMove(cell));
    board.appendChild(cell);
  }
}

function makeMove(cell) {
  if (cell.textContent || cell.classList.contains('locked')) return;

  cell.textContent = currentPlayer;
  checkWin(cell);

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
}

function checkWin(cell) {
  const index = parseInt(cell.dataset.index);
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;

  const directions = [
    { dr: 0, dc: 1 },   // horizontal
    { dr: 1, dc: 0 },   // vertical
    { dr: 1, dc: 1 },   // diagonal \
    { dr: 1, dc: -1 }   // diagonal /
  ];

  for (const { dr, dc } of directions) {
    const line = [cell];
    for (let i = 1; i <= 2; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const next = getCell(r, c);
      if (next && next.textContent === currentPlayer && !next.classList.contains('locked')) {
        line.push(next);
      } else break;
    }

    for (let i = 1; i <= 2; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      const prev = getCell(r, c);
      if (prev && prev.textContent === currentPlayer && !prev.classList.contains('locked')) {
        line.unshift(prev);
      } else break;
    }

    if (line.length >= 3) {
      line.forEach(c => {
        c.classList.add('locked');
        c.style.backgroundColor = '#c6f3c6';
      });
      score[currentPlayer]++;
      updateScore();
    }
  }
}

function getCell(row, col) {
  if (row < 0 || col < 0 || row >= boardSize || col >= boardSize) return null;
  const index = row * boardSize + col;
  return board.children[index];
}

function updateScore() {
  document.getElementById('scoreX').textContent = score.X;
  document.getElementById('scoreO').textContent = score.O;
}

createBoard();
