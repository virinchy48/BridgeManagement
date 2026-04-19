// Bridge Management System — Main Service Barrel
using from './services/restrictions';
using from './services/bridges';
using from './services/dashboard';
using from './services/map';
using from './services/upload';
using from './services/admin';
using from './services/mass-edit';

service BridgeManagementService @(path: '/bridge-management') {}
