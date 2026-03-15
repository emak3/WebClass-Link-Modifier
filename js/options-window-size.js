/* ================================================================
   options-window-size.js — Window size settings UI
   ================================================================ */
/* depends on: options-constants.js */

var RATIO_FN = {
  '16:9': function (w) { return Math.round(w * 9 / 16); },
  '4:3':  function (w) { return Math.round(w * 3 / 4);  },
  '1:1':  function (w) { return w; },
};

/** Populate width/height inputs and active preset button. */
function loadWindowSize(prefix, data) {
  var w = document.getElementById(prefix + 'Width');
  var h = document.getElementById(prefix + 'Height');
  if (w && h) { w.value = data.width; h.value = data.height; }
  var cb = document.getElementById(prefix + 'MaintainRatio');
  if (cb) cb.checked = true;
  updatePresetButtons(prefix, data.ratio || 'custom');
}

/** Highlight the active preset pill. */
function updatePresetButtons(prefix, activeRatio) {
  var panel = document.getElementById(prefix + 'WindowSize');
  if (!panel) return;
  panel.querySelectorAll('.btn-pill[data-ratio]').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.ratio === activeRatio);
  });
}

/** Read current window size data for a prefix. */
function getWindowSizeData(prefix) {
  var w   = parseInt((document.getElementById(prefix + 'Width')  || {}).value);
  var h   = parseInt((document.getElementById(prefix + 'Height') || {}).value);
  var panel  = document.getElementById(prefix + 'WindowSize');
  var active = panel && panel.querySelector('.btn-pill.active[data-ratio]');
  var ratio  = active ? active.dataset.ratio : 'custom';
  var def    = DEFAULT_SETTINGS[WS_KEY_MAP[prefix]];
  return { width: w || def.width, height: h || def.height, ratio: ratio };
}

/** Keep aspect ratio when one dimension changes. Returns new opposite value or null. */
function maintainAspectRatio(changedField, prefix, prevW, prevH) {
  var wInput = document.getElementById(prefix + 'Width');
  var hInput = document.getElementById(prefix + 'Height');
  var cb     = document.getElementById(prefix + 'MaintainRatio');
  if (!cb || !cb.checked || prevW <= 0 || prevH <= 0) return null;

  if (changedField === 'width') {
    var newH = Math.round(parseInt(wInput.value) * (prevH / prevW));
    hInput.value = newH;
    return newH;
  } else {
    var newW = Math.round(parseInt(hInput.value) * (prevW / prevH));
    wInput.value = newW;
    return newW;
  }
}

/** Show/hide each window-size panel based on the selected radio. */
function updateWindowSizeVisibility() {
  WS_PREFIXES.forEach(function (prefix) {
    var panel  = document.getElementById(prefix + 'WindowSize');
    if (!panel) return;
    var radios = document.getElementsByName(prefix + 'Behavior');
    var show   = false;
    Array.prototype.forEach.call(radios, function (r) {
      if (r.checked && r.value === 'newWindow') show = true;
    });
    panel.classList.toggle('show', show);
  });
}

/** Attach all window-size related events. */
function setupWindowSizeListeners() {
  WS_PREFIXES.forEach(function (prefix) {
    var panel  = document.getElementById(prefix + 'WindowSize');
    var wInput = document.getElementById(prefix + 'Width');
    var hInput = document.getElementById(prefix + 'Height');
    if (!panel || !wInput || !hInput) return;

    var prevW = parseInt(wInput.value);
    var prevH = parseInt(hInput.value);

    /* Preset pills */
    panel.querySelectorAll('.btn-pill[data-ratio]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var ratio = btn.dataset.ratio;
        if (ratio === 'custom') { updatePresetButtons(prefix, 'custom'); return; }
        var baseW = parseInt(wInput.value) || 1000;
        var newH  = RATIO_FN[ratio](baseW);
        wInput.value = baseW; hInput.value = newH;
        prevW = baseW; prevH = newH;
        updatePresetButtons(prefix, ratio);
      });
    });

    /* Reset button */
    var resetBtn = panel.querySelector('.btn-pill-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var def = DEFAULT_SETTINGS[WS_KEY_MAP[prefix]];
        wInput.value = def.width; hInput.value = def.height;
        prevW = def.width; prevH = def.height;
        updatePresetButtons(prefix, def.ratio);
      });
    }

    /* Width input */
    wInput.addEventListener('input', function () {
      var newH = maintainAspectRatio('width', prefix, prevW, prevH);
      prevW = parseInt(wInput.value) || prevW;
      if (newH !== null) { prevH = newH; } else { updatePresetButtons(prefix, 'custom'); }
    });

    /* Height input */
    hInput.addEventListener('input', function () {
      var newW = maintainAspectRatio('height', prefix, prevW, prevH);
      prevH = parseInt(hInput.value) || prevH;
      if (newW !== null) { prevW = newW; } else { updatePresetButtons(prefix, 'custom'); }
    });

    /* Behavior radio — toggle panel visibility */
    Array.prototype.forEach.call(
      document.getElementsByName(prefix + 'Behavior'),
      function (r) { r.addEventListener('change', updateWindowSizeVisibility); }
    );
  });
}
