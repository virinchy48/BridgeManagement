// Bridge Management System — Main Service Barrel
using from './services/restrictions';
using from './services/bridges';
using from './services/dashboard';
using from './services/map';
using from './services/upload';
using from './services/admin';
using from './services/mass-edit';
using from './services/load-ratings';
using from './services/risk-assessments';
using from './services/nhvr-compliance';
using from './services/elements';
using from './services/defects';
using from './services/alerts';

service BridgeManagementService @(path: '/bridge-management') {}
