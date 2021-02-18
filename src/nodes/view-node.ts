import { Position } from '../position';
import { CompositeNode } from './composite-node';
import { LayoutNode } from './layout-node';

export class ViewNode extends CompositeNode {

	public source: string;
	public filePath: string;
	public layoutNode: LayoutNode = null;

	public constructor(source: string, filePath: string) {
		super(new Position(1, 1));
		this.source = source;
		this.filePath = filePath;
	}

}