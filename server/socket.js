const rooms = require('./rooms');
const db = require('./db');

function initSocket(io) {
    io.on('connection', (socket) => {
        const session = socket.request.session;
        const username = session && session.username;
        if (!username) { socket.disconnect(); return; }

        socket.username = username;
        console.log(`[Socket] ${username} connected`);

        // Create room
        socket.on('create-room', (gameType) => {
            const code = rooms.createRoom(gameType, socket.id, username);
            socket.join(code);
            socket.roomCode = code;
            socket.emit('room-created', { code, gameType });
            console.log(`[Room] ${username} created room ${code} for ${gameType}`);
        });

        // Join room
        socket.on('join-room', (code) => {
            const result = rooms.joinRoom(code.toUpperCase(), socket.id, username);
            if (result.error) { socket.emit('join-error', result.error); return; }

            socket.join(code);
            socket.roomCode = code;
            const room = result.room;

            // Notify both players
            io.to(code).emit('game-start', {
                code,
                gameType: room.gameType,
                host: room.host.name,
                guest: room.guest.name
            });
            console.log(`[Room] ${username} joined room ${code}`);
        });

        // Game move (generic — works for all games)
        socket.on('game-move', (data) => {
            const code = socket.roomCode;
            if (!code) return;
            // Broadcast to the other player
            socket.to(code).emit('game-move', {
                ...data,
                player: username
            });
        });

        // Dice roll (for snakes/ludo)
        socket.on('dice-roll', (data) => {
            const code = socket.roomCode;
            if (!code) return;
            socket.to(code).emit('dice-roll', data);
        });

        // Game over — update stats
        socket.on('game-over', (data) => {
            if (data.winner) {
                try {
                    db.prepare('UPDATE users SET wins = wins + 1 WHERE username = ?').run(data.winner);
                } catch(e) {}
            }
            if (data.players) {
                data.players.forEach(p => {
                    try {
                        db.prepare('UPDATE users SET games_played = games_played + 1 WHERE username = ?').run(p);
                    } catch(e) {}
                });
            }
        });

        // Leave room
        socket.on('leave-room', () => {
            const code = socket.roomCode;
            if (code) {
                socket.to(code).emit('opponent-left', { username });
                socket.leave(code);
                rooms.removeRoom(code);
                socket.roomCode = null;
            }
        });

        // Rematch request
        socket.on('rematch', () => {
            const code = socket.roomCode;
            if (code) socket.to(code).emit('rematch-request', { from: username });
        });

        socket.on('rematch-accept', () => {
            const code = socket.roomCode;
            if (code) io.to(code).emit('rematch-start');
        });

        // Disconnect
        socket.on('disconnect', () => {
            const code = rooms.removePlayerFromRooms(socket.id);
            if (code) {
                io.to(code).emit('opponent-left', { username });
            }
            console.log(`[Socket] ${username} disconnected`);
        });
    });

    // Cleanup every 5 minutes
    setInterval(() => rooms.cleanup(), 5 * 60 * 1000);
}

module.exports = initSocket;
