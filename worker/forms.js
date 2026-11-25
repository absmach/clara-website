// The privacy notice version each form shows. The client sends it back and the
// Worker records it, so a stale page cannot submit under older wording.
// Update it with the privacy page (site/src/privacy.html).
export const NOTICE_VERSION = "2026-11-25";

// Contact form topics. site/scripts/build.mjs renders the options from this list.
export const CONTACT_TOPICS = {
  general: "General question",
  partnerships: "Partnerships",
  press: "Press",
  support: "Support",
  privacy: "Privacy",
};
