using { AdminService } from '../../srv/admin-service';
using bridge.management from '../../db/schema';
using from '../common';

// ── Annotation modules — one file per entity/tile ────────────────────────
// Each file contains only the FE4 annotations for that entity.
// To find annotations for a specific tile, read the matching file directly.
using from './annotations/bridges';
using from './annotations/restrictions';
using from './annotations/bridge-restrictions';
using from './annotations/capacities';
using from './annotations/scour';
using from './annotations/documents';
using from './annotations/attributes';
using from './annotations/validation';
using from './annotations/draft-enabled';
using from './annotations/inspections';
using from './annotations/defects';
using from './annotations/elements';
using from './annotations/risk-assessments';
using from './annotations/load-ratings';
using from './annotations/nhvr';
using from './annotations/alerts';
using from './annotations/conditions';
using from './annotations/permits';
using from './annotations/asset-iq';
using from './annotations/maintenance';
using from './annotations/restriction-provisions';
