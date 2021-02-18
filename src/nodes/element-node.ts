import { CompositeNode } from './composite-node';
import { ElementAttributeNode } from './element-attribute-node';
import { ElementClosingNode } from './element-closing-node';

export class ElementNode extends CompositeNode {

	public closingNode: ElementClosingNode;
	public tagName: string = '';
	public isVoid: boolean = false;
	public isSelfClosing: boolean = false;
	public attributes: ElementAttributeNode[] = [];

}