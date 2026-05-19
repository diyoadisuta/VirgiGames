// ============================================
// VIRGI'S POUT GAME CENTER — Main App (Auth + Socket)
// ============================================
class App {
    constructor() {
        this.currentGame = null;
        this.currentGameId = 'tictactoe';
        this.mode = 'ai'; // 'ai', 'local', 'online'
        this.containerEl = document.getElementById('forehead-game');
        this.statusEl = document.getElementById('game-status');
        this.socket = null;
        this.username = null;
        this.roomCode = null;
        this.isHost = false;
        this.init();
    }

    async init() {
        // Fetch user info
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (data.error) { window.location.href = '/login.html'; return; }
            this.username = data.username;
            document.getElementById('display-username').textContent = this.username;
        } catch(e) { window.location.href = '/login.html'; return; }

        document.getElementById('btn-logout').addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/index.html';
        });

        // Initialize Socket
        this.socket = io();
        this.setupSocketListeners();

        // UI Listeners
        document.querySelectorAll('.game-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.mode === 'online' && this.roomCode) return; // Cant switch game while in online room
                document.querySelectorAll('.game-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchGame(btn.dataset.game);
            });
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.mode === 'online' && this.roomCode && btn.dataset.mode !== 'online') {
                    this.leaveRoom();
                }
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                
                if (this.mode === 'online') {
                    document.getElementById('lobby-overlay').classList.add('active');
                    this.resetLobbyUI();
                } else {
                    document.getElementById('lobby-overlay').classList.remove('active');
                    this.switchGame(this.currentGameId);
                }
            });
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            if (this.mode === 'online') {
                if (this.currentGame && this.currentGame.gameOver) this.socket.emit('rematch');
            } else {
                if (this.currentGame) this.currentGame.reset();
            }
        });

        this.setupLobbyListeners();
        this.containerEl.addEventListener('mouseenter', () => this.updateCursor(this.currentGameId));
        this.switchGame('tictactoe');
    }

    setupLobbyListeners() {
        document.getElementById('btn-create-room').addEventListener('click', () => {
            this.socket.emit('create-room', this.currentGameId);
        });

        document.getElementById('btn-join-room').addEventListener('click', () => {
            const code = document.getElementById('join-code').value.trim().toUpperCase();
            if (code.length === 6) this.socket.emit('join-room', code);
            else document.getElementById('lobby-error').textContent = 'Invalid code format';
        });

        document.getElementById('btn-cancel-room').addEventListener('click', () => {
            this.leaveRoom();
            document.getElementById('lobby-choice').style.display = 'block';
            document.getElementById('lobby-waiting').style.display = 'none';
        });
    }

    setupSocketListeners() {
        this.socket.on('room-created', (data) => {
            this.roomCode = data.code;
            this.isHost = true;
            document.getElementById('lobby-choice').style.display = 'none';
            document.getElementById('lobby-waiting').style.display = 'block';
            document.getElementById('display-code').textContent = data.code;
        });

        this.socket.on('join-error', (err) => {
            document.getElementById('lobby-error').textContent = err;
            document.getElementById('lobby-error').style.display = 'block';
        });

        this.socket.on('game-start', (data) => {
            this.roomCode = data.code;
            document.getElementById('lobby-overlay').classList.remove('active');
            
            // Set game type to match room
            this.currentGameId = data.gameType;
            document.querySelectorAll('.game-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.game === this.currentGameId);
            });

            // Set up UI
            const opp = this.isHost ? data.guest : data.host;
            document.getElementById('online-status').style.display = 'flex';
            document.getElementById('opponent-name').textContent = `vs ${opp}`;
            
            this.switchGame(this.currentGameId);
            if (this.currentGame) this.currentGame.setOnlineData(this.isHost, opp);
        });

        this.socket.on('opponent-left', () => {
            alert('Opponent disconnected!');
            this.leaveRoom();
            document.getElementById('btn-mode-ai').click();
        });

        // Pass game events to current game instance
        this.socket.on('game-move', (data) => { if(this.currentGame) this.currentGame.onNetworkMove(data); });
        this.socket.on('dice-roll', (data) => { if(this.currentGame) this.currentGame.onNetworkDice(data); });
        
        this.socket.on('rematch-request', () => {
            if (confirm('Opponent wants a rematch. Accept?')) {
                this.socket.emit('rematch-accept');
            }
        });
        
        this.socket.on('rematch-start', () => {
            if (this.currentGame) this.currentGame.reset();
        });
    }

    leaveRoom() {
        if (this.roomCode) this.socket.emit('leave-room');
        this.roomCode = null;
        this.isHost = false;
        document.getElementById('online-status').style.display = 'none';
    }

    resetLobbyUI() {
        document.getElementById('lobby-choice').style.display = 'block';
        document.getElementById('lobby-waiting').style.display = 'none';
        document.getElementById('lobby-error').style.display = 'none';
        document.getElementById('join-code').value = '';
    }

    onGameOver(winner) {
        if (this.mode === 'online' && this.isHost) {
            this.socket.emit('game-over', { 
                winner: winner, 
                players: [this.username, document.getElementById('opponent-name').textContent.replace('vs ','')] 
            });
        }
    }

    switchGame(gameId) {
        this.currentGameId = gameId;
        this.containerEl.classList.add('active-game');
        this.updateCursor(gameId);
        
        const onGameOver = (winner) => this.onGameOver(winner);

        switch (gameId) {
            case 'tictactoe': this.currentGame = new TicTacToe(this.containerEl, this.statusEl, this.mode, this.socket); break;
            case 'snakes': this.currentGame = new SnakesAndLadders(this.containerEl, this.statusEl, this.mode, this.socket); break;
            case 'ludo': this.currentGame = new LudoGame(this.containerEl, this.statusEl, this.mode, this.socket); break;
            case 'chess': this.currentGame = new ChessGame(this.containerEl, this.statusEl, this.mode, this.socket); break;
        }
        
        if (this.currentGame) this.currentGame.onGameOverCallback = onGameOver;
    }

    updateCursor(gameId) {
        const map = { tictactoe:'cursor-marker', snakes:'cursor-snake', ludo:'cursor-dice', chess:'cursor-pawn' };
        this.containerEl.className = 'forehead-game active-game';
        if (map[gameId]) this.containerEl.classList.add(map[gameId]);
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
