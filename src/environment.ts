import path from 'path';
import fs from 'fs';

import { Source } from './source';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Compiler } from './compiler';
import { View } from './view';
import { ExpressionTags } from './expression-tags';

export interface EnvironmentOptions {
	rootViewsPath: string;
	cacheViews: boolean;
	tags: ExpressionTags;
}

export class Environment {

	private rootViewsPath: string;
	private cacheViews: boolean;
	private viewCache: Map<string, View>;
	private viewSourcemaps: object;
	private tags: ExpressionTags;

	public constructor({
		rootViewsPath,
		cacheViews,
		tags
	}: EnvironmentOptions) {
		this.rootViewsPath = rootViewsPath;
		this.cacheViews = cacheViews;
		this.viewCache = new Map();
		this.viewSourcemaps = {};
		this.tags = tags;
	}

	private verifyViewPath(relativeViewPath: string): string {
		let absoluteViewPath = path.join(this.rootViewsPath, relativeViewPath);

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

		let sourceString = fs.readFileSync(absoluteViewPath, { encoding: 'utf-8' });
		let source = new Source(sourceString, absoluteViewPath);
		let view = this.createView(source);

		if (this.cacheViews) {
			this.viewCache.set(absoluteViewPath, view);
		}

		return view;
	}

	public createView(source: Source): View {
		let lexer = new Lexer(source, this.tags);
		let parser = new Parser();
		let viewNode = parser.parse(lexer, source);

		let compiler = new Compiler();
		let view = compiler.compile(viewNode, this.viewSourcemaps);

		return view;
	}

}