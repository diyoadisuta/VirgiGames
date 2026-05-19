// ============================================
// TIC-TAC-TOE — with AI, Local, Online
// ============================================
class TicTacToe {
    constructor(container, statusEl, mode, socket) {
        this.container = container;
        this.statusEl = statusEl;
        this.mode = mode; // 'ai', 'local', 'online'
        this.socket = socket;
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        
        // Online specific
        this.isHost = true;
        this.myPiece = 'X';
        this.oppName = 'Opponent';
        
        this.render();
    }

    setOnlineData(isHost, oppName) {
        this.isHost = isHost;
        this.myPiece = isHost ? 'X' : 'O';
        this.oppName = oppName;
        this.updateStatus();
    }

    render() {
        this.container.innerHTML = '';
        const board = document.createElement('div');
        board.className = 'ttt-board';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'ttt-cell';
            if (this.board[i]) {
                cell.textContent = this.board[i];
                cell.classList.add(this.board[i].toLowerCase());
            }
            cell.addEventListener('click', () => this.handleClick(i));
            board.appendChild(cell);
        }
        this.container.appendChild(board);
        this.updateStatus();
    }

    handleClick(i) {
        if (this.board[i] || this.gameOver) return;
        
        if (this.mode === 'online' && this.currentPlayer !== this.myPiece) return;
        if (this.mode === 'ai' && this.currentPlayer !== 'X') return;

        this.makeMove(i, this.currentPlayer);

        if (this.mode === 'online') {
            this.socket.emit('game-move', { index: i, piece: this.myPiece });
        } else if (this.mode === 'ai' && !this.gameOver) {
            setTimeout(() => this.aiMove(), 400);
        }
    }

    onNetworkMove(data) {
        if (this.mode !== 'online' || this.gameOver) return;
        if (data.piece !== this.currentPlayer) return; // Ignore if not their turn
        this.makeMove(data.index, data.piece);
    }

    makeMove(i, piece) {
        this.board[i] = piece;
        this.renderCell(i);

        const winLine = this.checkWin(piece);
        if (winLine) {
            let msg, cls;
            if (this.mode === 'online') {
                const isMe = piece === this.myPiece;
                msg = isMe ? 'You Win! 🎉' : `${this.oppName} Wins! 😜`;
                cls = isMe ? 'win' : 'lose';
                if (isMe && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
            } else if (this.mode === 'local') {
                msg = `Player ${piece} Wins! 🎉`;
                cls = 'win';
            } else {
                const isX = piece === 'X';
                msg = isX ? 'You Win! 🎉' : 'Virgi Wins! 😜';
                cls = isX ? 'win' : 'lose';
                if (isX && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
            }
            this.endGame(msg, cls, winLine);
            return;
        }
        
        if (this.board.every(c => c)) { 
            this.endGame('Draw! 🤝', '', null); 
            return; 
        }

        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.updateStatus();
    }

    aiMove() {
        if (this.gameOver) return;
        const move = this.bestMove();
        this.makeMove(move, 'O');
    }

    renderCell(i) {
        const cells = this.container.querySelectorAll('.ttt-cell');
        cells[i].textContent = this.board[i];
        cells[i].classList.add(this.board[i].toLowerCase(), 'placed');
    }

    updateStatus() {
        if (this.gameOver) return;
        if (this.mode === 'online') {
            this.statusEl.textContent = this.currentPlayer === this.myPiece ? 'Your Turn' : `${this.oppName}'s Turn`;
        } else if (this.mode === 'local') {
            this.statusEl.textContent = `Player ${this.currentPlayer}'s Turn`;
        } else {
            this.statusEl.textContent = this.currentPlayer === 'X' ? 'Your Turn (X)' : "Virgi's Turn...";
        }
        this.statusEl.className = 'float-status';
    }

    endGame(msg, cls, winLine) {
        this.gameOver = true;
        this.statusEl.textContent = msg;
        this.statusEl.className = 'float-status ' + cls;
        if (winLine) {
            const cells = this.container.querySelectorAll('.ttt-cell');
            winLine.forEach(i => cells[i].classList.add('win-cell'));
        }
    }

    checkWin(p) {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const l of lines) { if (l.every(i => this.board[i] === p)) return l; }
        return null;
    }

    bestMove() {
        let best = -Infinity, move = 0;
        for (let i = 0; i < 9; i++) {
            if (!this.board[i]) {
                this.board[i] = 'O';
                const s = this.minimax(this.board, 0, false);
                this.board[i] = null;
                if (s > best) { best = s; move = i; }
            }
        }
        return move;
    }

    minimax(board, depth, isMax) {
        if (this.checkWin('O')) return 10 - depth;
        if (this.checkWin('X')) return depth - 10;
        if (board.every(c => c)) return 0;
        if (isMax) {
            let b = -Infinity;
            for (let i = 0; i < 9; i++) { if (!board[i]) { board[i] = 'O'; b = Math.max(b, this.minimax(board, depth+1, false)); board[i] = null; } }
            return b;
        } else {
            let b = Infinity;
            for (let i = 0; i < 9; i++) { if (!board[i]) { board[i] = 'X'; b = Math.min(b, this.minimax(board, depth+1, true)); board[i] = null; } }
            return b;
        }
    }

    reset() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.render();
    }
}
