import { ExpressionTags } from './expression-tags';

export interface RendererOptions {
	views?: string;
	cache?: boolean;
	writeGeneratedViews?: boolean;
	tags?: ExpressionTags;
}