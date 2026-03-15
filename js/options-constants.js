/* ================================================================
   options-constants.js — Shared defaults
   ================================================================ */
/* global scope — loaded first */

var DEFAULT_DOMAINS = ['lms.salesio-sp.ac.jp'];

var DEFAULT_SETTINGS = {
  linkBehavior:            'sameTab',
  mailBehavior:            'newWindow',
  fileBehavior:            'newTab',
  webclassBehavior:        'sameTab',
  attachmentBehavior:      'newWindow',
  externalLinkBehavior:    'newTab',
  informationsBehavior:    'newTab',

  mailWindowSize:            { width: 800,  height: 600, ratio: '4:3'  },
  fileWindowSize:            { width: 1200, height: 900, ratio: '4:3'  },
  attachmentWindowSize:      { width: 500,  height: 500, ratio: '1:1'  },
  linkWindowSize:            { width: 800,  height: 600, ratio: '4:3'  },
  webclassWindowSize:        { width: 1600, height: 898, ratio: '16:9' },
  externalLinkWindowSize:    { width: 1200, height: 900, ratio: '4:3'  },
  informationsWindowSize:    { width: 1200, height: 900, ratio: '4:3'  },
};

/* Behavior keys for iteration */
var BEHAVIOR_KEYS = [
  'linkBehavior', 'mailBehavior', 'fileBehavior',
  'webclassBehavior', 'attachmentBehavior', 'externalLinkBehavior',
  'informationsBehavior',
];

/* Window-size prefixes (matches HTML element id prefix) */
var WS_PREFIXES = [
  'mail', 'file', 'attachment', 'link', 'webclass', 'externalLink', 'informations',
];

/* Prefix → storage key */
var WS_KEY_MAP = {
  mail:         'mailWindowSize',
  file:         'fileWindowSize',
  attachment:   'attachmentWindowSize',
  link:         'linkWindowSize',
  webclass:     'webclassWindowSize',
  externalLink: 'externalLinkWindowSize',
  informations: 'informationsWindowSize',
};