/* Elearnea kid-safe replacement for Mothabet's social.js: no leaderboard, no ranks, no challenge links, no sharing.
   Keeps the same API surface so game.js runs unchanged where these are referenced. */
(function (root) {
  'use strict';
  const MB = root.MB;
  MB.LB = { provider: null, setProvider() {}, async standing() { return null; }, async submit() { return { ok: false, disabled: true }; } };
  MB.anonName = function () { return ''; };
  MB.Challenge = { encode() { return ''; }, decode() { return { ok: false, why: 'disabled' }; }, link() { return ''; }, fromHash() { return null; } };
  MB.jarText = function () { return ''; };
  MB.shareCard = function () { return MB.canvas ? MB.canvas(8, 8) : document.createElement('canvas'); };
})(window);
