import test from 'node:test';
import assert from 'node:assert/strict';
import {placePriceLabel,placeRouteMeta,placeMeta} from '../js/place-meta.js';
test('price contains only one unambiguous amount and currency',()=>{
 assert.equal(placePriceLabel('£55 — экскурсия, взрослый'),'≈ £55');
 assert.equal(placePriceLabel('¥1,500–2,500 · билет'),'≈ ¥1,500–2,500');
 assert.equal(placePriceLabel('20 GBP'),'≈ 20 GBP');
 for(const value of ['Платно','¥0','£20 adult £10 child','—'])assert.equal(placePriceLabel(value),'');
});
test('hours are never inferred from a category or missing information',()=>{
 assert.equal(placeRouteMeta({price:'Бесплатно',hours:'24/7'}),'Бесплатно · Круглосуточно');
 assert.equal(placeRouteMeta({category:'park'}),'Уточнить часы');
 assert.equal(placeRouteMeta({category:'monument'}),'Круглосуточно');
 assert.equal(placeRouteMeta({outdoorAccessConfirmed:true}),'Круглосуточно');
 assert.equal(placeRouteMeta({price:'£55 — adult',hours:'10:00–18:00'}),'≈ £55 · 10:00–18:00');
});
test('unknown hours link only to a supplied HTTP official website',()=>{
 assert.equal(placeMeta({website:'https://example.org/visit'}).website,'https://example.org/visit');
 assert.equal(placeMeta({website:'javascript:alert(1)'}).website,'');
 assert.equal(placeMeta({}).website,'');
});

test('compact labels omit visiting prose and daily prefixes',()=>{
 assert.equal(placeRouteMeta({price:'£55 — взрослый',hours:'Ежедневно 10:00–18:00'}),'≈ £55 · 10:00–18:00');
 assert.equal(placePriceLabel('Бесплатно — постоянная коллекция'),'Бесплатно');
 assert.equal(placeMeta({hours:'По сеансам, по предварительной записи'}).hours,'Уточнить часы');
 assert.equal(placeMeta({hours:'Mo-Su 10:00-18:00'}).hours,'10:00–18:00');
 assert.equal(placeMeta({hours:'Ежедневно 10:00–18:00; пт до 21:00. Закрыто 24 декабря'}).hours,'10:00–18:00; пт до 21:00');
});

test('outdoor quarters and monuments omit all prices',()=>{
 assert.equal(placeRouteMeta({category:'monument',price:'Бесплатно'}),'Круглосуточно');
 assert.equal(placeRouteMeta({outdoorAlwaysOpen:true,price:'¥500',hours:'10:00–18:00'}),'Круглосуточно');
});

test('compact metadata drops seasonal prose and keeps one time range',()=>{
 assert.equal(placeRouteMeta({price:'¥800',hours:'Ориентировочно 9:00–16:00; осенью (14 ноя–6 дек) мост с 8:30'}),'≈ ¥800 · 9:00–16:00');
 assert.equal(placeRouteMeta({price:'¥800',hours:'8:30–16:00 (20 сентября–19 марта)'}),'≈ ¥800 · 8:30–16:00');
});
