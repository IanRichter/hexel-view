import { WHITESPACE_CHARS } from './constants';
import { ExpressionTags } from './expression-tags';
import { Source } from './source';
import { Token } from './token';
import { TokenType } from './token-type';

const LETTERS_REGEX: RegExp = /[a-zA-Z]+/;
const NUMBERS_REGEX: RegExp = /[0-9]+/;
const TAG_NAME_START_REGEX: RegExp = /[a-zA-Z0-9]/;
const ATTRIBUTE_KEYWORD_START_REGEX: RegExp = /[a-zA-Z0-9]/;

const ATTRIBUTE_KEYWORD_TERMINATING_CHARS: string[] = ['/', '>', '=', '"', '\'', ...WHITESPACE_CHARS];
const TAGNAME_TERMINATING_CHARS: string[] = ['/', '>', ...WHITESPACE_CHARS];

const KEYWORDS_MAP = {
	'in': TokenType.InKeyword
};
const ATTRIBUTE_KEYWORDS_MAP = {
	'block': TokenType.BlockAttributeKeyword,
	'context': TokenType.ContextAttributeKeyword
};
const BLOCK_KEYWORD_MAP = {
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

	private source: Source;
	private tags: ExpressionTags;

	public constructor(source: Source, tags: ExpressionTags) {
		this.source = source;
		this.tags = tags;
	}

	public parseToken(): Token {
		if (this.source.isEOF()) {
			return this.createToken(TokenType.EndOfFile);
		}

		if (this.source.matchesSubstring(this.tags.expressionStart)) {
			return this.getExpressionStartToken();
		}

		if (this.source.matchesSubstring(this.tags.expressionEnd)) {
			return this.getExpressionEndToken();
		}

		switch (this.source.peek()) {
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

		if (this.source.matchesOneOf(WHITESPACE_CHARS)) {
			return this.getWhitespaceToken();
		}

		if (this.source.matchesRegex(LETTERS_REGEX)) {
			return this.getLetters();
		}

		if (this.source.matchesRegex(NUMBERS_REGEX)) {
			return this.getNumbers();
		}

		return this.getCharAsToken(TokenType.Unknown);
	}

	private getExpressionStartToken(): Token {
		// if (this.source.matchesSubstring(this.tags.expressionStartEscape)) {
		// 	let token = this.createToken(TokenType.ExpressionStartEscape);
		// 	token.symbol += this.source.expectSubstring(this.delimiters.expressionStartEscape);
		// 	token.value = this.delimiters.expressionStart;
		// 	return token;
		// }

		if (this.source.matchesSubstring(this.tags.printStart)) {
			let token = this.createToken(TokenType.PrintExpressionStart);
			token.symbol += this.source.expectSubstring(this.tags.printStart);
			return token;
		}

		if (this.source.matchesSubstring(this.tags.commentStart)) {
			let token = this.createToken(TokenType.CommentExpressionStart);
			token.symbol += this.source.expectSubstring(this.tags.commentStart);
			return token;
		}

		let token = this.createToken(TokenType.ExpressionStart);
		token.symbol += this.source.expectSubstring(this.tags.expressionStart);
		return token;
	}

	/**
	 * @returns {Token}
	 */
	private getExpressionEndToken(): Token {
		// if (this.source.matchesSubstring(this.delimiters.expressionEndEscape)) {
		// 	let token = this.createToken(TokenType.ExpressionEndEscape);
		// 	token.symbol += this.source.expectSubstring(this.delimiters.expressionEndEscape);
		// 	token.value = this.delimiters.expressionEnd;
		// 	return token;
		// }

		let token = this.createToken(TokenType.ExpressionEnd);
		token.symbol += this.source.expectSubstring(this.tags.expressionEnd);
		return token;
	}

	private getLeftAngleBraceOrMoreToken(): Token {
		let token = this.createToken(TokenType.LeftAngleBrace);
		token.symbol += this.source.expect('<');

		if (this.source.matches('/')) {
			return this.getClosingTagToken(token);
		}

		if (this.source.matches('!')) {
			return this.getSpecialTagToken(token);
		}

		if (TAG_NAME_START_REGEX.test(this.source.peek())) {
			return this.getElementStartOrBlockToken(token);
		}

		return token;
	}

	private getClosingTagToken(token: Token): Token {
		token.symbol += this.source.expect('/');

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
		token.symbol += this.source.expect('!');

		if (this.source.matchesSubstring('--')) {
			token.type = TokenType.CommentStart;
			token.symbol += this.source.expectSubstring('--');
			return token;
		}

		// TODO: Change to be a case insensitive match
		if (this.source.matchesSubstring('[CDATA[')) {
			token.type = TokenType.CDataStart;
			token.symbol += this.source.expectSubstring('[CDATA[');
			return token;
		}

		// TODO: Change to be a case insensitive match
		if (this.source.matchesSubstring('DOCTYPE')) {
			token.type = TokenType.Doctype;
			token.symbol += this.source.expectSubstring('DOCTYPE');
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
		token.symbol += this.source.consumeOptionalWhitespace();

		if (this.source.matches('@')) {
			token.symbol += this.source.expect('@');

			let keyword = this.source.consumeUntilMatchesOneOf(ATTRIBUTE_KEYWORD_TERMINATING_CHARS);
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
		token.symbol += this.source.expect(']');

		if (this.source.matchesSubstring(']>')) {
			token.type = TokenType.CDataEnd;
			token.symbol += this.source.expectSubstring(']>');
			return token;
		}

		return token;
	}

	private getAttributekKeywordToken(): Token {
		let token = this.createToken();
		token.symbol += this.source.expect('@');

		if (!ATTRIBUTE_KEYWORD_START_REGEX.test(this.source.peek())) {
			token.type = TokenType.At;
			return token;
		}

		let keyword = this.source.consumeUntilMatchesOneOf(ATTRIBUTE_KEYWORD_TERMINATING_CHARS);
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
		token.symbol += this.source.expect('-');

		if (!this.source.matches('-')) {
			token.type = TokenType.Dash;
			return token;
		}

		token.symbol += this.source.expect('-');

		if (!this.source.matches('>')) {
			token.type = TokenType.DoubleDash;
			return token;
		}

		token.type = TokenType.CommentEnd;
		token.symbol += this.source.expect('>');
		return token;
	}

	private getWhitespaceToken(): Token {
		let token = this.createToken(TokenType.Whitespace);
		token.symbol += this.source.expectWhitespace();
		return token;
	}

	private getLetters(): Token {
		let token = this.createToken(TokenType.Letters);
		token.symbol += this.source.consumeRegex(LETTERS_REGEX);

		if (token.symbol in KEYWORDS_MAP) {
			token.type = KEYWORDS_MAP[token.symbol];
		}

		return token;
	}

	private getNumbers(): Token {
		let token = this.createToken(TokenType.Numbers);
		token.symbol += this.source.consumeRegex(NUMBERS_REGEX);
		return token;
	}

	private getTagName(): string {
		if (!TAG_NAME_START_REGEX.test(this.source.peek())) {
			return null;
		}

		return this.source.consumeUntilMatchesOneOf(TAGNAME_TERMINATING_CHARS).toLowerCase();
	}

	private createToken(type: TokenType = null): Token {
		return new Token(type, this.source.getPosition(), '');
	}

	private getCharAsToken(tokenType: TokenType): Token {
		let token = this.createToken(tokenType);
		token.symbol += this.source.consume();
		return token;
	}

}