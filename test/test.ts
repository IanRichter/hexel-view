import fs from 'fs';
import path from 'path';
import { Compiler } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { Source } from '../src/source';


async function main(): Promise<void> {
	const tags = {
		blockTagName: 'js',
		expressionStart: '{%',
		expressionEnd: '%}',
		printStart: '{%=',
		commentStart: '{%#'
	};
	const viewSourcemaps = {};

	let absoluteViewPath = path.resolve(__dirname, 'views/test.html');
	let sourceString = fs.readFileSync(absoluteViewPath, { encoding: 'utf-8' });
	let source = new Source(sourceString, absoluteViewPath);

	let lexer = new Lexer(source, tags);
	let parser = new Parser();
	let viewNode = parser.parse(lexer, source);

	let compiler = new Compiler();
	let view = compiler.compile(viewNode, viewSourcemaps);

	if (this.writeGeneratedViews) {
		let generatedCodePath = path.join(source.filePath, '.gen.js');
		fs.writeFileSync(generatedCodePath, view.code, { encoding: 'utf-8' });
	}

	console.log('Done');

	// let renderer = new Renderer({
	// 	views: './test/views',
	// 	cache: false,
	// 	writeGeneratedViews: true
	// });

	// let result = renderer.render('test.html', {});
	// console.log(result);
}

main().catch(console.error);