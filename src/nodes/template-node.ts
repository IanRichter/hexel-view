import { Position } from '../position';
import { CompositeNode } from './composite-node';

export class TemplateNode extends CompositeNode {

	public filename: string;
	public source: string;

	public constructor(position: Position, filename: string, source: string) {
		super(position);
		this.filename = filename;
		this.source = source;
	}

}