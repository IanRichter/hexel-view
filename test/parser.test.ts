import { expect } from 'chai';
import { CaseNode } from '../src/nodes/case-node';
import { CDataNode } from '../src/nodes/cdata-node';
import { CommentNode } from '../src/nodes/comment-node';
import { DefaultCaseNode } from '../src/nodes/default-case-node';
import { DoctypeNode } from '../src/nodes/doctype-node';
import { ElementNode } from '../src/nodes/element-node';
import { ElseIfNode } from '../src/nodes/else-if-node';
import { ElseNode } from '../src/nodes/else-node';
import { ForeachNode } from '../src/nodes/foreach-node';
import { IfNode } from '../src/nodes/if-node';
import { PrintNode } from '../src/nodes/print-node';
import { ScopeNode } from '../src/nodes/scope-node';
import { SwitchNode } from '../src/nodes/switch-node';
import { TextNode } from '../src/nodes/text-node';
import { WhitespaceNode } from '../src/nodes/whitespace-node';
import { Parser } from '../src/parser';

describe('Parser', function () {
	describe('#parse', function () {
		it('parses plain text', function () {
			let viewSource = `Hello, world!`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<TextNode>();

			expect(node).to.be.instanceOf(TextNode);
			expect(node.textContent).to.equal(viewSource);
		});

		it('parses HTML comment', function () {
			let viewSource = `<!--Comment-->`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<CommentNode>();

			expect(node).to.be.instanceOf(CommentNode);
			expect(node.textContent).to.equal('Comment');
		});

		it('parses HTML5 doctype', function () {
			let viewSource = `<!DOCTYPE html>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<DoctypeNode>();

			expect(node).to.be.instanceOf(DoctypeNode);
		});

		it('parses whitespace text', function () {
			let viewSource = ` \n	`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<WhitespaceNode>();

			expect(node).to.be.instanceOf(WhitespaceNode);
			expect(node.textContent).to.equal(viewSource);
		});

		it('parses HTML CDATA', function () {
			let textContent = 'Text content';
			let viewSource = `<![CDATA[${textContent}]]>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<CDataNode>();

			expect(node).to.be.instanceOf(CDataNode);
			expect(node.textContent).to.equal(textContent);
		});

		it('parses HTML element', function () {
			let viewSource = `<span></span>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<ElementNode>();

			expect(node).to.be.instanceOf(ElementNode);
			expect(node.tagName).to.equal('span');
		});

		it('parses HTML void element', function () {
			let viewSource = `<img>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<ElementNode>();

			expect(node).to.be.instanceOf(ElementNode);
			expect(node.tagName).to.equal('img');
		});

		it('parses HTML self-closing element', function () {
			let viewSource = `<div />`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<ElementNode>();

			expect(node).to.be.instanceOf(ElementNode);
			expect(node.tagName).to.equal('div');
		});

		it('parses custom element', function () {
			let viewSource = `<custom-element></custom-element>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<ElementNode>();

			expect(node).to.be.instanceOf(ElementNode);
			expect(node.tagName).to.equal('custom-element');
		});

		it('parses self-closing custom element', function () {
			let viewSource = `<custom-element />`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<ElementNode>();

			expect(node).to.be.instanceOf(ElementNode);
			expect(node.tagName).to.equal('custom-element');
		});

		// TODO: Test element attribute parsing

		it('parses js scope node', function () {
			let viewSource = `<js></js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<ScopeNode>();

			expect(node).to.be.instanceOf(ScopeNode);
		});

		it('parses js print node', function () {
			let viewSource = `<js @print="true"></js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<PrintNode>();

			expect(node).to.be.instanceOf(PrintNode);
		});

		it('parses js if node', function () {
			let viewSource = `<js @if="true"></js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<IfNode>();

			expect(node).to.be.instanceOf(IfNode);
		});

		it('parses js else-if node', function () {
			let viewSource = `<js @if="true"></js><js @else-if="true"></js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<IfNode>();

			expect(node).to.be.instanceOf(IfNode);
			expect(node.alternateNode).to.be.instanceOf(ElseIfNode);
		});

		it('parses js else node', function () {
			let viewSource = `<js @if="true"></js><js @else></js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<IfNode>();

			expect(node).to.be.instanceOf(IfNode);
			expect(node.alternateNode).to.be.instanceOf(ElseNode);
		});

		it('parses js switch node', function () {
			let viewSource = `<js @switch="true"></js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<SwitchNode>();

			expect(node).to.be.instanceOf(SwitchNode);
		});

		it('parses js switch case node', function () {
			let viewSource =
			`<js @switch="true">
				<js @case="true"></js>
			</js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<SwitchNode>();

			expect(node).to.be.instanceOf(SwitchNode);
			expect(node.cases.length).to.be.equal(1);
			expect(node.cases[0]).to.be.instanceOf(CaseNode);
		});

		it('parses js switch default case node', function () {
			let viewSource =
			`<js @switch="true">
				<js @default></js>
			</js>`;
			let parser = new Parser();
			let node = parser.parse(viewSource).getFirstChild<SwitchNode>();

			expect(node).to.be.instanceOf(SwitchNode);
			expect(node.defaultCase).to.be.instanceOf(DefaultCaseNode);
		});

		describe('parses foreach node', function () {
			it('parses foreach value in array', function () {
				let viewSource = `<js @foreach="value in array"></js>`;
				let parser = new Parser();
				let node = parser.parse(viewSource).getFirstChild<ForeachNode>();

				expect(node).to.be.instanceOf(ForeachNode);
				expect(node.identifiers).to.eql(['value']);
			});

			it('parses foreach value and index in array', function () {
				let viewSource = `<js @foreach="value, index in array"></js>`;
				let parser = new Parser();
				let node = parser.parse(viewSource).getFirstChild<ForeachNode>();

				expect(node).to.be.instanceOf(ForeachNode);
				expect(node.identifiers).to.eql(['value', 'index']);
			});

			it('parses foreach key of object', function () {
				let viewSource = `<js @foreach="key of object"></js>`;
				let parser = new Parser();
				let node = parser.parse(viewSource).getFirstChild<ForeachNode>();

				expect(node).to.be.instanceOf(ForeachNode);
				expect(node.identifiers).to.eql(['key']);
			});

			it('parses foreach key and value of object', function () {
				let viewSource = `<js @foreach="key, value of object"></js>`;
				let parser = new Parser();
				let node = parser.parse(viewSource).getFirstChild<ForeachNode>();

				expect(node).to.be.instanceOf(ForeachNode);
				expect(node.identifiers).to.eql(['key', 'value']);
			});
		});
	});
});