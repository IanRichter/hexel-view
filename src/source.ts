import { ParseError } from './parse-error';
import { Position } from './position';
import { WHITESPACE_CHARS } from './constants';

export class Source {

	private sourceString: string;
	private sourceCursor: number = 0;
	private lineNumber: number = 1;
	private columnNumber: number = 1;
	private filePath: string;

	// TODO: Default to fake path for library (maybe generate UUID for .html file) (needed for sourcemaps)
	public constructor(sourceString: string, filePath: string = '') {
		this.sourceString = sourceString.replace(/\r\n/g, '\n');
		this.filePath = filePath;
	}

	public getPosition(): Position {
		return new Position(this.lineNumber, this.columnNumber);
	}

	public isEOF(): boolean {
		return this.sourceCursor >= this.sourceString.length;
	}

	public peek(): string {
		if (this.isEOF()) {
			return null;
		}

		return this.sourceString[this.sourceCursor];
	}

	public matches(char: string): boolean {
		return this.peek() === char;
	}

	public matchesOneOf(chars: string[]): boolean {
		return chars.some(char => this.matches(char));
	}

	public matchesSubstring(substring: string): boolean {
		if (this.sourceCursor + substring.length > this.sourceString.length) {
			return false;
		}

		for (let i = 0; i < substring.length; i++) {
			if (substring[i] !== this.sourceString[this.sourceCursor + i]) {
				return false;
			}
		}

		return true;
	}

	public matchesRegex(regex: RegExp): boolean {
		regex = new RegExp(regex, 'y');
		regex.lastIndex = this.sourceCursor;
		return regex.test(this.sourceString);
	}

	// lookAheadMatches(char) {
	// 	const amount = 1;
	// 	return this.sourceCursor + amount < this.sourceString.length && this.sourceString[this.sourceCursor + amount] === char;
	// }

	public consume(): string {
		if (this.isEOF()) {
			throw new ParseError('Unexpected end of file.', this.getPosition());
		}

		let char = this.sourceString[this.sourceCursor];
		this.sourceCursor++;

		if (char === '\n') {
			this.lineNumber++;
			this.columnNumber = 1;
		}
		else {
			this.columnNumber++;
		}

		return char;
	}

	private consumeUntilMatches(matchChar: string): string {
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
		regex.lastIndex = this.sourceCursor;
		let match = regex.exec(this.sourceString);

		if (!match) {
			return null;
		}

		let chars = match[0];
		this.sourceCursor += chars.length;
		this.columnNumber += chars.length;
		return chars;
	}

	public expect(char: string): string {
		if (!this.matches(char)) {
			throw new ParseError('Encountered unexpected character.', this.getPosition());
		}

		return this.consume();
	}

	private expectOneOf(chars: string[]): string {
		if (!this.matchesOneOf(chars)) {
			throw new ParseError('Encountered unexpected character.', this.getPosition());
		}

		return this.consume();
	}

	public expectSubstring(substring: string): string {
		for (let i = 0; i < substring.length; i++) {
			if (substring[i] !== this.sourceString[this.sourceCursor + i]) {
				let position = this.getPosition();
				position.column += i;
				throw new ParseError('Encountered unexpected character.', position);
			}
		}

		this.sourceCursor += substring.length;
		this.columnNumber += substring.length;
		return substring;
	}

	public expectWhitespace(): string {
		let chars = '';
		while (this.matchesOneOf(WHITESPACE_CHARS)) {
			chars += this.consume();
		}

		if (chars.length === 0) {
			throw new ParseError('Expected one or more whitespace characters.', this.getPosition());
		}

		return chars;
	}

}