// ============================================
// CHESS — with AI, Local, Online
// ============================================
class ChessGame {
    constructor(container, statusEl, mode, socket) {
        this.container = container;
        this.statusEl = statusEl;
        this.mode = mode; // 'ai', 'local', 'online'
        this.socket = socket;
        
        // Online specific
        this.isHost = true;
        this.myColor = 'white';
        this.oppName = 'Opponent';
        
        this.selected = null; this.validMoves = [];
        this.currentPlayer = 'white'; this.gameOver = false;
        this.captured = {white:[],black:[]};
        this.initBoard(); this.render();
    }

    setOnlineData(isHost, oppName) {
        this.isHost = isHost;
        this.myColor = isHost ? 'white' : 'black';
        this.oppName = oppName;
        this.updateStatus();
    }

    initBoard() {
        const b=['R','N','B','Q','K','B','N','R'];
        this.board = [];
        for (let r=0;r<8;r++) {
            this.board[r]=[];
            for (let c=0;c<8;c++) {
                if (r===0) this.board[r][c]={type:b[c],color:'black'};
                else if (r===1) this.board[r][c]={type:'P',color:'black'};
                else if (r===6) this.board[r][c]={type:'P',color:'white'};
                else if (r===7) this.board[r][c]={type:b[c],color:'white'};
                else this.board[r][c]=null;
            }
        }
    }

    pc(p) {
        if (!p) return '';
        const m={white:{K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙'},black:{K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'}};
        return m[p.color][p.type];
    }

    render() {
        this.container.innerHTML = '';
        const w = document.createElement('div');
        w.className = 'chess-wrapper';

        const cb = document.createElement('div');
        cb.className = 'chess-captured';
        cb.textContent = this.captured.black.map(p=>this.pc(p)).join('');
        w.appendChild(cb);

        const board = document.createElement('div');
        board.className = 'chess-board';
        
        // In online mode, flip board for black so their pieces are at the bottom
        const flip = this.mode === 'online' && this.myColor === 'black';
        
        for (let row=0;row<8;row++) {
            for (let col=0;col<8;col++) {
                const r = flip ? 7 - row : row;
                const c = flip ? 7 - col : col;
                
                const cell = document.createElement('div');
                cell.className = 'chess-cell '+((r+c)%2===0?'light':'dark');
                const piece = this.board[r][c];
                if (piece) cell.textContent = this.pc(piece);
                if (this.selected&&this.selected.r===r&&this.selected.c===c) cell.classList.add('selected');
                if (this.validMoves.some(m=>m.r===r&&m.c===c)) {
                    cell.classList.add('valid-move');
                    if (piece) cell.classList.add('has-piece');
                }
                cell.addEventListener('click', () => this.handleClick(r,c));
                board.appendChild(cell);
            }
        }
        w.appendChild(board);

        const cw = document.createElement('div');
        cw.className = 'chess-captured';
        cw.textContent = this.captured.white.map(p=>this.pc(p)).join('');
        w.appendChild(cw);

        this.container.appendChild(w);
        this.updateStatus();
    }

    handleClick(r,c) {
        if (this.gameOver) return;
        if (this.mode === 'online' && this.currentPlayer !== this.myColor) return;
        if (this.mode === 'ai' && this.currentPlayer !== 'white') return;
        
        const piece = this.board[r][c];

        if (this.selected) {
            if (this.validMoves.some(m=>m.r===r&&m.c===c)) {
                
                if (this.mode === 'online') {
                    this.socket.emit('game-move', { fr: this.selected.r, fc: this.selected.c, tr: r, tc: c, color: this.myColor });
                }
                
                this.executeMove(this.selected.r, this.selected.c, r, c);
                
                if (!this.gameOver && this.mode === 'ai' && this.currentPlayer === 'black') {
                    setTimeout(()=>this.aiMove(), 500);
                }
                return;
            }
            if (piece && piece.color===this.currentPlayer) {
                this.selected={r,c}; this.validMoves=this.getValidMoves(r,c); this.render(); return;
            }
            this.selected=null; this.validMoves=[]; this.render(); return;
        }

        if (piece && piece.color===this.currentPlayer) {
            this.selected={r,c}; this.validMoves=this.getValidMoves(r,c); this.render();
        }
    }
    
    onNetworkMove(data) {
        if (this.mode !== 'online' || this.gameOver) return;
        if (data.color !== this.currentPlayer) return;
        
        this.executeMove(data.fr, data.fc, data.tr, data.tc);
    }

    executeMove(fr, fc, tr, tc) {
        const target = this.board[tr][tc];
        if (target) {
            this.captured[target.color].push(target);
            if (target.type==='K') {
                this.gameOver = true;
                const w = this.board[fr][fc].color;
                
                let msg, cls;
                if (this.mode === 'online') {
                    const isMe = w === this.myColor;
                    msg = isMe ? 'You Win! 🎉' : `${this.oppName} Wins! 😜`;
                    cls = isMe ? 'win' : 'lose';
                    if (isMe && this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
                } else if (this.mode === 'local') {
                    msg = `${w==='white'?'White':'Black'} wins! 🎉`;
                    cls = 'win';
                } else {
                    msg = w==='white'?'You Win! 🎉':'Virgi Wins! 😜';
                    cls = w==='white'?'win':'lose';
                    if (w==='white'&&this.onGameOverCallback) this.onGameOverCallback(document.getElementById('display-username').textContent);
                }
                
                this.statusEl.textContent = msg;
                this.statusEl.className = 'float-status ' + cls;
            }
        }
        
        this.board[tr][tc]=this.board[fr][fc]; this.board[fr][fc]=null;
        const p=this.board[tr][tc];
        if (p&&p.type==='P'&&((p.color==='white'&&tr===0)||(p.color==='black'&&tr===7))) p.type='Q';
        
        this.selected=null; this.validMoves=[];
        
        if (!this.gameOver) {
            this.currentPlayer = this.currentPlayer==='white'?'black':'white';
        }
        this.render();
    }

    getValidMoves(r,c) {
        const piece=this.board[r][c]; if(!piece) return [];
        const moves=[]; const col=piece.color; const enemy=col==='white'?'black':'white';
        const ib=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
        const ie=(r,c)=>ib(r,c)&&!this.board[r][c];
        const isE=(r,c)=>ib(r,c)&&this.board[r][c]&&this.board[r][c].color===enemy;
        const add=(r,c)=>{if(ie(r,c)||isE(r,c)) moves.push({r,c});};
        const slide=(dirs)=>{for(const[dr,dc]of dirs){for(let i=1;i<8;i++){const nr=r+dr*i,nc=c+dc*i;if(!ib(nr,nc))break;if(ie(nr,nc)){moves.push({r:nr,c:nc});continue;}if(isE(nr,nc)){moves.push({r:nr,c:nc});break;}break;}}};

        switch(piece.type) {
            case 'P': {
                const d=col==='white'?-1:1; const s=col==='white'?6:1;
                if(ie(r+d,c)){moves.push({r:r+d,c});if(r===s&&ie(r+2*d,c))moves.push({r:r+2*d,c});}
                if(isE(r+d,c-1))moves.push({r:r+d,c:c-1});if(isE(r+d,c+1))moves.push({r:r+d,c:c+1});break;
            }
            case 'R':slide([[1,0],[-1,0],[0,1],[0,-1]]);break;
            case 'B':slide([[1,1],[1,-1],[-1,1],[-1,-1]]);break;
            case 'Q':slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);break;
            case 'N':for(const[dr,dc]of[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])add(r+dr,c+dc);break;
            case 'K':for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])add(r+dr,c+dc);break;
        }
        return moves;
    }

    aiMove() {
        if (this.gameOver) return;
        let all=[];
        for(let r=0;r<8;r++)for(let c=0;c<8;c++){
            const p=this.board[r][c];
            if(p&&p.color==='black'){
                this.getValidMoves(r,c).forEach(m=>all.push({fr:r,fc:c,tr:m.r,tc:m.c,cap:!!this.board[m.r][m.c]}));
            }
        }
        if(!all.length){this.gameOver=true;this.statusEl.textContent='Stalemate! 🤝';return;}
        const caps=all.filter(m=>m.cap);
        const mv=caps.length?caps[Math.floor(Math.random()*caps.length)]:all[Math.floor(Math.random()*all.length)];
        
        this.executeMove(mv.fr, mv.fc, mv.tr, mv.tc);
    }

    updateStatus() {
        if(this.gameOver) return;
        if(this.mode === 'online') {
            this.statusEl.textContent = this.currentPlayer === this.myColor ? 'Your Turn' : `${this.oppName}'s Turn`;
        } else if (this.mode === 'local') {
            this.statusEl.textContent = (this.currentPlayer==='white'?'White':'Black')+"'s Turn";
        } else {
            this.statusEl.textContent = this.currentPlayer==='white'?'Your Turn (White)':"Virgi thinking...";
        }
        this.statusEl.className = 'float-status';
    }

    reset() {
        this.selected=null;this.validMoves=[];this.currentPlayer='white';
        this.gameOver=false;this.captured={white:[],black:[]};
        this.initBoard();this.render();
    }
}
