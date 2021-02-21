import { WHITESPACE_CHARS } from './constants';
import { ParseError } from './parse-error';
import { Position } from './position';

export class InputStream {

	private input: string;
	private inputCursor: number = 0;
	private line: number = 1;
	private column: number = 1;
	private tabSize: number;

	public constructor(input: string, tabSize: number) {
		this.input = input;
		this.tabSize = tabSize;
	}

	public getPosition(): Position {
		return new Position(this.line, this.column);
	}

	public isEOF(): boolean {
		return this.inputCursor >= this.input.length;
	}

	public peek(): string {
		return this.isEOF() ? null : this.input[this.inputCursor];
	}

	public matches(char: string): boolean {
		return this.peek() === char;
	}

	public matchesOneOf(chars: string[]): boolean {
		return chars.some(char => this.matches(char));
	}

	public matchesSubstring(substring: string): boolean {
		if (this.inputCursor + substring.length > this.input.length) {
			return false;
		}

		for (let i = 0; i < substring.length; i++) {
			if (substring[i] !== this.input[this.inputCursor + i]) {
				return false;
			}
		}

		return true;
	}

	public matchesRegex(regex: RegExp): boolean {
		regex = new RegExp(regex, 'y');
		regex.lastIndex = this.inputCursor;
		return regex.test(this.input);
	}

	public consume(): string {
		if (this.isEOF()) {
			this.throwError('Unexpected end of file.');
		}

		let char = this.input[this.inputCursor++];
		this.movePositionByChar(char);
		return char;
	}

	public consumeUntilMatches(matchChar: string): string {
		let chars = '';
		while (!this.matches(matchChar)) {
			chars += this.consume();
		}
		return chars;
	}

	public consumeUntilMatchesOneOf(matchChars: string[]): string {
		let chars = '';
		while (!this.matchesOneOf(matchChars)) {
			chars += this.consume();
		}
		return chars;
	}

	public consumeOptionalWhitespace(): string {
		let chars = '';
		while (this.matchesOneOf(WHITESPACE_CHARS)) {
			chars += this.consume();
		}
		return chars;
	}

	public consumeRegex(regex: RegExp): string {
		regex = new RegExp(regex, 'y');
		regex.lastIndex = this.inputCursor;
		let match = regex.exec(this.input);

		if (!match) {
			return null;
		}

		let chars = match[0];
		this.inputCursor += chars.length;

		for (let char of chars) {
			this.movePositionByChar(char);
		}

		return chars;
	}

	public expect(char: string): string {
		if (!this.matches(char)) {
			this.throwError('Encountered unexpected character.');
		}

		return this.consume();
	}

	public expectOneOf(chars: string[]): string {
		if (!this.matchesOneOf(chars)) {
			this.throwError('Encountered unexpected character.');
		}

		return this.consume();
	}

	public expectSubstring(substring: string): string {
		for (let char of substring) {
			this.expect(char);
		}

		return substring;
	}

	public expectWhitespace(): string {
		let chars = '';

		while (this.matchesOneOf(WHITESPACE_CHARS)) {
			chars += this.consume();
		}

		if (chars.length === 0) {
			this.throwError('Expected one or more whitespace characters.');
		}

		return chars;
	}

	private throwError(message: string): void {
		throw new ParseError(message, this.getPosition());
	}

	private movePositionByChar(char: string): void {
		switch (char) {
			case '\n':
				this.line++;
				this.column = 1;
				break;
			case '\t':
				this.column += this.tabSize;
				break;
			default:
				this.column++;
		}
	}

}
