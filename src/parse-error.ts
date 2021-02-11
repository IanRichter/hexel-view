import { Position } from './position';

export class ParseError extends Error {

	public constructor(message: string, position: Position) {
		super(`Line ${position.line}:${position.column}: ${message}`);
	}

}