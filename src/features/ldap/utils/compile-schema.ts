import { parseLdapSchema, type ParsedObjectClass, type ParsedSchema } from './parse-schema'

export interface CompiledLdapSchema {
  parsed: ParsedSchema
  attributeMap: Map<string, { canonical: string; aliases: string[] }>
  objectClassMap: Map<string, ParsedObjectClass>
}

export function compileParsedLdapSchema(parsed: ParsedSchema): CompiledLdapSchema {
  const attributeMap = new Map<string, { canonical: string; aliases: string[] }>()
  for (const attribute of parsed.attributeTypes) {
    const canonical = attribute.names[0] ?? attribute.oid
    const aliases = Array.from(
      new Set([attribute.oid, ...attribute.names].filter(Boolean).map((key) => key.toLowerCase()))
    )
    const entry = { canonical, aliases }
    for (const alias of aliases) attributeMap.set(alias, entry)
  }

  const objectClassMap = new Map<string, ParsedObjectClass>()
  for (const objectClass of parsed.objectClasses) {
    for (const key of [objectClass.oid, ...objectClass.names]) {
      if (key) objectClassMap.set(key.toLowerCase(), objectClass)
    }
  }
  return { parsed, attributeMap, objectClassMap }
}

export function compileLdapSchema(input: string): CompiledLdapSchema {
  return compileParsedLdapSchema(parseLdapSchema(input))
}
