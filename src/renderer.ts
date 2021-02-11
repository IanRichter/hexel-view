import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { Compiler } from './compiler';
import { View } from './view';
import { Node } from './nodes/node';

export class Renderer {

	private baseViewPath: string;
	private viewCache: Map<string, View> = null;

	// ========================================================================

	public constructor(options: RendererOptions = DefaultRendererOptions) {
		this.baseViewPath = path.resolve(process.cwd(), options.views);

		if (options.cache) {
			this.viewCache = new Map<string, View>();
		}
	}

	// TODO: Remove
	public renderAST(viewPath: string, context: object = {}): Node {
		let viewSource = this.getViewSource(viewPath);
		let parser = new Parser();
		let viewAST = parser.parse(viewSource);
		return viewAST;
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

	/**
	 * Precompiles all the views found within your views directory.
	 * Can be used within a build pipeline to improve runtime performance.
	 */
	public precompileViews(): void {
		// TODO: Implement this
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