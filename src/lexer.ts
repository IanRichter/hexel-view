import { WHITESPACE_CHARS } from './constants';
import { ExpressionTags } from './expression-tags';
import { ParseError } from './parse-error';
import { Position } from './position';
import { Token } from './token';
import { TokenType } from './token-type';

const LETTERS_REGEX: RegExp = /[a-zA-Z]+/;
const NUMBERS_REGEX: RegExp = /[0-9]+/;
const TAG_NAME_START_REGEX: RegExp = /[a-zA-Z0-9]/;
const ATTRIBUTE_KEYWORD_START_REGEX: RegExp = /[a-zA-Z0-9]/;

const ATTRIBUTE_KEYWORD_TERMINATING_CHARS: string[] = ['/', '>', '=', '"', '\'', ...WHITESPACE_CHARS];
const TAGNAME_TERMINATING_CHARS: string[] = ['/', '>', ...WHITESPACE_CHARS];

const KEYWORDS_MAP: Record<string, TokenType> = {
	'in': TokenType.InKeyword
};
const ATTRIBUTE_KEYWORDS_MAP: Record<string, TokenType> = {
	'block': TokenType.BlockAttributeKeyword,
	'context': TokenType.ContextAttributeKeyword
};
const BLOCK_KEYWORD_MAP: Record<string, TokenType> = {
	'print': TokenType.Print,
	'if': TokenType.If,
	'else-if': TokenType.ElseIf,
	'else': TokenType.Else,
	'switch': TokenType.Switch,
	'case': TokenType.Case,
	'default': TokenType.DefaultCase,
	'foreach': TokenType.Foreach,
	'while': TokenType.While,
	'render': TokenType.Render,
	'layout': TokenType.Layout,
	'render-content': TokenType.RenderContent,
	'content-for': TokenType.ContentFor
};

/**
 * TODO: Split into an HTMLLexer and JSLexer, and let each only create tokens for that language, from a single TokenType
 */

/**
 * Consumes characters from a Source and produces Tokens.
 */
export class Lexer {

	private source: string;
	private sourceCursor: number = 0;
	private lineNumber: number = 1;
	private columnNumber: number = 1;
	private tags: ExpressionTags;
	private tabSize: number;

	public constructor(source: string, tags: ExpressionTags, tabSize: number) {
		this.source = source;
		this.tags = tags;
		this.tabSize = tabSize;
	}

	public parseToken(): Token {
		if (this.isEOF()) {
			return this.createToken(TokenType.EndOfFile);
		}

		if (this.matchesSubstring(this.tags.expressionStart)) {
			return this.getExpressionStartToken();
		}

		if (this.matchesSubstring(this.tags.expressionEnd)) {
			return this.getExpressionEndToken();
		}

		switch (this.peek()) {
			case '<':
				return this.getLeftAngleBraceOrMoreToken();
			case '>':
				return this.getCharAsToken(TokenType.RightAngleBrace);
			case '{':
				return this.getCharAsToken(TokenType.LeftCurlyBrace);
			case '}':
				return this.getCharAsToken(TokenType.RightCurlyBrace);
			case '[':
				return this.getCharAsToken(TokenType.LeftSquareBrace);
			case ']':
				return this.getRightSquareBraceOrMoreToken();
			case '/':
				return this.getCharAsToken(TokenType.ForwardSlash);
			case '@':
				return this.getAttributekKeywordToken();
			case '?':
				return this.getCharAsToken(TokenType.QuestionMark);
			case '_':
				return this.getCharAsToken(TokenType.Underscore);
			case '$':
				return this.getCharAsToken(TokenType.Dollar);
			case '=':
				return this.getCharAsToken(TokenType.Equals);
			case '-':
				return this.getDashOrMoreToken();
			case '.':
				return this.getCharAsToken(TokenType.Dot);
			case ',':
				return this.getCharAsToken(TokenType.Comma);
			case '"':
				return this.getCharAsToken(TokenType.DoubleQuote);
			case '\'':
				return this.getCharAsToken(TokenType.SingleQuote);
			case '`':
				return this.getCharAsToken(TokenType.Backtick);
		}

		if (this.matchesOneOf(WHITESPACE_CHARS)) {
			return this.getWhitespaceToken();
		}

		if (this.matchesRegex(LETTERS_REGEX)) {
			return this.getLetters();
		}

		if (this.matchesRegex(NUMBERS_REGEX)) {
			return this.getNumbers();
		}

		return this.getCharAsToken(TokenType.Unknown);
	}

	// ========================================================================

	private getExpressionStartToken(): Token {
		// if (this.matchesSubstring(this.tags.expressionStartEscape)) {
		// 	let token = this.createToken(TokenType.ExpressionStartEscape);
		// 	token.symbol += this.expectSubstring(this.delimiters.expressionStartEscape);
		// 	token.value = this.delimiters.expressionStart;
		// 	return token;
		// }

		if (this.matchesSubstring(this.tags.printStart)) {
			let token = this.createToken(TokenType.PrintExpressionStart);
			token.symbol += this.expectSubstring(this.tags.printStart);
			return token;
		}

		if (this.matchesSubstring(this.tags.commentStart)) {
			let token = this.createToken(TokenType.CommentExpressionStart);
			token.symbol += this.expectSubstring(this.tags.commentStart);
			return token;
		}

		let token = this.createToken(TokenType.ExpressionStart);
		token.symbol += this.expectSubstring(this.tags.expressionStart);
		return token;
	}

	/**
	 * @returns {Token}
	 */
	private getExpressionEndToken(): Token {
		// if (this.matchesSubstring(this.delimiters.expressionEndEscape)) {
		// 	let token = this.createToken(TokenType.ExpressionEndEscape);
		// 	token.symbol += this.expectSubstring(this.delimiters.expressionEndEscape);
		// 	token.value = this.delimiters.expressionEnd;
		// 	return token;
		// }

		let token = this.createToken(TokenType.ExpressionEnd);
		token.symbol += this.expectSubstring(this.tags.expressionEnd);
		return token;
	}

	private getLeftAngleBraceOrMoreToken(): Token {
		let token = this.createToken(TokenType.LeftAngleBrace);
		token.symbol += this.expect('<');

		if (this.matches('/')) {
			return this.getClosingTagToken(token);
		}

		if (this.matches('!')) {
			return this.getSpecialTagToken(token);
		}

		if (TAG_NAME_START_REGEX.test(this.peek())) {
			return this.getElementStartOrBlockToken(token);
		}

		return token;
	}

	private getClosingTagToken(token: Token): Token {
		token.symbol += this.expect('/');

		let tagName = this.getTagName();
		if (!tagName) {
			token.type = TokenType.Unknown;
			return token;
		}

		token.properties.set('tagName', tagName);
		token.symbol += tagName;

		if (tagName === this.tags.blockTagName) {
			token.type = TokenType.BlockClosingStart;
		}
		else {
			token.type = TokenType.ElementClosingStart;
		}

		return token;
	}

	private getSpecialTagToken(token: Token): Token {
		token.symbol += this.expect('!');

		if (this.matchesSubstring('--')) {
			token.type = TokenType.CommentStart;
			token.symbol += this.expectSubstring('--');
			return token;
		}

		// TODO: Change to be a case insensitive match
		if (this.matchesSubstring('[CDATA[')) {
			token.type = TokenType.CDataStart;
			token.symbol += this.expectSubstring('[CDATA[');
			return token;
		}

		// TODO: Change to be a case insensitive match
		if (this.matchesSubstring('DOCTYPE')) {
			token.type = TokenType.Doctype;
			token.symbol += this.expectSubstring('DOCTYPE');
			return token;
		}

		token.type = TokenType.Unknown;
		return token;
	}

	private getElementStartOrBlockToken(token: Token): Token {
		let tagName = this.getTagName();
		token.properties.set('tagName', tagName);
		token.symbol += tagName;

		if (tagName === this.tags.blockTagName) {
			return this.getBlockToken(token);
		}

		token.type = TokenType.ElementStart;
		return token;
	}

	private getBlockToken(token: Token): Token {
		token.symbol += this.consumeOptionalWhitespace();

		if (this.matches('@')) {
			token.symbol += this.expect('@');

			let keyword = this.consumeUntilMatchesOneOf(ATTRIBUTE_KEYWORD_TERMINATING_CHARS);
			token.symbol += keyword;

			if (keyword in BLOCK_KEYWORD_MAP) {
				token.type = BLOCK_KEYWORD_MAP[keyword];
				return token;
			}

			// TODO: Once lexer is split for HTML and JS, throw an error for this instead.
			token.type = TokenType.Unknown;
			return token;
		}

		token.type = TokenType.Scope;
		return token;
	}

	private getRightSquareBraceOrMoreToken(): Token {
		let token = this.createToken(TokenType.RightSquareBrace);
		token.symbol += this.expect(']');

		if (this.matchesSubstring(']>')) {
			token.type = TokenType.CDataEnd;
			token.symbol += this.expectSubstring(']>');
			return token;
		}

		return token;
	}

	private getAttributekKeywordToken(): Token {
		let token = this.createToken();
		token.symbol += this.expect('@');

		if (!ATTRIBUTE_KEYWORD_START_REGEX.test(this.peek())) {
			token.type = TokenType.At;
			return token;
		}

		let keyword = this.consumeUntilMatchesOneOf(ATTRIBUTE_KEYWORD_TERMINATING_CHARS);
		token.properties.set('keyword', keyword);
		token.symbol += keyword;

		if (keyword in ATTRIBUTE_KEYWORDS_MAP) {
			token.type = ATTRIBUTE_KEYWORDS_MAP[keyword];
			return token;
		}

		token.type = TokenType.Unknown;
		return token;
	}

	private getDashOrMoreToken(): Token {
		let token = this.createToken();
		token.symbol += this.expect('-');

		if (!this.matches('-')) {
			token.type = TokenType.Dash;
			return token;
		}

		token.symbol += this.expect('-');

		if (!this.matches('>')) {
			token.type = TokenType.DoubleDash;
			return token;
		}

		token.type = TokenType.CommentEnd;
		token.symbol += this.expect('>');
		return token;
	}

	private getWhitespaceToken(): Token {
		let token = this.createToken(TokenType.Whitespace);
		token.symbol += this.expectWhitespace();
		return token;
	}

	private getLetters(): Token {
		let token = this.createToken(TokenType.Letters);
		token.symbol += this.consumeRegex(LETTERS_REGEX);

		if (token.symbol in KEYWORDS_MAP) {
			token.type = KEYWORDS_MAP[token.symbol];
		}

		return token;
	}

	private getNumbers(): Token {
		let token = this.createToken(TokenType.Numbers);
		token.symbol += this.consumeRegex(NUMBERS_REGEX);
		return token;
	}

	private getTagName(): string {
		if (!TAG_NAME_START_REGEX.test(this.peek())) {
			return null;
		}

		return this.consumeUntilMatchesOneOf(TAGNAME_TERMINATING_CHARS).toLowerCase();
	}

	// ========================================================================

	private createToken(type: TokenType = null): Token {
		return new Token(type, this.getPosition(), '');
	}

	private getCharAsToken(tokenType: TokenType): Token {
		let token = this.createToken(tokenType);
		token.symbol += this.consume();
		return token;
	}

	private getPosition(): Position {
		return new Position(this.lineNumber, this.columnNumber);
	}

	private isEOF(): boolean {
		return this.sourceCursor >= this.source.length;
	}

	private peek(): string {
		if (this.isEOF()) {
			return null;
		}

		return this.source[this.sourceCursor];
	}

	private matches(char: string): boolean {
		return this.peek() === char;
	}

	private matchesOneOf(chars: string[]): boolean {
		return chars.some(char => this.matches(char));
	}

	private matchesSubstring(substring: string): boolean {
		if (this.sourceCursor + substring.length > this.source.length) {
			return false;
		}

		for (let i = 0; i < substring.length; i++) {
			if (substring[i] !== this.source[this.sourceCursor + i]) {
				return false;
			}
		}

		return true;
	}

	private matchesRegex(regex: RegExp): boolean {
		regex = new RegExp(regex, 'y');
		regex.lastIndex = this.sourceCursor;
		return regex.test(this.source);
	}

	// lookAheadMatches(char) {
	// 	const amount = 1;
	// 	return this.sourceCursor + amount < this.source.length && this.source[this.sourceCursor + amount] === char;
	// }

	private consume(): string {
		if (this.isEOF()) {
			throw new ParseError('Unexpected end of file.', this.getPosition());
		}

		let char = this.source[this.sourceCursor];
		this.sourceCursor++;

		if (char === '\n') {
			this.lineNumber++;
			this.columnNumber = 1;
		}
		else if (char === '\t') {
			this.columnNumber += this.tabSize;
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

	private consumeUntilMatchesOneOf(matchChars: string[]): string {
		let chars = '';
		while (!this.matchesOneOf(matchChars)) {
			chars += this.consume();
		}
		return chars;
	}

	private consumeOptionalWhitespace(): string {
		let chars = '';
		while (this.matchesOneOf(WHITESPACE_CHARS)) {
			chars += this.consume();
		}
		return chars;
	}

	private consumeRegex(regex: RegExp): string {
		regex = new RegExp(regex, 'y');
		regex.lastIndex = this.sourceCursor;
		let match = regex.exec(this.source);

		if (!match) {
			return null;
		}

		let chars = match[0];
		this.sourceCursor += chars.length;
		this.columnNumber += chars.length;
		return chars;
	}

	private expect(char: string): string {
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

	private expectSubstring(substring: string): string {
		for (let i = 0; i < substring.length; i++) {
			if (substring[i] !== this.source[this.sourceCursor + i]) {
				let position = this.getPosition();
				position.column += i;
				throw new ParseError('Encountered unexpected character.', position);
			}
		}

		this.sourceCursor += substring.length;
		this.columnNumber += substring.length;
		return substring;
	}

	private expectWhitespace(): string {
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