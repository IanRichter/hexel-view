import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { Compiler } from './compiler';
import { View } from './view';

export class Renderer {

	private baseViewPath: string;
	private viewCache: Map<string, View> = null;

	// ========================================================================

	public constructor({ views, cache }: RendererOptions = DefaultRendererOptions) {
		this.baseViewPath = path.resolve(__dirname, views);

		if (cache) {
			this.viewCache = new Map<string, View>();
		}
	}

	/**
	 * Renders the specified view, using the provided context, and returns the resulting HTML.
	 */
	public render(viewPath: string, context: object = {}): string {
		let view: View;

		if (this.viewCache && this.viewCache.has(viewPath)) {
			view = this.viewCache.get(viewPath);
		}
		else {
			let viewSource = this.getViewSource(viewPath);
			view = this.buildView(viewSource);

			if (this.viewCache) {
				this.viewCache.set(viewPath, view);
			}
		}

		return view.render(context);
	}

	/**
	 * Renders the given string as a view, using the provided context, and returns the resulting HTML.
	 */
	public renderString(viewSource, context = {}): string {
		let view = this.buildView(viewSource);
		return view.render(context);
	}

	// ========================================================================

	private getViewSource(viewPath: string): string {
		let fullViewPath = path.resolve(this.baseViewPath, viewPath);

		if (!fs.existsSync(fullViewPath)) {
			throw new Error(`View does not exist: ${viewPath}`);
		}

		let viewSource = fs.readFileSync(fullViewPath, { encoding: 'utf-8' });

		return viewSource;
	}

	private buildView(viewSource: string): View {
		// Parse view into AST
		let parser = new Parser();
		let viewAST = parser.parse(viewSource);

		// Compile AST into View object
		let compiler = new Compiler();
		let view = compiler.compile(viewAST);

		return view;
	}

}

export interface RendererOptions {
	views?: string;
	cache?: boolean;
	watch?: boolean;
	watchOptions?: object;
}

export const DefaultRendererOptions = {
	views: './views',
	cache: true,
	watch: false,
	watchOptions: null
};