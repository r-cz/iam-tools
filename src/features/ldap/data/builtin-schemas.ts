/**
 * Built-in LDAP schema definitions based on RFC standards.
 * These provide core object classes and attribute types that most directories use.
 */

export interface BuiltinSchema {
  id: string
  name: string
  description: string
  source: string
  schemaText: string
}

/**
 * RFC 4519 - Core LDAP schema (subset of commonly used types)
 * Combined with inetOrgPerson (RFC 2798) for comprehensive coverage
 */
const CORE_LDAP_SCHEMA = `# Core LDAP Object Classes (RFC 4519 + RFC 2798)
objectClasses: ( 2.5.6.0 NAME 'top' DESC 'Top of the superclass chain' ABSTRACT MUST objectClass )
objectClasses: ( 2.5.6.6 NAME 'person' DESC 'RFC 4519: a human being' SUP top STRUCTURAL MUST ( sn $ cn ) MAY ( userPassword $ telephoneNumber $ seeAlso $ description ) )
objectClasses: ( 2.5.6.7 NAME 'organizationalPerson' DESC 'RFC 4519: an organizational person' SUP person STRUCTURAL MAY ( title $ x121Address $ registeredAddress $ destinationIndicator $ preferredDeliveryMethod $ telexNumber $ teletexTerminalIdentifier $ internationalISDNNumber $ facsimileTelephoneNumber $ street $ postOfficeBox $ postalCode $ postalAddress $ physicalDeliveryOfficeName $ ou $ st $ l ) )
objectClasses: ( 2.16.840.1.113730.3.2.2 NAME 'inetOrgPerson' DESC 'RFC 2798: Internet Organizational Person' SUP organizationalPerson STRUCTURAL MAY ( audio $ businessCategory $ carLicense $ departmentNumber $ displayName $ employeeNumber $ employeeType $ givenName $ homePhone $ homePostalAddress $ initials $ jpegPhoto $ labeledURI $ mail $ manager $ mobile $ o $ pager $ photo $ roomNumber $ secretary $ uid $ userCertificate $ x500uniqueIdentifier $ preferredLanguage $ userSMIMECertificate $ userPKCS12 ) )
objectClasses: ( 2.5.6.4 NAME 'organization' DESC 'RFC 4519: an organization' SUP top STRUCTURAL MUST o MAY ( userPassword $ searchGuide $ seeAlso $ businessCategory $ x121Address $ registeredAddress $ destinationIndicator $ preferredDeliveryMethod $ telexNumber $ teletexTerminalIdentifier $ telephoneNumber $ internationalISDNNumber $ facsimileTelephoneNumber $ street $ postOfficeBox $ postalCode $ postalAddress $ physicalDeliveryOfficeName $ st $ l $ description ) )
objectClasses: ( 2.5.6.5 NAME 'organizationalUnit' DESC 'RFC 4519: an organizational unit' SUP top STRUCTURAL MUST ou MAY ( userPassword $ searchGuide $ seeAlso $ businessCategory $ x121Address $ registeredAddress $ destinationIndicator $ preferredDeliveryMethod $ telexNumber $ teletexTerminalIdentifier $ telephoneNumber $ internationalISDNNumber $ facsimileTelephoneNumber $ street $ postOfficeBox $ postalCode $ postalAddress $ physicalDeliveryOfficeName $ st $ l $ description ) )
objectClasses: ( 2.5.6.9 NAME 'groupOfNames' DESC 'RFC 4519: a group of names (DNs)' SUP top STRUCTURAL MUST ( member $ cn ) MAY ( businessCategory $ seeAlso $ owner $ ou $ o $ description ) )
objectClasses: ( 2.16.840.1.113730.3.2.33 NAME 'groupOfUniqueNames' DESC 'RFC 4519: a group of unique names (DNs)' SUP top STRUCTURAL MUST ( uniqueMember $ cn ) MAY ( businessCategory $ seeAlso $ owner $ ou $ o $ description ) )
objectClasses: ( 0.9.2342.19200300.100.4.19 NAME 'simpleSecurityObject' DESC 'RFC 4519: a simple security object' SUP top AUXILIARY MUST userPassword )
objectClasses: ( 2.5.6.14 NAME 'device' DESC 'RFC 4519: a device' SUP top STRUCTURAL MUST cn MAY ( serialNumber $ seeAlso $ owner $ ou $ o $ l $ description ) )
objectClasses: ( 1.3.6.1.1.3.1 NAME 'uidObject' DESC 'RFC 4519: uid object' SUP top AUXILIARY MUST uid )
objectClasses: ( 2.5.6.8 NAME 'organizationalRole' DESC 'RFC 4519: an organizational role' SUP top STRUCTURAL MUST cn MAY ( x121Address $ registeredAddress $ destinationIndicator $ preferredDeliveryMethod $ telexNumber $ teletexTerminalIdentifier $ telephoneNumber $ internationalISDNNumber $ facsimileTelephoneNumber $ seeAlso $ roleOccupant $ preferredDeliveryMethod $ street $ postOfficeBox $ postalCode $ postalAddress $ physicalDeliveryOfficeName $ ou $ st $ l $ description ) )
objectClasses: ( 2.5.6.11 NAME 'applicationProcess' DESC 'RFC 4519: an application process' SUP top STRUCTURAL MUST cn MAY ( seeAlso $ ou $ l $ description ) )
objectClasses: ( 2.5.6.10 NAME 'residentialPerson' DESC 'RFC 4519: a residential person' SUP person STRUCTURAL MUST l MAY ( businessCategory $ x121Address $ registeredAddress $ destinationIndicator $ preferredDeliveryMethod $ telexNumber $ teletexTerminalIdentifier $ telephoneNumber $ internationalISDNNumber $ facsimileTelephoneNumber $ preferredDeliveryMethod $ street $ postOfficeBox $ postalCode $ postalAddress $ physicalDeliveryOfficeName $ st $ l ) )
objectClasses: ( 1.3.6.1.4.1.1466.344 NAME 'dcObject' DESC 'RFC 4519: domain component object' SUP top AUXILIARY MUST dc )
objectClasses: ( 0.9.2342.19200300.100.4.13 NAME 'domain' DESC 'RFC 4524: a domain' SUP top STRUCTURAL MUST dc MAY ( userPassword $ searchGuide $ seeAlso $ businessCategory $ x121Address $ registeredAddress $ destinationIndicator $ preferredDeliveryMethod $ telexNumber $ teletexTerminalIdentifier $ telephoneNumber $ internationalISDNNumber $ facsimileTelephoneNumber $ street $ postOfficeBox $ postalCode $ postalAddress $ physicalDeliveryOfficeName $ st $ l $ description $ o $ associatedName ) )

# Core LDAP Attribute Types (RFC 4519 + RFC 2798)
attributeTypes: ( 2.5.4.0 NAME 'objectClass' DESC 'RFC 4512: object class' EQUALITY objectIdentifierMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.38 )
attributeTypes: ( 2.5.4.41 NAME 'name' DESC 'RFC 4519: name' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.5.4.3 NAME ( 'cn' 'commonName' ) DESC 'RFC 4519: common name' SUP name )
attributeTypes: ( 2.5.4.4 NAME ( 'sn' 'surname' ) DESC 'RFC 4519: surname' SUP name )
attributeTypes: ( 2.5.4.42 NAME ( 'givenName' 'gn' ) DESC 'RFC 4519: given name' SUP name )
attributeTypes: ( 2.5.4.12 NAME 'title' DESC 'RFC 4519: title' SUP name )
attributeTypes: ( 2.5.4.13 NAME 'description' DESC 'RFC 4519: description' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.5.4.34 NAME 'seeAlso' DESC 'RFC 4519: DN of related object' SUP distinguishedName )
attributeTypes: ( 2.5.4.35 NAME 'userPassword' DESC 'RFC 4519: user password' EQUALITY octetStringMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.40 )
attributeTypes: ( 2.5.4.20 NAME 'telephoneNumber' DESC 'RFC 4519: telephone number' EQUALITY telephoneNumberMatch SUBSTR telephoneNumberSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.50 )
attributeTypes: ( 2.5.4.49 NAME ( 'distinguishedName' 'dn' ) DESC 'RFC 4519: distinguished name' EQUALITY distinguishedNameMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.12 )
attributeTypes: ( 2.5.4.31 NAME 'member' DESC 'RFC 4519: member DN' SUP distinguishedName )
attributeTypes: ( 2.5.4.50 NAME 'uniqueMember' DESC 'RFC 4519: unique member DN with optional UID' EQUALITY uniqueMemberMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.34 )
attributeTypes: ( 2.5.4.32 NAME 'owner' DESC 'RFC 4519: owner DN' SUP distinguishedName )
attributeTypes: ( 2.5.4.33 NAME 'roleOccupant' DESC 'RFC 4519: role occupant DN' SUP distinguishedName )
attributeTypes: ( 2.5.4.10 NAME ( 'o' 'organizationName' ) DESC 'RFC 4519: organization name' SUP name )
attributeTypes: ( 2.5.4.11 NAME ( 'ou' 'organizationalUnitName' ) DESC 'RFC 4519: organizational unit name' SUP name )
attributeTypes: ( 2.5.4.7 NAME ( 'l' 'localityName' ) DESC 'RFC 4519: locality name' SUP name )
attributeTypes: ( 2.5.4.8 NAME ( 'st' 'stateOrProvinceName' ) DESC 'RFC 4519: state or province name' SUP name )
attributeTypes: ( 2.5.4.9 NAME ( 'street' 'streetAddress' ) DESC 'RFC 4519: street address' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.5.4.16 NAME 'postalAddress' DESC 'RFC 4519: postal address' EQUALITY caseIgnoreListMatch SUBSTR caseIgnoreListSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.41 )
attributeTypes: ( 2.5.4.17 NAME 'postalCode' DESC 'RFC 4519: postal code' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.5.4.18 NAME 'postOfficeBox' DESC 'RFC 4519: post office box' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 0.9.2342.19200300.100.1.25 NAME ( 'dc' 'domainComponent' ) DESC 'RFC 4519: domain component' EQUALITY caseIgnoreIA5Match SUBSTR caseIgnoreIA5SubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.26 SINGLE-VALUE )
attributeTypes: ( 0.9.2342.19200300.100.1.1 NAME ( 'uid' 'userid' ) DESC 'RFC 4519: user identifier' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )

# inetOrgPerson Attributes (RFC 2798)
attributeTypes: ( 2.16.840.1.113730.3.1.1 NAME 'carLicense' DESC 'RFC 2798: vehicle license plate' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.16.840.1.113730.3.1.2 NAME 'departmentNumber' DESC 'RFC 2798: department number' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 2.16.840.1.113730.3.1.241 NAME 'displayName' DESC 'RFC 2798: display name' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 2.16.840.1.113730.3.1.3 NAME 'employeeNumber' DESC 'RFC 2798: employee number' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 2.16.840.1.113730.3.1.4 NAME 'employeeType' DESC 'RFC 2798: employee type' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 0.9.2342.19200300.100.1.20 NAME 'homePhone' DESC 'RFC 1274: home phone number' EQUALITY telephoneNumberMatch SUBSTR telephoneNumberSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.50 )
attributeTypes: ( 0.9.2342.19200300.100.1.39 NAME 'homePostalAddress' DESC 'RFC 1274: home postal address' EQUALITY caseIgnoreListMatch SUBSTR caseIgnoreListSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.41 )
attributeTypes: ( 2.5.4.43 NAME 'initials' DESC 'RFC 4519: initials' SUP name )
attributeTypes: ( 0.9.2342.19200300.100.1.60 NAME 'jpegPhoto' DESC 'RFC 2798: JPEG photo' SYNTAX 1.3.6.1.4.1.1466.115.121.1.28 )
attributeTypes: ( 1.3.6.1.4.1.250.1.57 NAME 'labeledURI' DESC 'RFC 2079: labeled URI' EQUALITY caseExactMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 0.9.2342.19200300.100.1.3 NAME ( 'mail' 'rfc822Mailbox' ) DESC 'RFC 1274: email address' EQUALITY caseIgnoreIA5Match SUBSTR caseIgnoreIA5SubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.26 )
attributeTypes: ( 0.9.2342.19200300.100.1.10 NAME 'manager' DESC 'RFC 4524: DN of manager' SUP distinguishedName )
attributeTypes: ( 0.9.2342.19200300.100.1.41 NAME 'mobile' DESC 'RFC 1274: mobile phone number' EQUALITY telephoneNumberMatch SUBSTR telephoneNumberSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.50 )
attributeTypes: ( 0.9.2342.19200300.100.1.42 NAME 'pager' DESC 'RFC 1274: pager number' EQUALITY telephoneNumberMatch SUBSTR telephoneNumberSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.50 )
attributeTypes: ( 0.9.2342.19200300.100.1.6 NAME 'roomNumber' DESC 'RFC 1274: room number' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 0.9.2342.19200300.100.1.21 NAME 'secretary' DESC 'RFC 1274: DN of secretary' SUP distinguishedName )
attributeTypes: ( 2.16.840.1.113730.3.1.39 NAME 'preferredLanguage' DESC 'RFC 2798: preferred language' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 2.5.4.36 NAME 'userCertificate' DESC 'RFC 4523: X.509 user certificate' SYNTAX 1.3.6.1.4.1.1466.115.121.1.8 )
attributeTypes: ( 2.5.4.5 NAME 'serialNumber' DESC 'RFC 4519: serial number' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.44 )
attributeTypes: ( 2.5.4.15 NAME 'businessCategory' DESC 'RFC 4519: business category' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )`

/**
 * Active Directory specific schema extensions
 */
const ACTIVE_DIRECTORY_SCHEMA = `# Active Directory Object Classes
objectClasses: ( 1.2.840.113556.1.5.9 NAME 'user' DESC 'Active Directory user' SUP organizationalPerson STRUCTURAL MAY ( sAMAccountName $ userPrincipalName $ userAccountControl $ pwdLastSet $ accountExpires $ lastLogon $ logonCount $ badPwdCount $ badPasswordTime $ lockoutTime $ unicodePwd $ memberOf $ primaryGroupID $ objectSid $ objectGUID ) )
objectClasses: ( 1.2.840.113556.1.5.8 NAME 'group' DESC 'Active Directory group' SUP top STRUCTURAL MUST cn MAY ( sAMAccountName $ groupType $ member $ memberOf $ managedBy $ description $ displayName $ mail $ info ) )
objectClasses: ( 1.2.840.113556.1.5.67 NAME 'computer' DESC 'Active Directory computer' SUP user STRUCTURAL MAY ( dNSHostName $ servicePrincipalName $ operatingSystem $ operatingSystemVersion $ operatingSystemServicePack ) )
objectClasses: ( 1.2.840.113556.1.3.23 NAME 'container' DESC 'Active Directory container' SUP top STRUCTURAL MUST cn MAY description )

# Active Directory Attribute Types
attributeTypes: ( 1.2.840.113556.1.4.221 NAME 'sAMAccountName' DESC 'AD: Security Account Manager name' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.656 NAME 'userPrincipalName' DESC 'AD: User principal name (UPN)' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.8 NAME 'userAccountControl' DESC 'AD: User account control flags' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.96 NAME 'pwdLastSet' DESC 'AD: Password last set time' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.159 NAME 'accountExpires' DESC 'AD: Account expiration time' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.52 NAME 'lastLogon' DESC 'AD: Last logon time' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.169 NAME 'logonCount' DESC 'AD: Logon count' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.12 NAME 'badPwdCount' DESC 'AD: Bad password count' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.90 NAME 'unicodePwd' DESC 'AD: Unicode password' SYNTAX 1.3.6.1.4.1.1466.115.121.1.40 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.222 NAME 'memberOf' DESC 'AD: Group membership' SUP distinguishedName )
attributeTypes: ( 1.2.840.113556.1.4.750 NAME 'groupType' DESC 'AD: Group type flags' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.146 NAME 'objectSid' DESC 'AD: Security identifier (SID)' SYNTAX 1.3.6.1.4.1.1466.115.121.1.40 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.2 NAME 'objectGUID' DESC 'AD: Globally unique identifier' SYNTAX 1.3.6.1.4.1.1466.115.121.1.40 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.98 NAME 'primaryGroupID' DESC 'AD: Primary group identifier' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.184 NAME 'dNSHostName' DESC 'AD: DNS host name' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.771 NAME 'servicePrincipalName' DESC 'AD: Service principal names' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 1.2.840.113556.1.4.254 NAME 'operatingSystem' DESC 'AD: Operating system name' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.255 NAME 'operatingSystemVersion' DESC 'AD: Operating system version' EQUALITY caseIgnoreMatch SUBSTR caseIgnoreSubstringsMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.2.13 NAME 'info' DESC 'AD: Comment/info field' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 SINGLE-VALUE )
attributeTypes: ( 1.2.840.113556.1.4.273 NAME 'managedBy' DESC 'AD: Manager DN' SUP distinguishedName SINGLE-VALUE )`

/**
 * PingDirectory/PingIdentity specific schema extensions
 */
const PING_DIRECTORY_SCHEMA = `# PingDirectory Object Classes
objectClasses: ( 2.16.840.1.113730.3.2.327 NAME 'pingDirectoryPerson' DESC 'PingDirectory person extension' SUP inetOrgPerson STRUCTURAL MAY ( ds-pwp-password-policy-dn $ ds-privilege-name $ ds-rlim-lookthrough-limit $ ds-rlim-size-limit $ ds-rlim-time-limit-seconds ) )

# PingDirectory Attribute Types
attributeTypes: ( 1.3.6.1.4.1.30221.2.1.73 NAME 'ds-pwp-password-policy-dn' DESC 'DN of password policy' SUP distinguishedName SINGLE-VALUE )
attributeTypes: ( 1.3.6.1.4.1.30221.2.1.58 NAME 'ds-privilege-name' DESC 'Privilege names assigned to user' EQUALITY caseIgnoreMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )
attributeTypes: ( 1.3.6.1.4.1.30221.2.1.159 NAME 'ds-rlim-lookthrough-limit' DESC 'Lookthrough limit' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.3.6.1.4.1.30221.2.1.160 NAME 'ds-rlim-size-limit' DESC 'Size limit' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.3.6.1.4.1.30221.2.1.161 NAME 'ds-rlim-time-limit-seconds' DESC 'Time limit in seconds' EQUALITY integerMatch SYNTAX 1.3.6.1.4.1.1466.115.121.1.27 SINGLE-VALUE )
attributeTypes: ( 1.3.6.1.4.1.30221.2.1.420 NAME 'pwdPolicySubentry' DESC 'Password policy subentry DN' SUP distinguishedName SINGLE-VALUE )`

export const BUILTIN_SCHEMAS: BuiltinSchema[] = [
  {
    id: 'rfc-core-ldap',
    name: 'Core LDAP + inetOrgPerson (RFC 4519/2798)',
    description:
      'Standard LDAP object classes and attributes including person, organizationalPerson, inetOrgPerson, groups, and common attributes like cn, sn, mail, uid.',
    source: 'RFC 4519, RFC 2798, RFC 4524',
    schemaText: CORE_LDAP_SCHEMA,
  },
  {
    id: 'active-directory',
    name: 'Active Directory Extensions',
    description:
      'Microsoft Active Directory specific object classes (user, group, computer) and attributes (sAMAccountName, userPrincipalName, userAccountControl).',
    source: 'Microsoft AD Schema',
    schemaText: ACTIVE_DIRECTORY_SCHEMA,
  },
  {
    id: 'ping-directory',
    name: 'PingDirectory Extensions',
    description:
      'Ping Identity PingDirectory specific object classes and attributes for identity management.',
    source: 'PingDirectory Schema',
    schemaText: PING_DIRECTORY_SCHEMA,
  },
]

/**
 * Get a combined schema with core + vendor extensions
 */
export function getCombinedSchema(includeAD: boolean, includePing: boolean): string {
  let combined = CORE_LDAP_SCHEMA
  if (includeAD) {
    combined += '\n\n' + ACTIVE_DIRECTORY_SCHEMA
  }
  if (includePing) {
    combined += '\n\n' + PING_DIRECTORY_SCHEMA
  }
  return combined
}
