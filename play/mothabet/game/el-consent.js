/* Elearnea consent shim for the Mothabet frame. It loads BEFORE hexan.js, and hexan.js stays byte-identical to the shared engine copy.
   The engine keeps its consent flags under Playtoom's platform key 'playtoom:consent' and migrates the legacy 'playversy:consent'.
   On Elearnea's origin those keys are not ours, so for THIS frame only (its own Storage.prototype) both keys are redirected
   to the Elearnea-owned key 'elearnea:mothabet:consent'. The engine therefore never reads, migrates or deletes a Playtoom key.
   Default, and always forced on read: child-directed, under-age, no analytics, no ads. Elearnea is a kids' product with no
   tracking or ads, so the stored value can't switch anything on. See docs/MOTHABET-INTEGRATION.md. */
(function (root) {
  'use strict';
  var OWN = 'elearnea:mothabet:consent', FOREIGN = { 'playtoom:consent': 1, 'playversy:consent': 1 };
  var FORCED = { analytics: false, ads: false, personalizedAds: false, childDirected: true, underAge: true };
  var S = root.Storage && root.Storage.prototype; if (!S) return;
  var get = S.getItem, set = S.setItem, del = S.removeItem;
  function forced(raw) { var o = {}; try { o = JSON.parse(raw) || {}; } catch (e) {} for (var k in FORCED) o[k] = FORCED[k]; return JSON.stringify(o); }
  S.getItem = function (k) {
    if (k === 'playversy:consent') return null; // no legacy migration
    if (k === 'playtoom:consent' || k === OWN) return forced(get.call(this, OWN));
    return get.call(this, k);
  };
  S.setItem = function (k, v) { return set.call(this, FOREIGN[k] ? OWN : k, FOREIGN[k] || k === OWN ? forced(v) : v); };
  S.removeItem = function (k) { return FOREIGN[k] ? undefined : del.call(this, k); };
  try { if (root.localStorage && get.call(root.localStorage, OWN) == null) set.call(root.localStorage, OWN, JSON.stringify(FORCED)); } catch (e) {} // the Elearnea-owned setting exists from the first visit
  root.ElearneaConsent = { key: OWN, forced: FORCED };
})(window);
