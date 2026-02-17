// Intentional no-op migration file.
// LegacyX uses Anchor's auto-deploy.

const anchor = require('@coral-xyz/anchor');

module.exports = async function (provider) {
  anchor.setProvider(provider);
};
