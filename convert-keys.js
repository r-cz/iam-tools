// convert-keys.js
import crypto from 'node:crypto'; // Use Node's built-in crypto module
import fs from 'fs/promises';
import path from 'path';

const keyId = 'iam-tools-demo-key-v1'; // Your chosen Key ID
const keyAlg = 'RS256'; // Algorithm you intend to use

async function convert() {
  try {
    console.log('Reading PEM files...');
    // Adjust paths if your PEM files are elsewhere relative to project root
    const privatePem = await fs.readFile(path.resolve('./private_key.pem'), 'utf8');
    const publicPem = await fs.readFile(path.resolve('./public_key.pem'), 'utf8');

    console.log('Creating private KeyObject from PEM...');
    // Use createPrivateKey to load the private PEM into a KeyObject
    const privateKeyObject = crypto.createPrivateKey(privatePem);

    console.log('Creating public KeyObject from PEM...');
     // Use createPublicKey to load the public PEM into a KeyObject
    const publicKeyObject = crypto.createPublicKey(publicPem);

    console.log('Exporting private key to JWK...');
    // Use the KeyObject's export method with 'jwk' format
    const privateJwk = privateKeyObject.export({ format: 'jwk' });
    // Add the metadata required by JOSE/JWT standards
    privateJwk.kid = keyId;
    privateJwk.use = 'sig'; // For signing
    privateJwk.alg = keyAlg; // Specify the algorithm

    console.log('Exporting public key to JWK...');
    // Use the KeyObject's export method with 'jwk' format
    const publicJwk = publicKeyObject.export({ format: 'jwk' });
    // Add the metadata required by JOSE/JWT standards
    publicJwk.kid = keyId;
    publicJwk.use = 'sig'; // For signing
    publicJwk.alg = keyAlg; // Specify the algorithm


    // --- Structure Private JWK for demo-key.ts ---
    // Node's export usually includes all necessary components for RSA private keys
    const fullPrivateJwk = { ...privateJwk };

    // --- Prepare Public JWKS Structure for demo-key.ts ---
    const publicJwks = {
        keys: [
            { ...publicJwk } // Just use the exported public JWK
        ]
    };


    console.log('\n--- DEMO_PRIVATE_KEY (copy this object) ---');
    console.log(JSON.stringify(fullPrivateJwk, null, 2));

    console.log('\n--- DEMO_JWKS (copy this object) ---');
    console.log(JSON.stringify(publicJwks, null, 2));

    console.log('\nConversion complete. Update src/lib/jwt/demo-key.ts with the objects above.');

  } catch (err) {
    console.error('Error during key conversion:', err);
    // Log specific details if available
     if (err instanceof Error && err.message) {
        console.error("Error Message:", err.message);
     }
     if (err instanceof Error && err.stack) {
        console.error("Error Stack:", err.stack);
     }
  }
}

convert();