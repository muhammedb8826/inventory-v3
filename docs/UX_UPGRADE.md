# Workspace experience update

## Row actions

Tables with several secondary actions use a compact, labelled ellipsis menu. Inventory retains the clickable item name for quick inspection. Its menu includes details, edit, adjust, movement history, copy SKU and permitted deletion. Deletion is disabled when stock is nonzero or reserved, matching server rules. Dialogs mount outside the dropdown, so closing a menu does not close its form. Roles, users, customer/supplier/location records, accounts, expenses and notifications use the same action pattern. Single frequent actions such as opening an inquiry can remain visible.

## Information hierarchy

Inventory defaults prioritize item, on-hand quantity, availability, location, stock value and stock update time. Additional selectable columns include reservations, unit cost, reorder point, SKU, barcode, item type, creation time and record ID. Other resource tables have a domain-specific priority order: identity, operational status/amount, context, then supporting information and metadata. Created/updated times, creator, notes and line counts are optional where those fields exist. Missing source metadata displays a dash; no timestamps or actors are invented. Historical data does not gain new authorship information from this UI change.

The column chooser and saved visibility preferences remain available. Sorting and selection apply to the loaded page, as stated in the table footer. Exports include selected records and the chosen visible columns.

## Navigation and visual system

The application layout now owns the sidebar/header once, preserving navigation state between pages. The sidebar uses permission-filtered groups, current-page markers and a saved collapsed-state cookie. Mobile links close the navigation drawer after selection. Page search is available from the header and Ctrl/Cmd+K.

A common indigo action color, neutral surfaces and consistent spacing apply across the workspace, headers, controls, cards and charts. Green indicates positive/healthy states, amber low stock/caution and red destructive/negative states. Primary buttons use theme-aware foreground colors. Reduced-motion preferences are respected.

## Responsive behavior

Below 640 px, lists display selectable record cards with the primary identity, four priority fields and expandable details; the action menu remains available. At larger widths, tables preserve data density and horizontally scroll when more columns are enabled, with actions pinned at the right. The sidebar becomes a drawer on mobile, with persistent bottom navigation and safe-area spacing. Page/table skeletons keep loading transitions stable.

Browser checks cover desktop, 390 px mobile, 320 px narrow screens and dark mode, plus table metadata, menu-to-dialog behavior, bulk operations, page search and sidebar persistence. Browser fixtures contain test data only. Tests use .next-e2e; build verification uses .next-build-check, leaving an existing development server's .next directory separate.
