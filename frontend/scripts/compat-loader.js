(function () {
  var config = JSON.parse(
    document.getElementById("vocabflow-builds").textContent,
  );
  function supports(property, value) {
    return !!(window.CSS && CSS.supports && CSS.supports(property, value));
  }
  function flexGap() {
    var box = document.createElement("div");
    box.style.cssText =
      "position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px;padding:0;border:0";
    for (var i = 0; i < 2; i++) {
      var child = document.createElement("div");
      child.style.height = "1px";
      box.appendChild(child);
    }
    document.body.appendChild(box);
    var result = box.scrollHeight === 3;
    box.parentNode.removeChild(box);
    return result;
  }
  var features = {
    flexGap: flexGap(),
    viewport: supports("height", "1dvh"),
    math: supports("height", "clamp(0px, 1px, 2px)"),
    logical: supports("inset-inline-start", "0px"),
    aspect: supports("aspect-ratio", "1"),
  };
  var modern =
    features.flexGap &&
    features.viewport &&
    features.math &&
    features.logical &&
    features.aspect;
  document.documentElement.setAttribute(
    "data-vocabflow-renderer",
    modern ? "modern" : "compat",
  );
  if (!modern) {
    window.__VOCABFLOW_FEATURES__ = features;
    window.__VOCABFLOW_LAYOUT__ = config.bindings;
  }
  var selected = modern ? config.modern : config.compat;
  var remaining = selected.styles.length;
  function fail() {
    document.getElementById("root").textContent =
      "بارگذاری برنامه کامل نشد. برنامه را دوباره باز کنید.";
  }
  function script(src, module, done) {
    var element = document.createElement("script");
    if (module) element.type = "module";
    element.src = src;
    element.crossOrigin = "anonymous";
    element.onload = done || null;
    element.onerror = fail;
    document.body.appendChild(element);
  }
  function start() {
    if (modern) script(selected.entry, true);
    else
      script(selected.polyfills, false, function () {
        window.System.import(selected.entry).catch(fail);
      });
  }
  selected.styles.forEach(function (src) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = src;
    link.onload = function () {
      if (--remaining === 0) start();
    };
    link.onerror = fail;
    document.head.appendChild(link);
  });
  if (!remaining) start();
})();
