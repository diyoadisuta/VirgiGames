// ============================================
// LUDO — with AI, Local, Online
// ============================================
class LudoGame {
    constructor(container, statusEl, mode, socket) {
        this.container = container;
        this.statusEl = statusEl;
        this.mode = mode; // 'ai', 'local', 'online'
        this.socket = socket;
        
        // Online specific
        this.isHost = true;
        this.myPlayerIndex = 0;
        this.oppName = 'Opponent';
        
        this.players = [
            { color:'red', name: 'P1', tokens:[{pos:-1},{pos:-1}] },
            { color:'blue', name: 'P2', tokens:[{pos:-1},{pos:-1}] }
        ];
        this.current = 0; this.diceVal = 0; this.gameOver = false;
        this.rolling = false; this.rolled = false;
        this.pathLength = 52; this.homeLength = 6;
        this.startPos = [0, 26];
        
        this.updatePlayerNames();
        this.render();
    }
    
    updatePlayerNames() {
        if (this.mode === 'online') {
            this.players[0].name = this.isHost ? 'You' : this.oppName;
            this.players[1].name = this.isHost ? this.oppName : 'You';
        } else if (this.mode === 'local') {
            this.players[0].name = 'P1';
            this.players[1].name = 'P2';
        } else {
            this.players[0].name = 'You';
            this.players[1].name = 'Virgi';
        }
    }

    setOnlineData(isHost, oppName) {
        this.isHost = isHost;
        this.myPlayerIndex = isHost ? 0 : 1;
        this.oppName = oppName;
        this.updatePlayerNames();
        this.updateStatus();
    }

    render() {
        this.container.innerHTML = '';
        const w = document.createElement('div');
        w.className = 'ludo-wrapper';

        const board = document.createElement('div');
        board.className = 'ludo-board';

        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                const cell = document.createElement('div');
                cell.className = 'ludo-cell';
                if (r<6&&c<6) cell.classList.add('red-home');
                else if (r<6&&c>8) cell.classList.add('blue-home');
                else if (r>8&&c<6) cell.classList.add('green-home');
                else if (r>8&&c>8) cell.classList.add('yellow-home');
                else if (r>=6&&r<=8&&c>=6&&c<=8) cell.classList.add('center-home');
                else cell.classList.add('path');
                if (r===7&&c>=1&&c<=5) cell.classList.add('red-path');
                if (c===7&&r>=1&&r<=5) cell.classList.add('blue-path');
                if (r===7&&c>=9&&c<=13) cell.classList.add('yellow-path');
                if (c===7&&r>=9&&r<=13) cell.classList.add('green-path');
                board.appendChild(cell);
            }
        }

        this.placeTokens(board);
        w.appendChild(board);

        const da = document.createElement('div');
        da.className = 'ludo-dice-area';
        const tl = document.createElement('span');
        tl.className = 'sal-turn-label';
        tl.textContent = this.players[this.current].name;
        da.appendChild(tl);
        const dice = document.createElement('div');
        dice.className = 'ludo-dice';
        dice.textContent = this.diceVal || '🎲';
        dice.addEventListener('click', () => this.handleDiceClick());
        da.appendChild(dice);
        w.appendChild(da);
        this.container.appendChild(w);
        this.updateStatus();
    }

    placeTokens(board) {
        const cells = board.querySelectorAll('.ludo-cell');
        const homes = [[{r:2,c:2},{r:3,c:3}],[{r:2,c:11},{r:3,c:12}]];
        this.players.forEach((p,pi) => {
            p.tokens.forEach((t,ti) => {
                let idx;
                if (t.pos === -1) {
                    const h = homes[pi][ti];
                    idx = h.r*15+h.c;
                } else {
                    idx = this.getPathCellIndex(t.pos, pi);
                }
                if (idx !== null && cells[idx]) {
                    const tok = document.createElement('div');
                    tok.className = 'ludo-token-piece';
                    tok.style.background = p.color==='red'?'#e74c3c':'#3498db';
                    tok.addEventListener('click', () => this.handleTokenClick(pi, ti));
                    cells[idx].appendChild(tok);
                }
            });
        });
    }
    
    handleTokenClick(pi, ti) {
        if (this.gameOver || pi!==this.current || !this.rolled) return;
        if (this.mode === 'online' && pi !== this.myPlayerIndex) return;
        
        this.moveToken(pi, ti);
        
        if (this.mode === 'online') {
            this.socket.emit('game-move', { type: 'token', pi: pi, ti: ti });
        }
    }
    
    onNetworkMove(data) {
        if (this.mode !== 'online' || this.gameOver) return;
        if (data.type === 'token') {
            if (data.pi !== this.current) return;
            this.moveToken(data.pi, data.ti);
        }
    }

    getPathCellIndex(pos, pi) {
        const pathMap = [
            [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
            [0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
            [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
            [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
            [14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
            [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0]
        ];
        const ap = (pos + this.startPos[pi]) % this.pathLength;
        if (ap < pathMap.length) { const [r,c]=pathMap[ap]; return r*15+c; }
        return null;
    }

    handleDiceClick() {
        if (this.gameOver || this.rolling || this.rolled) return;
        if (this.mode === 'online' && this.current !== this.myPlayerIndex) return;
        if (this.mode === 'ai' && this.current === 1) return;
        
        this.rollDice();
    }

    rollDice(forcedVal = null) {
        if (this.gameOver || this.rolling || this.rolled) return;
        this.rolling = true;
        this.diceVal = forcedVal !== null ? forcedVal : Math.floor(Math.random()*6)+1;
        
        if (this.mode === 'online' && forcedVal === null) {
            this.socket.emit('dice-roll', { value: this.diceVal, playerIndex: this.current });
        }
        
        setTimeout(() => {
            this.rolling = false; this.rolled = true; this.render();
            if (!this.hasValidMove(this.current)) {
                this.statusEl.textContent = 'No valid moves!';
                setTimeout(() => { this.rolled = false; this.nextTurn(); }, 800);
            }
        }, 450);
    }
    
    onNetworkDice(data) {
        if (this.mode !== 'online' || this.gameOver) return;
        if (data.playerIndex !== this.current) return;
        this.rollDice(data.value);
    }

    hasValidMove(pi) {
        for (const t of this.players[pi].tokens) {
            if (t.pos===-1 && this.diceVal===6) return true;
            if (t.pos>=0 && t.pos+this.diceVal<=this.pathLength+this.homeLength) return true;
        }
        return false;
    }

    moveToken(pi, ti) {
        const t = this.players[pi].tokens[ti];
        if (t.pos===-1) { if (this.diceVal!==6) return; t.pos=0; }
        else { const np=t.pos+this.diceVal; if(np>this.pathLength+this.homeLength) return; t.pos=np; }

        if (this.players[pi].tokens.every(t=>t.pos>=this.pathLength+this.homeLength)) {
            this.gameOver = true; this.render();
            
            let msg, cls;
            if (this.mode === 'online') {
                const isMe = pi === this.myPlayerIndex;
                msg = isMe ? 'You Win! 🎉' : `${this.oppName} Wins! 😜`;
                cls = isMe ? 'win' : 'lose';
                if (isMe && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
            } else if (this.mode === 'local') {
                msg = `${this.players[pi].name} Wins! 🎉`;
                cls = 'win';
            } else {
                const isP1 = pi === 0;
                msg = isP1 ? 'You Win! 🎉' : 'Virgi Wins! 😜';
                cls = isP1 ? 'win' : 'lose';
                if (isP1 && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
            }
            
            this.statusEl.textContent = msg;
            this.statusEl.className = 'float-status '+cls;
            return;
        }
        this.rolled = false;
        if (this.diceVal===6) { this.render(); return; }
        this.render(); this.nextTurn();
    }

    nextTurn() {
        this.current = 1-this.current; this.rolled = false; this.render();
        if (this.mode === 'ai' && this.current === 1 && !this.gameOver) {
            setTimeout(() => this.aiTurn(), 600);
        }
    }

    aiTurn() {
        if (this.gameOver) return;
        this.diceVal = Math.floor(Math.random()*6)+1;
        this.rolled = true; this.render();
        setTimeout(() => {
            const p = this.players[1];
            for (let i=0; i<p.tokens.length; i++) {
                const t = p.tokens[i];
                if (t.pos===-1&&this.diceVal===6) { t.pos=0; break; }
                if (t.pos>=0&&t.pos+this.diceVal<=this.pathLength+this.homeLength) { t.pos+=this.diceVal; break; }
            }
            this.rolled = false;
            if (p.tokens.every(t=>t.pos>=this.pathLength+this.homeLength)) {
                this.gameOver=true; this.render();
                this.statusEl.textContent='Virgi Wins! 😜';
                this.statusEl.className='float-status lose'; return;
            }
            if (this.diceVal===6) { this.render(); setTimeout(()=>this.aiTurn(),600); }
            else this.nextTurn();
        }, 500);
    }

    updateStatus() {
        if (!this.gameOver) {
            if (this.mode === 'online') {
                this.statusEl.textContent = this.current === this.myPlayerIndex ? 'Your Turn' : `${this.oppName}'s Turn`;
            } else {
                this.statusEl.textContent = this.players[this.current].name+"'s turn";
            }
            this.statusEl.className = 'float-status';
        }
    }

    reset() {
        this.players.forEach(p=>p.tokens.forEach(t=>t.pos=-1));
        this.current=0; this.diceVal=0; this.gameOver=false; this.rolling=false; this.rolled=false;
        this.render();
    }
}
