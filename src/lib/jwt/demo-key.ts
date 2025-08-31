/**
 * This file contains the private key used for signing example JWT tokens.
 *
 * In a real application, this would be a secret stored securely,
 * but for this demo tool it's fine to include it in the client code
 * as we're only using it for educational purposes.
 *
 * The corresponding public key is served from the /api/jwks endpoint.
 */

/**
 * RSA private key in JWK format for the demo token generator
 */
export const DEMO_PRIVATE_KEY = {
  d: 'L-a46fD4iPdQb5vHTA7BrcDkQ__Wgt3FC3mlbsLzWrQObMMnqnFhVtyIz2LH3w5LwqVo7R8JYs5wlokAg2fMuVcXOni2N9TcCeBt6b95gmWkU_BOvlNM7ionJ7gfUZLL0Sm9SR44K_qyv2jRWvs_m-i3IOb8oC9vbFiHaGBCXUbEvZKET7uJtIO_6bIMfnjmU-8MVeD9rW6D6lOijiw4wsxk9Es6bEkG-TFHvF1H5PcV4ANMqFiQ85b7GEW_n6WY5uwXqbVzo9I_82gpSvLbLnbwugBvTJ3rVFB5MRQOOSP9QtawjiOg8IrkWGkp0w0BTgZ4J_gnZw4mF1j0_0pMwQ',
  dp: 'fcs9g7_jabymn2IC77ZdrZ3w4i3jtjc60FJ8YecjmOlJLPYVJx-mg6qlcfnYBJG7hj-NdZ02fsDmITZsRP7noJI9EMSzSm78yF9wEwozdxlHGoX31x7WEAvlCspDUxQW7FuEtroSpHmUjEBQaDzYIH6Ln_VZjFiZa2mDkNR0fZk',
  dq: 'CF54pgmpLK-Sw8EZJ0G1CtLu9RtZLyyaJmtKsGUl1H2NuDWMenHftP1hkv3UOPirzTa9wyUOp89PnhE147YWkPqBVakn1_pcb43RyWwxU4yqxcW6c2BZenYSp6ZEJHfW7Dz1DgZiC7LXF91UVzi3sinF1jYnBGPY6qqxPj9NCtk',
  e: 'AQAB',
  kty: 'RSA',
  n: 'wsUmq1_QIMejWqGLCTaBfDaKxFBX-HG4SvJChh75MlbdjBSHB5vOtBPxk7xkBxYfNXr1VcxzyJkJo_faVRLW0WWQZmlo3gcdC6pbM8S2nn9cPbL6nCEWi5BlbQpO_xzFIzB7S-Fl-JzGgXhfW4bSuG_dFVkwz47oZQOmLk8j407_-KWRP-cTAKSmLilQ0vPKB5_aWUsE1MhZvZYjnWrIENJ1IxbUYLKSl1ApMarLEZiAKBwzdscY3klXgfXbD4V9UKEgkKAxsyvy6SZNhxKLPWBwRVJ7YOcKNM_qh-NqdWax66qlYMC_w3u4gDYrF1W7G6htxXGSe0rmeUCnyvVLPQ',
  p: '5nN2_2UF3YIkaP91W2RSwJSbFiHKPp8-U2uIGKRXiHF7JI_hS4B9va-o9VxtY94qvFcZ5h1BMPUOvgLQ1mrjElGIhAb0wkJ8_z43v7n5gvmeRphEyqZB6dSObJ-m5xQYGs9Gasm5X7TXH58cq8hMzuLC5BzdKYjhA7L-ZkYyIrU',
  q: '2F0Ck3iZVQFB4EbIMMMisSCYsffzVBmVDsnh396ygc5WBCrjN-GEeui6qP2ZEy04CSTBrhT8JitdwN3C5TyEzbdSUgzgTcexBS0TAoXIBxGAzUEom2XHh5RCa76KOSgHrsuESkThNRtyfRBHjcpeNUReHhfBPco0kJKfc3tvM2k',
  qi: 'gxMQ5I4YXvBJCfArJXZ_E73pww_nxua-5vf-CvIn2y0eIyT7FkMtHX8OA83uislWlbaw-wEokIDvVZohA_dSckFmUVLreKrTHsH1dfBF3oTA4F4qpM2WNj3pZKx1TksrRZ069l8l3rjchk7-Q6MXmiRdB151KZFWYxFHHBORtRs',
  kid: 'iam-tools-demo-key-v1',
  use: 'sig',
  alg: 'RS256',
}

/**
 * JWKS format of the keys, for debugging and manual entry
 */
export const DEMO_JWKS = {
  keys: [
    {
      e: 'AQAB',
      kty: 'RSA',
      n: 'wsUmq1_QIMejWqGLCTaBfDaKxFBX-HG4SvJChh75MlbdjBSHB5vOtBPxk7xkBxYfNXr1VcxzyJkJo_faVRLW0WWQZmlo3gcdC6pbM8S2nn9cPbL6nCEWi5BlbQpO_xzFIzB7S-Fl-JzGgXhfW4bSuG_dFVkwz47oZQOmLk8j407_-KWRP-cTAKSmLilQ0vPKB5_aWUsE1MhZvZYjnWrIENJ1IxbUYLKSl1ApMarLEZiAKBwzdscY3klXgfXbD4V9UKEgkKAxsyvy6SZNhxKLPWBwRVJ7YOcKNM_qh-NqdWax66qlYMC_w3u4gDYrF1W7G6htxXGSe0rmeUCnyvVLPQ',
      kid: 'iam-tools-demo-key-v1',
      use: 'sig',
      alg: 'RS256',
    },
  ],
}
