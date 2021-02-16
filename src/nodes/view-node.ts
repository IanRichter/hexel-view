import { Position } from '../position';
import { Source } from '../source';
import { CompositeNode } from './composite-node';
import { LayoutNode } from './layout-node';

export class ViewNode extends CompositeNode {

	public source: Source;
	public layoutNode: LayoutNode;

	public constructor(source: Source) {
		super(new Position(1, 1));
		this.source = source;
		this.layoutNode = null;
	}

}