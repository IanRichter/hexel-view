import fs from 'fs';
import path from 'path';
import { Compiler } from '../src/compiler';
import { Environment } from '../src/environment';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { Source } from '../src/source';

async function main(): Promise<void> {
	let environment = new Environment({
		rootViewsPath: path.resolve(__dirname, 'views'),
		cacheViews: false,
		tags: {
			blockTagName: 'js',
			expressionStart: '{%',
			expressionEnd: '%}',
			printStart: '{%=',
			commentStart: '{%#'
		}
	});

	let view = environment.getView('test.html');

	fs.writeFileSync(`${view.source.filePath}.gen.js`, view.code, { encoding: 'utf-8' });

	let runtime = new Runtime(environment);
	await view.render(runtime, {
		greeting: 'Hello, world!',
		items: ['a', 'b', 'c']
	});

	let viewResult = runtime.getResult();
	fs.writeFileSync(`${view.source.filePath}.result.html`, viewResult, { encoding: 'utf-8' });
}

main().catch(console.error);