import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { Compiler } from './compiler';
import { View } from './view';
import { RendererOptions } from './renderer-options';

export class Renderer {

	private baseViewPath: string;
	private viewCache: Map<string, View>;
	private writeGeneratedViews: boolean;

	// ========================================================================

	public constructor({
		views = './views',
		cache = true,
		writeGeneratedViews = false
	}: RendererOptions = {}) {
		this.baseViewPath = path.resolve(process.cwd(), views);
		this.viewCache = cache ? new Map<string, View>() : null;
		this.writeGeneratedViews = writeGeneratedViews;
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
			let parser = new Parser();
			let viewAST = parser.parse(fullViewPath, viewSource);

			// Compile AST into View object
			let compiler = new Compiler();
			let view = compiler.compile(viewAST);

			// Write JS code to disk
			if (this.writeGeneratedViews) {
				// fs.mkdirSync(path.join(this.baseViewPath, '.generated', path.dirname(viewPath)), { recursive: true });

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