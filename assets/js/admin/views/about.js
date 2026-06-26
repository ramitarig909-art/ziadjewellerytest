/* About page editor — heading, paragraphs, mission, vision, history. */
import { editorPage, loadContent, saveBilingual } from "/assets/js/admin/forms.js";
import { skeletonRows } from "/assets/js/lib/ui.js";

const FIELDS = [
  { key: "about_eyebrow", label: "Eyebrow" },
  { key: "about_h2", label: "Heading" },
  { key: "about_p1", label: "Paragraph 1", multiline: true },
  { key: "about_p2", label: "Paragraph 2", multiline: true },
  { key: "about_p3", label: "Paragraph 3", multiline: true },
  { key: "about_mission", label: "Mission", multiline: true },
  { key: "about_vision", label: "Vision", multiline: true },
  { key: "about_history", label: "History", multiline: true }
];

export async function render(el) {
  el.innerHTML = `<div class="panel"><div class="panel-body">${skeletonRows(5)}</div></div>`;
  const fields = await loadContent(FIELDS);
  editorPage(el, {
    title: "About Page", sub: "Tell your story — updates the public About section.",
    fields,
    onSave: (scope) => saveBilingual(scope, fields)
  });
}
