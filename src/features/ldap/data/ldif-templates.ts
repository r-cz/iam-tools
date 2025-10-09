export type DirectoryFlavor = 'PingDirectory' | 'Active Directory' | 'Generic LDAP'

export interface LdifTemplate {
  id: string
  name: string
  description: string
  flavor: DirectoryFlavor
  sample: string
  highlights: string[]
}

export const LDIF_TEMPLATES: LdifTemplate[] = [
  {
    id: 'ping-directory-user-add',
    name: 'PingDirectory · Add user',
    description: 'Provision a new inetOrgPerson with mail, uid, and password attributes.',
    flavor: 'PingDirectory',
    highlights: ['inetOrgPerson', 'userPassword', 'mail'],
    sample: `dn: uid=jdoe,ou=people,dc=example,dc=com
objectClass: top
objectClass: person
objectClass: inetOrgPerson
uid: jdoe
givenName: John
sn: Doe
cn: John Doe
displayName: John Doe
mail: jdoe@example.com
userPassword: {CLEAR}Secret123!`,
  },
  {
    id: 'ping-directory-group-update',
    name: 'PingDirectory · Update group members',
    description: 'Modify a static groupOfUniqueNames to replace its membership list.',
    flavor: 'PingDirectory',
    highlights: ['uniqueMember', 'changetype: modify'],
    sample: `dn: cn=engineering,ou=groups,dc=example,dc=com
changetype: modify
replace: uniqueMember
uniqueMember: uid=jdoe,ou=people,dc=example,dc=com
uniqueMember: uid=adoe,ou=people,dc=example,dc=com
-`,
  },
  {
    id: 'active-directory-user-add',
    name: 'Active Directory · Add user',
    description: 'Create a new user object and stage a password reset before enabling.',
    flavor: 'Active Directory',
    highlights: ['sAMAccountName', 'unicodePwd', 'userAccountControl'],
    sample: `dn: CN=John Doe,OU=Users,DC=example,DC=com
changetype: add
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: user
sAMAccountName: jdoe
userPrincipalName: jdoe@example.com
givenName: John
sn: Doe
displayName: John Doe
mail: jdoe@example.com
userAccountControl: 512
unicodePwd:: IgBTAEUAQwBSAEUAUwBUADEAMgAzACEAIgA=
pwdLastSet: 0`,
  },
  {
    id: 'active-directory-group-add',
    name: 'Active Directory · Create security group',
    description: 'Add a universal security group and seed initial members.',
    flavor: 'Active Directory',
    highlights: ['groupType', 'member'],
    sample: `dn: CN=Engineering,OU=Groups,DC=example,DC=com
changetype: add
objectClass: top
objectClass: group
cn: Engineering
displayName: Engineering
sAMAccountName: engineering
groupType: -2147483646
member: CN=John Doe,OU=Users,DC=example,DC=com`,
  },
  {
    id: 'generic-service-account',
    name: 'Generic LDAP · Service account',
    description: 'Provision a bind-able account with simple attributes and optional expiry.',
    flavor: 'Generic LDAP',
    highlights: ['olcAccess', 'pwdPolicySubentry'],
    sample: `dn: uid=svc-app,ou=service-accounts,dc=example,dc=com
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
uid: svc-app
givenName: Service
sn: Account
cn: svc-app
mail: svc-app@example.com
userPassword: {SSHA}mUWCk0A4Gk0U2l2Vt03qf6C5k4eFpV3r
pwdPolicySubentry: cn=service-policy,ou=policies,dc=example,dc=com`,
  },
]
