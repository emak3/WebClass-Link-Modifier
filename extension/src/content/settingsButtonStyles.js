/* ================================================================
   settingsButtonStyles.js — CSS for settings button injection
   ================================================================ */
'use strict';

// Keep as a plain string so the content script can inject it directly.
// Loaded as a separate JS module to simplify debugging/maintenance.
var WC_SETTINGS_BUTTON_CSS = `
  #wclm-settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 55px;
    height: 48px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.82;
    transition: opacity 0.15s, background 0.15s;
  }
  #wclm-settings-btn:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.15);
  }
  #wclm-settings-btn:active { transform: scale(0.93); }
  #wclm-settings-btn img {
    width: 28px;
    height: 28px;
    display: block;
  }
  #wclm-settings-li {
    display: flex;
    align-items: center;
    padding: 0 4px;
  }
`;

