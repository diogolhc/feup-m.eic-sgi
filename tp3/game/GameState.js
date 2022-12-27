class GameState {
    constructor(model) {
        this.model = model;
    }

    update(t) {}

    getSelectedPiece() {
        return null;
    }

    getMoveHints() {
        return [];
    }

    getHighlightedPieces() {}

    selectPiece(piece, x, y) {}

    selectTile(x, y) {}

    getCurrentPlayer() {
        return null;
    }

    spotlightOn() {
        return null;
    }
}

export class PlayerTurnState extends GameState {
    static TURN_TIME_LIMIT = 300;

    constructor(model, player, startTime, t = null, validMoves = null) {
        super(model);
        this.player = player;
        this.start_time = startTime;
        this.current_time = t !== null? t : startTime;
        this.validMoves = validMoves? validMoves : this.model.getValidMoves(this.player.getId());
        this.validMovesPieces = [];
        for (let move of this.validMoves) {
            if (!this.validMovesPieces.some(piece => piece[0] == move.from[0] && piece[1] == move.from[1])) {
                this.validMovesPieces.push(move.from);
            }
        }
    }

    selectPiece(piece, x, y) {
        if (this.model.getPlayerId(x, y) !== this.player.getId()) {
            return;
        }

        const filteredValidMoves = this.validMoves.filter(move => move.from[0] == x && move.from[1] == y);

        if (filteredValidMoves.length == 0) {
            piece.animateUnallowed();
            return;
        }

        this.model.setGameState(new PieceSelectedState(this.model, this.player, this.start_time, this.current_time, this.validMoves, filteredValidMoves, piece, [x, y]));
    }

    update(t) {
        this.current_time = t;
        // TODO check if time is up
    }

    getHighlightedPieces() {
        return this.validMovesPieces;
    }

    getCurrentPlayer() {
        return this.player;
    }

    getRemainingTime() {
        const t = PlayerTurnState.TURN_TIME_LIMIT - Math.round((this.current_time - this.start_time) / 1000);
        return t > 0 ? t : 0;
    }
}

export class PieceSelectedState extends PlayerTurnState {
    constructor(model, player, startTime, t, validMoves, filteredValidMoves, piece, piecePosition) {
        super(model, player, startTime, t, validMoves);
        this.piece = piece;
        this.piecePosition = piecePosition;
        this.filteredValidMoves = filteredValidMoves;
    }

    selectPiece(piece, x, y) {
        if (x == this.piecePosition[0] && y == this.piecePosition[1]) {
            this.model.setGameState(new PlayerTurnState(this.model, this.player, this.start_time, this.current_time, this.validMoves));
            return;
        }

        if (this.model.getPlayerId(x, y) === this.player.getId()) {
            super.selectPiece(piece, x, y);
        } else {
            this.selectTile(x, y);
        }
    }

    selectTile(x, y) {
        const move = this.filteredValidMoves.find(move => move.to[0] == x && move.to[1] == y);
        if (move) {
            const completedMove = this.model.move(move);
            this.model.setGameState(new PieceMovingState(this.model, this.player, this.start_time, this.current_time, completedMove, this.piece));
            this.player.changeCumulativeTime((this.current_time - this.start_time) / 1000);
        } else {
            this.piece.animateUnallowed();
            this.model.game.makeCross(x, y);
            this.model.setGameState(new PlayerTurnState(this.model, this.player, this.start_time, this.current_time));
        }
    }

    getSelectedPiece() {
        return this.piece;
    }

    getHighlightedPieces() {
        return this.validMovesPieces;
    }

    getMoveHints() {
        return this.filteredValidMoves.map(move => move.to);
    }

    getCurrentPlayer() {
        return this.player;
    }
}

export class PieceMovingState extends GameState {
    constructor(model, player, startTime, moveTime, completedMove, piece) {
        super(model);
        this.player = player;
        this.start_time = startTime;
        this.move_time = moveTime;
        this.completedMove = completedMove;
        this.piece = piece;

        this.piece.animateMove(completedMove, () => {
            const captureMoves = this.model.getValidMovesFor(this.completedMove.to[0], this.completedMove.to[1])[0];

            if (completedMove.captured && captureMoves.length > 0) {
                this.model.setGameState(new PieceSelectedState(this.model, this.player, this.model.current_time, null, captureMoves, captureMoves, this.piece, this.completedMove.to));
            } else {
                this.model.setGameState(new PlayerTurnState(this.model, this.model.getOpponent(this.player), this.model.current_time));
            }
        });
    }

    getHighlightedPieces() {
        return [this.completedMove.from];
    }

    getCurrentPlayer() {
        return this.player;
    }

    spotlightOn() {
        return [this.piece.position[0], this.piece.position[2]];
    }
}

export class GameOverState extends GameState {
    constructor(model, winner) {
        super(model);
        this.winner = winner;
    }
}
