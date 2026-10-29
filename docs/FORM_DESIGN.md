# Consistent form design

The third supplied reference is the primary layout reference: grouped sections with a clear hierarchy, secondary image/details in a side panel, and an explicit save/cancel bar. Existing indigo branding and dark-mode tokens are retained across the workspace.

## Shared components

`PageForm` owns the width, required-field legend, responsive main/aside grid and action placement. `PageFormCard`, `PageFormSection`, `FormGrid` and `FormField` provide the same card radius, numbered sections, spacing and labels. `FormSummary` renders live values; it does not post data or fabricate missing fields. Product entry includes an image panel and summary. Sales, purchases, BOMs, production, transfers and expenses use the same summary component. Inquiry, account and branding forms share the field/section/action system. Administration and quick-create dialogs use the same control styling and scrollable-body pattern.

Control targets are at least 44 pixels high inside forms/dialogs. Labels remain above controls; placeholders are supplemental. Required indicators, helper text, validation borders and focus rings use common tokens. Field context connects controls to labels, helper/error messages and required/invalid semantics. Dialogs and popovers reset that context so nested controls do not inherit duplicate IDs. Existing explicitly named controls retain their names.

`PageFormActions` keeps the primary action at the right with Cancel beside it. The action bar stays in normal document flow after the fields and supporting panels, so it never floats over inputs or summary rows. The page provides bottom-navigation clearance on phones. Long quick-create/master dialogs scroll their content and keep their footer reachable. Actions remain ordinary submit/cancel operations; no draft behavior was introduced.

## Product entry

Supported product data is grouped into Basic information and Inventory and costing. Product name still uses the existing API description field; no duplicate description field is invented. The optional image and live summary sit to the right at wide widths and stack below the fields on smaller screens. The same catalog-backed unit picker is used in full and quick product entry. Quantity precision and backend field names are retained.

## Transaction lines

Sale, purchase, BOM and transfer line editors use container queries so their layout follows actual available width. Narrow containers display labelled fields rather than squeeze fixed-width table columns. Wide containers use compact aligned column headers. Individual line labels remain available to assistive technology. Summary totals use existing quantity and rate fields and do not add tax/discount assumptions.

## Verification

Browser coverage checks live product summaries, label/description associations, duplicate IDs, WCAG rules, mobile widths of 390/320 pixels, shared patterns across form pages and nested quick-create dialogs. Screenshots are generated in test-results. Existing session/table tests remain part of regression verification. No database migration is required for these visual changes.

Local production browser verification: build with INVENTORY_BUILD_CHECK=true, then run Playwright with INVENTORY_E2E_MODE=production. This uses .next-build-check against the fixture API, avoids development hot-reload timing, and leaves an existing development server separate.
