import fs from 'fs';
import path from 'path';
import { Renderer} from '../src/renderer';

async function main(): Promise<void> {
	let renderer = new Renderer({
		views: path.resolve(__dirname, 'views')
	});

	let viewResult = await renderer.render('test.html', {
		items: [1, 2, 3]
	});
	let viewPath = path.resolve(__dirname, 'views/test.html');
	fs.writeFileSync(`${viewPath}.result.html`, viewResult, { encoding: 'utf-8' });
}

main().catch(console.error);