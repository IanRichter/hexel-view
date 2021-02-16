import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { Compiler } from './compiler';
import { View } from './view';
import { RendererOptions } from './renderer-options';
import { ExpressionTags } from './expression-tags';
import { Lexer } from './lexer';

export class Renderer {

	private baseViewPath: string;
	private viewCache: Map<string, View>;
	private writeGeneratedViews: boolean;
	private tags: ExpressionTags;

	// ========================================================================

	public constructor({
		views = './views',
		cache = true,
		writeGeneratedViews = false,
		tags = {
			blockTagName: 'js',
			expressionStart: '{%',
			expressionEnd: '%}',
			printStart: '{%=',
			commentStart: '{%#'
		}
	}: RendererOptions = {}) {
		this.baseViewPath = path.resolve(process.cwd(), views);
		this.viewCache = cache ? new Map<string, View>() : null;
		this.writeGeneratedViews = writeGeneratedViews;
		this.tags = tags;
	}

	/**
	 * Renders the specified view, using the provided context, and returns the resulting HTML.
	 */
	public render(viewPath: string, context: object = {}): string {
		let fullViewPath = path.join(this.baseViewPath, viewPath);
		viewPath = fullViewPath.replace(this.baseViewPath, '');

		let view = this.viewCache?.get(viewPath);

		if (!view) {
			// Get view source
			if (!fs.existsSync(fullViewPath)) {
				throw new Error(`View does not exist: ${viewPath}`);
			}

			let viewSource = fs.readFileSync(fullViewPath, { encoding: 'utf-8' });

			// Parse view into AST
			let lexer = new Lexer(viewSource, this.tags);
			let parser = new Parser();
			let viewAST = parser.parse(lexer, fullViewPath, viewSource);

			// Compile AST into View object
			let compiler = new Compiler();
			view = compiler.compile(viewAST);

			// Write JS code to disk
			if (this.writeGeneratedViews) {
				let jsOutputPath = path.join(this.baseViewPath, `${viewPath}.gen.js`);
				fs.writeFileSync(jsOutputPath, view.code, { encoding: 'utf-8' });
			}

			// Cache view
			this.viewCache?.set(viewPath, view);
		}

		// return view.render(context);
		return '';
	}

	/**
	 * Renders the given string as a view, using the provided context, and returns the resulting HTML.
	 */
	// public renderString(viewSource, context = {}): string {
	// 	let view = this.buildView('fakepath/view.html', viewSource);
	// 	return view.render(context);
	// }

	/**
	 * Precompiles all the views found within your views directory.
	 */
	// public precompileViews(): void {
	// 	// TODO: Implement this
	// }

	// ========================================================================

	private verifyTags() {
		if (this.tags.expressionStart.length < 2) {
			throw new Error('expressionStart must be at least 2 characters long.');
		}

		if (this.tags.expressionEnd.length < 2) {
			throw new Error('expressionEnd must be at least 2 characters long.');
		}

		if (this.tags.printStart.substring(0, this.tags.expressionStart.length) !== this.tags.expressionStart) {
			throw new Error('printStart must start with the same characters as expressionStart.');
		}

		if (this.tags.commentStart.substring(0, this.tags.expressionStart.length) !== this.tags.expressionStart) {
			throw new Error('commentStart must start with the same characters as expressionStart.');
		}
	}

	// private buildView(filename: string, viewSource: string): View {
	// 	// Parse view into AST
	// 	let parser = new Parser();
	// 	let viewAST = parser.parse(filename, viewSource);

	// 	// Compile AST into View object
	// 	let compiler = new Compiler();
	// 	let view = compiler.compile(viewAST);

	// 	// Write JS code to disk
	// 	// if (this.writegeneratedViews) {
	// 	// 	fs.mkdirSync(path.join(this.baseViewPath, '.generated'), { recursive: true });

	// 	// 	let jsOutputPath = path.join(this.baseViewPath, '.generated', `${templatePath}.js`);
	// 	// 	fs.writeFileSync(jsOutputPath, view.code, { encoding: 'utf-8' });
	// 	// }

	// 	return view;
	// }

}