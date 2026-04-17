// Value help with Tree View
using from '../admin-bridges/fiori-service';
annotate AdminService.Bridges:restriction with @Common.ValueList.PresentationVariantQualifier: 'VH';
annotate AdminService.Restrictions with @UI.PresentationVariant #VH: {
  RecursiveHierarchyQualifier : 'RestrictionsHierarchy',
};
