(function () {
  var BASE = '/mono-repo/codex-arcanum';
  var CODEX_SUPABASE_URL = 'https://frpyfaxvquxutwmyqhxz.supabase.co';
  var CODEX_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycHlmYXh2cXV4dXR3bXlxaHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTQ0NDYsImV4cCI6MjA5MTE3MDQ0Nn0.f1feqhJuRJuhzhL-ebxaw7hhK8-gmlDKYCeI-ArUAqY';

  var OLIMPO_SUPABASE_URL = 'https://wmkswavqtqyfcjuiwtbw.supabase.co';
  var OLIMPO_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTAwOTEsImV4cCI6MjA5MjQ2NjA5MX0.y7jhy5yWI0w0ifX9dNqGzf7ja_H5xBBLVz5yReo76TA';

  localStorage.setItem('codex_storage_mode', 'supabase');

  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

    if (url === '/generate') {
      var body = init && init.body ? JSON.parse(init.body) : {};
      var messages = body.messages || [];
      return _fetch(OLIMPO_SUPABASE_URL + '/functions/v1/openrouter-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + OLIMPO_ANON_KEY,
          'apikey': OLIMPO_ANON_KEY,
        },
        body: JSON.stringify({ messages: messages, temperature: 0.35, max_tokens: 4096 }),
      }).then(function (resp) {
        if (!resp.ok) return resp;
        return resp.json().then(function (data) {
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      });
    }

    return _fetch.apply(window, arguments);
  };

  var _realLocationAssign = function (url) {
    if (typeof url === 'string' && url.charAt(0) === '/' && !url.startsWith(BASE)) {
      Object.getPrototypeOf(window.location).assign.call(window.location, BASE + url);
    } else {
      Object.getPrototypeOf(window.location).assign.call(window.location, url);
    }
  };

  var _hrefSet = function (url) {
    if (typeof url === 'string' && url.charAt(0) === '/' && !url.startsWith(BASE)) {
      return BASE + url;
    }
    return url;
  };

  var origDesc = Object.getOwnPropertyDescriptor(window, 'location');
  if (!origDesc || !origDesc.set) {
    try {
      var origHref = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
    } catch (e) {}
  }

  var _lastSet = null;
  var origLocation = window.location;
  var patchedLocation = new Proxy(origLocation, {
    get: function (target, prop) {
      if (prop === 'href') {
        return _lastSet || target.href;
      }
      var val = target[prop];
      if (typeof val === 'function') return val.bind(target);
      return val;
    },
    set: function (target, prop, value) {
      if (prop === 'href') {
        var patched = _hrefSet(value);
        _lastSet = patched;
        target.href = patched;
        return true;
      }
      target[prop] = value;
      return true;
    }
  });

  try {
    Object.defineProperty(window, 'location', {
      get: function () { return patchedLocation; },
      set: function (v) { origLocation.href = _hrefSet(v); },
      configurable: true,
    });
  } catch (e) {
    console.warn('[static-patch] Cannot proxy window.location, navigation may break on sub-paths');
  }

  window.__STATIC_PATCH_ACTIVE = true;
  console.log('[static-patch] Active. Mode: supabase. Base: ' + BASE);
})();
