import test from 'node:test';
import assert from 'node:assert/strict';
import {photoList,photoStep} from '../js/photo-gallery.js';
import {capitalizeDescription,placeDescription} from '../js/russian.js';
test('descriptions capitalize the first letter, preserving names and following text',()=>{
 assert.equal(capitalizeDescription('«старинный храм» в Киото.\n\n  музей с садом.'),'«Старинный храм» в Киото.\n\n  Музей с садом.');
 assert.equal(placeDescription({shortDesc:'дзен-храм с садом'},true),'Дзен-храм с садом');
 assert.equal(placeDescription({authorSupplied:true,desc:'старинный храм.\n\nсад с прудом.'}),'Старинный храм.\n\nСад с прудом.');
 assert.equal(capitalizeDescription(''),'');
});
test('gallery retains licensed metadata and deduplicates cover variants',()=>{
 const cover={img:'thumb',imageSource:'commons:file',imageCredit:'Author',imageLicense:'CC BY'};
 const photos=photoList(cover,[{img:'other-size',imageSource:'commons:file'},{img:'second',imageSource:'commons:second',imageLicense:'CC BY-SA'}]);
 assert.equal(photos.length,2);assert.equal(photos[0].imageCredit,'Author');assert.equal(photos[1].imageLicense,'CC BY-SA');
 assert.equal(photoList({imageOriginal:'original'})[0].img,'original');assert.deepEqual(photoList({},[]),[]);
});
test('photo navigation wraps in both directions and handles a single image',()=>{
 assert.equal(photoStep(0,-1,3),2);assert.equal(photoStep(2,1,3),0);assert.equal(photoStep(0,1,1),0);assert.equal(photoStep(0,1,0),0);
});
