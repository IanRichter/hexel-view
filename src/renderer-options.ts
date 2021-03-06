import { ExpressionTags } from './expression-tags';

export interface RendererOptions {
	views?: string;
	cache?: boolean;
	tags?: ExpressionTags;
	layout?: string;
	tabSize?: number;
}
