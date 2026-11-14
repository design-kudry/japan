import {japanCatalog} from './japan-catalog.js';
import {ukCatalog} from './uk-catalog.js';
// One curated directory for all destinations; route and saved identities stay independent.
export const curatedCatalog=[...japanCatalog,...ukCatalog];
