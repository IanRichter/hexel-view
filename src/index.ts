import { HexelView } from 'hexel-view';

let renderer = new HexelView({
	views: './views'
});

renderer.render('list.html', {});
renderer.renderPartial('item.html', {});