/** SCIM 2.0 core User resource schema (RFC 7643 section 4.1). */
export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User' as const

/** SCIM 2.0 core Group resource schema (RFC 7643 section 4.2). */
export const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group' as const

/** SCIM 2.0 Enterprise User extension schema (RFC 7643 section 4.3). */
export const SCIM_ENTERPRISE_USER_SCHEMA =
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User' as const

/** SCIM 2.0 PATCH request schema (RFC 7644 section 3.5.2). */
export const SCIM_PATCH_OP_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp' as const
