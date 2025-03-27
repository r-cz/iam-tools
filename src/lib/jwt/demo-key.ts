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
  kty: "RSA",
  kid: "demo-key-2025",
  use: "sig",
  alg: "RS256",
  // These are the JWK parameters for the private key
  // The public parts (n, e) match the ones in the JWKS endpoint
  n: "tqWVYpI3HVNmJ1quaLmOVADZG9F9aP3Kgp6Tm9RCLCQsNLLa3B1mTM8jgBwWSyGOcGkNYBHGMSo0iy_FYD8H7Jl9HQEQ5oGHd5T6jUUUfvQcHkGb5aWKVkrP7Wur8NZ0w_4WR_yjZ97QklFZ9iXOV1UEwjbYPsoxo5OhJUvW3J5J_ND2sB0nhvyYfX9Vjaz9M0BbBABeqVV1h49OQWVETDnC9A7MM7rlQ14wFWpdXnbDgIgV2CA98L6z7sjm9dKF38qVlwImJWI2JFl_rELsqFVMDutj0_AO6nZ_S-wGFD-FcB0Nkd6gKVskMkO1mLnJRuW_afBWgCLbbgb2nQsYoQ",
  e: "AQAB",
  d: "PczcIsuUK8vUTeMiY700BuZsJVuT6dZkQQlkzNGRfaVBf0jgEDLcFGHfJQgvWQT4f9Yn85n0LBr0Uc69f2_ak1XkbxMDZU0TQluVe0A2xn11TZt8dMEXRFcFiYDj4aXBd0tVT3gb5bYR4mCFgIVR4q3i3OfAmPXgNLvn7HREgXcmVzT3llGMSZhjOpJzq6UbEWZgkiLvwwZQKHsLloZM54xjsxBJEwg_iQMsjtxRPXP_aqTrZNYJKIhmJxFMJfMzGBh9KFJkgXtWK9tEKjjHMZKR81y8JPgSgCzWMf4xGODxOVvbxEAOdOAcVcwIOTNDjJ6g3TBYUYDCPXHYiU2jAQ",
  p: "7pBwzR03Z8-NxVnrrrALfA8-MBG6nzKbMEDRDSNkLvimFjBEQPZXvM4WZI2f9Dj3WsYU8VT48hZkJrwZzGBrQ6lPrJBT8iXgA1OXuMNEDxUQlh9FHr8x0sJ0Pzdt-nL0ysyLEetaXJkT5GKfZYdx01BAmGn4gX3rIpYP_N7wb9M",
  q: "xHQhVzC0A02XFzBGQ-5H3cYETndcwKkRDrhsS_YaSoYdnZ1ZMT5WRx-OaRPnWMcXIL5MxsX98_wTgkVwBQ_BOeqG98c2mTv0iA23wJk_oPIHvcgE3XEA6JcuGPzwLfO5YbGKIfAYcGRfTSCbxiJRpHmFJdjIMbBQSbQXLJMuT1s",
  dp: "jBYnV7v6emluMxYuACDEJcgUJ4mGSr9lHDvdNA0GlA9rcjI6DpKQE9Ipbb79GPxhuK8Zj3zWAhUQXCw4n5dkOVzrLz6v7WcXEN6ZZcGAPqMQKK4KDMjB7L-1-yJQY9VmONLKCn0rNLRNAbKpRPYebHKzO75Tw1OWFRbXABg8exE",
  dq: "Nj2MjLUl-NJc5c71dsVS_-GQN1I-jVSFnIPKFsNu5sYfvFcMTjiXh6GWP9PTc8R0FZMQty53eCPYDQHWK2B7JwiLYjnoGXkt4oABWLxLDKEj-lQAPJyxEMXejKIyga31B48WBXmvbzSdIJ5yl5xJQkNWBfQ_XGiYSj8KdyIZbPE",
  qi: "kA1V4HXXr8Qtv0b_QVJPIVx0xKTZiuvaDOzkrdvLCYC9SyQ5U2ZtbhtrPS4Aq8dXQVu1_ZCuVqBU71FZpXhKGJKfLRkc9LDeBo31L9jqzwjK-rmwpU71oOyFAzrPqv3TPCbYVuUl8CWgAJYw-wPkYJrZOSiJyMvqzKG5vUQKBtQ"
};

/**
 * JWKS format of the keys, for debugging and manual entry
 */
export const DEMO_JWKS = {
  keys: [
    {
      kty: "RSA",
      kid: "demo-key-2025",
      use: "sig",
      alg: "RS256",
      n: "tqWVYpI3HVNmJ1quaLmOVADZG9F9aP3Kgp6Tm9RCLCQsNLLa3B1mTM8jgBwWSyGOcGkNYBHGMSo0iy_FYD8H7Jl9HQEQ5oGHd5T6jUUUfvQcHkGb5aWKVkrP7Wur8NZ0w_4WR_yjZ97QklFZ9iXOV1UEwjbYPsoxo5OhJUvW3J5J_ND2sB0nhvyYfX9Vjaz9M0BbBABeqVV1h49OQWVETDnC9A7MM7rlQ14wFWpdXnbDgIgV2CA98L6z7sjm9dKF38qVlwImJWI2JFl_rELsqFVMDutj0_AO6nZ_S-wGFD-FcB0Nkd6gKVskMkO1mLnJRuW_afBWgCLbbgb2nQsYoQ",
      e: "AQAB"
    }
  ]
};
