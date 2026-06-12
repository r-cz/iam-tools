# LDAP Tools

The LDAP tools help inspect directory schemas and LDIF data without sending entries or schema text to an external service.

## Schema Explorer

Path: `/ldap/schema-explorer`

Use the Schema Explorer to parse and review LDAP schema definitions from RFC-style, Active Directory, and PingDirectory-style sources.

Key workflows:

- Paste or upload schema definitions containing `attributeTypes` and `objectClasses`.
- Load built-in Core LDAP, Active Directory, PingDirectory, or combined schemas.
- Search parsed object classes and attribute types by name, description, or OID.
- Review object class inheritance, required attributes, optional attributes, syntax, matching rules, and raw definitions.
- Save schema snapshots locally for reuse in LDIF validation.

Schema snapshots are stored in the browser and are intended for local debugging workflows.

## LDIF Builder & Viewer

Path: `/ldap/ldif-builder`

Use the LDIF Builder & Viewer to inspect entries, start from templates, and validate sample data against selected schemas.

Key workflows:

- Paste or upload LDIF entries.
- Insert built-in templates for common entry shapes.
- Review parsed entries, DN values, attribute counts, and multi-valued attributes.
- Select built-in or saved schemas to detect unknown attributes, unknown object classes, and missing required attributes.
- Copy or download the current LDIF text.

## Validation Notes

- The parser handles folded LDIF lines, base64-encoded values, comments, multiple entries, and modification separators.
- Schema validation is opt-in. Select at least one built-in or saved schema in the LDIF Builder to enable validation.
- Validation is case-insensitive for LDAP attribute and object class names.
- Saved schemas and LDIF text stay local to the browser.

## Troubleshooting

- If validation reports unknown attributes, confirm the matching schema is selected.
- If required attributes are missing, check every listed object class on the entry. Structural and auxiliary classes can each contribute requirements.
- If a schema does not parse as expected, expand raw definitions in the Schema Explorer and verify that lines are complete and folded correctly.
