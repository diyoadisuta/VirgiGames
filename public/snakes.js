// ============================================
// SNAKES & LADDERS — with AI, Local, Online
// ============================================
class SnakesAndLadders {
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
            { pos: 0, name: 'P1', cls: 'p1' },
            { pos: 0, name: 'P2', cls: 'p2' }
        ];
        this.current = 0;
        this.gameOver = false;
        this.rolling = false;
        this.diceVal = 1;
        this.snakes = {16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78};
        this.ladders = {1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100};
        
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
        w.className = 'sal-wrapper';

        const board = document.createElement('div');
        board.className = 'sal-board';

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                const num = r % 2 === 0 ? (9-r)*10+(10-c) : (9-r)*10+c+1;
                const cell = document.createElement('div');
                cell.className = 'sal-cell' + (r%2===0?' even-row':'');
                cell.dataset.num = num;

                if (this.snakes[num]) cell.classList.add('snake-head');
                if (Object.values(this.snakes).includes(num)) cell.classList.add('snake-tail');
                if (this.ladders[num]) cell.classList.add('ladder-bottom');
                if (Object.values(this.ladders).includes(num)) cell.classList.add('ladder-top');

                const s = document.createElement('span');
                s.className = 'cell-num';
                s.textContent = num;
                cell.appendChild(s);

                if (this.snakes[num]) { const i=document.createElement('span'); i.textContent='🐍'; i.style.cssText='position:absolute;font-size:0.45em;top:0;right:0;'; cell.appendChild(i); }
                if (this.ladders[num]) { const i=document.createElement('span'); i.textContent='🪜'; i.style.cssText='position:absolute;font-size:0.45em;top:0;right:0;'; cell.appendChild(i); }

                board.appendChild(cell);
            }
        }

        // Place tokens
        this.players.forEach(p => {
            if (p.pos > 0) {
                const cells = board.querySelectorAll('.sal-cell');
                for (const cell of cells) {
                    if (parseInt(cell.dataset.num) === p.pos) {
                        const tok = document.createElement('div');
                        tok.className = 'sal-token ' + p.cls;
                        cell.appendChild(tok);
                        break;
                    }
                }
            }
        });

        w.appendChild(board);

        const da = document.createElement('div');
        da.className = 'sal-dice-area';

        const tl = document.createElement('span');
        tl.className = 'sal-turn-label';
        tl.textContent = this.players[this.current].name;
        da.appendChild(tl);

        const dice = document.createElement('div');
        dice.className = 'sal-dice';
        dice.textContent = this.diceVal;
        dice.addEventListener('click', () => this.handleDiceClick());
        da.appendChild(dice);

        w.appendChild(da);
        this.container.appendChild(w);
        this.updateStatus();
    }

    handleDiceClick() {
        if (this.gameOver || this.rolling) return;
        if (this.mode === 'online' && this.current !== this.myPlayerIndex) return;
        if (this.mode === 'ai' && this.current === 1) return;
        
        this.rollDice();
    }

    rollDice(forcedVal = null) {
        if (this.gameOver || this.rolling) return;
        this.rolling = true;
        
        const dice = this.container.querySelector('.sal-dice');
        if (dice) dice.classList.add('rolling');
        
        this.diceVal = forcedVal !== null ? forcedVal : Math.floor(Math.random()*6)+1;
        
        if (this.mode === 'online' && forcedVal === null) {
            this.socket.emit('dice-roll', { value: this.diceVal, playerIndex: this.current });
        }

        setTimeout(() => {
            if (dice) { dice.classList.remove('rolling'); dice.textContent = this.diceVal; }
            this.movePlayer(this.diceVal);
        }, 450);
    }
    
    onNetworkDice(data) {
        if (this.mode !== 'online' || this.gameOver) return;
        if (data.playerIndex !== this.current) return;
        this.rollDice(data.value);
    }

    movePlayer(steps) {
        const p = this.players[this.current];
        let np = p.pos + steps;
        if (np > 100) { this.rolling = false; this.nextTurn(); return; }
        p.pos = np;

        if (this.snakes[p.pos]) {
            setTimeout(() => { p.pos = this.snakes[p.pos]; this.render(); }, 500);
        }
        if (this.ladders[p.pos]) {
            setTimeout(() => { p.pos = this.ladders[p.pos]; this.render(); }, 500);
        }

        if (p.pos === 100) {
            this.gameOver = true; this.render();
            
            let msg, cls;
            if (this.mode === 'online') {
                const isMe = this.current === this.myPlayerIndex;
                msg = isMe ? 'You Win! 🎉' : `${this.oppName} Wins! 😜`;
                cls = isMe ? 'win' : 'lose';
                if (isMe && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
            } else if (this.mode === 'local') {
                msg = `${p.name} Wins! 🎉`;
                cls = 'win';
            } else {
                const isP1 = this.current === 0;
                msg = isP1 ? 'You Win! 🎉' : 'Virgi Wins! 😜';
                cls = isP1 ? 'win' : 'lose';
                if (isP1 && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
            }
            
            this.statusEl.textContent = msg;
            this.statusEl.className = 'float-status ' + cls;
            this.rolling = false; return;
        }

        this.render();
        setTimeout(() => { this.rolling = false; this.nextTurn(); }, 700);
    }

    nextTurn() {
        this.current = 1 - this.current;
        this.render();
        if (this.mode === 'ai' && this.current === 1 && !this.gameOver) {
            setTimeout(() => this.rollDice(), 600);
        }
    }

    updateStatus() {
        if (!this.gameOver) {
            if (this.mode === 'online') {
                this.statusEl.textContent = this.current === this.myPlayerIndex ? 'Your Turn — Roll!' : `${this.oppName}'s Turn`;
            } else {
                this.statusEl.textContent = this.players[this.current].name + ' — Roll dice!';
            }
            this.statusEl.className = 'float-status';
        }
    }

    reset() {
        this.players.forEach(p => p.pos = 0);
        this.current = 0; this.gameOver = false; this.rolling = false; this.diceVal = 1;
        this.render();
    }
}
