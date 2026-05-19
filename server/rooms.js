// Room Manager
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        } while (this.rooms.has(code));
        return code;
    }

    createRoom(gameType, hostId, hostName) {
        const code = this.generateCode();
        this.rooms.set(code, {
            code,
            gameType,
            host: { id: hostId, name: hostName },
            guest: null,
            state: null,
            createdAt: Date.now()
        });
        return code;
    }

    joinRoom(code, guestId, guestName) {
        const room = this.rooms.get(code);
        if (!room) return { error: 'Room not found' };
        if (room.guest) return { error: 'Room is full' };
        room.guest = { id: guestId, name: guestName };
        return { ok: true, room };
    }

    getRoom(code) {
        return this.rooms.get(code) || null;
    }

    removeRoom(code) {
        this.rooms.delete(code);
    }

    removePlayerFromRooms(socketId) {
        for (const [code, room] of this.rooms) {
            if (room.host.id === socketId || (room.guest && room.guest.id === socketId)) {
                this.rooms.delete(code);
                return code;
            }
        }
        return null;
    }

    // Cleanup old rooms (>30 min)
    cleanup() {
        const now = Date.now();
        for (const [code, room] of this.rooms) {
            if (now - room.createdAt > 30 * 60 * 1000) this.rooms.delete(code);
        }
    }
}

module.exports = new RoomManager();
