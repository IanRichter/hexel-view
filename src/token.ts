import { Position } from './position';
import { TokenType } from './token-type';

export class Token {

	public type: TokenType;
	public position: Position;
	public symbol: string;

	public tagName: string = null;

	public constructor(type: TokenType, position: Position, symbol: string) {
		this.type = type;
		this.position = position;
		this.symbol = symbol;
	}

}