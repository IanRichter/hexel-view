import path from 'path';
import fs from 'fs';

import { Parser } from './parser';
import { Compiler } from './compiler';
import { View } from './view';
import { ExpressionTags } from './expression-tags';

export interface EnvironmentOptions {
	rootViewsPath: string;
	cacheViews: boolean;
	tags: ExpressionTags;
	tabSize: number;
}

export class Environment {

	private rootViewsPath: string;
	private cacheViews: boolean;
	private viewCache: Map<string, View>;
	private viewSourcemaps: Record<string, unknown>;
	private tags: ExpressionTags;
	private tabSize: number;

	public constructor({
		rootViewsPath,
		cacheViews,
		tags,
		tabSize
	}: EnvironmentOptions) {
		this.rootViewsPath = rootViewsPath;
		this.cacheViews = cacheViews;
		this.viewCache = new Map();
		this.viewSourcemaps = {};
		this.tags = tags;
		this.tabSize = tabSize;
	}

	public verifyViewPath(relativeViewPath: string): string {
		let absoluteViewPath = path.resolve(this.rootViewsPath, relativeViewPath);

		if (!fs.existsSync(absoluteViewPath)) {
			throw new Error(`View not found: ${absoluteViewPath}`);
		}

		return absoluteViewPath;
	}

	public getView(relativeViewPath: string): View {
		let absoluteViewPath = this.verifyViewPath(relativeViewPath);

		if (this.viewCache.has(absoluteViewPath)) {
			return this.viewCache.get(absoluteViewPath);
		}

		let source = fs.readFileSync(absoluteViewPath, { encoding: 'utf-8' });
		let view = this.createView(source, absoluteViewPath);

		if (this.cacheViews) {
			this.viewCache.set(absoluteViewPath, view);
		}

		return view;
	}

	public createView(source: string, filePath: string): View {
		let parser = new Parser({
			tags: this.tags,
			tabSize: this.tabSize
		});
		let viewNode = parser.parse(source, filePath);

		let compiler = new Compiler();
		let view = compiler.compile(viewNode, this.viewSourcemaps);

		return view;
	}

}
