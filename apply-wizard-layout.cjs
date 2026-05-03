#!/usr/bin/env node
/**
 * Fixes the mobile activation wizard layout.
 *
 * Run from the project root:
 *   node apply-wizard-layout.cjs
 *
 * It creates backups:
 *   index.html.bak-wizard
 *   assets/js/main.js.bak-wizard
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const indexPath = path.join(root, "index.html");
const jsPath = path.join(root, "assets", "js", "main.js");

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function writeBackup(file) {
  const backup = `${file}.bak-wizard`;
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, fs.readFileSync(file, "utf8"));
  }
}

function getFlowId(prefix) {
  const ids = [...prefix.matchAll(/id=["'](v-port|v-new|n-port|n-new)["']/g)].map((m) => m[1]);
  return ids.length ? ids[ids.length - 1] : "";
}

function getProviderLabel(flowId) {
  if (flowId.startsWith("n-")) return "NOVA Q";
  return "Vodafone CU";
}

function getHeaderClass(flowId) {
  if (flowId.startsWith("n-")) {
    return "bg-blue-700 text-white px-4 md:px-6 py-4 flex items-center justify-between gap-3";
  }
  return "bg-slate-900 text-white px-4 md:px-6 py-4 flex items-center justify-between gap-3";
}

function buildHeader(flowId) {
  return `
  <!-- WIZARD_HEADER -->
  <div class="${getHeaderClass(flowId)}">
    <div>
      <p class="text-[11px] md:text-xs font-black uppercase tracking-wider text-white/70">
        Οδηγός Ενεργοποίησης
      </p>
      <h3 data-wizard-title class="text-base md:text-lg font-black">
        Βήμα 1/4 · Προετοιμασία εγγράφων
      </h3>
    </div>

    <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-black ring-1 ring-white/20">
      ${getProviderLabel(flowId)}
    </span>
  </div>
  <!-- /WIZARD_HEADER -->`;
}

function buildFooter() {
  return `
  <!-- WIZARD_FOOTER -->
  <div class="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3 justify-between">
    <button
      type="button"
      data-wizard-prev
      class="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 disabled:opacity-40"
    >
      Πίσω
    </button>

    <button
      type="button"
      data-wizard-next
      class="flex-1 rounded-2xl bg-slate-900 text-white px-4 py-3 font-black"
    >
      Επόμενο
    </button>
  </div>
  <!-- /WIZARD_FOOTER -->`;
}

function patchIndex(html) {
  return html.replace(/<section\b(?=[^>]*\bdata-wizard\b)[^>]*>[\s\S]*?<\/section>/g, (section, offset) => {
    const prefix = html.slice(0, offset);
    const flowId = getFlowId(prefix);

    let patched = section;

    const hasHeader = patched.includes("data-wizard-title");
    const hasFooter = patched.includes("data-wizard-prev") && patched.includes("data-wizard-next");

    if (!hasHeader) {
      patched = patched.replace(/^(<section\b[^>]*>)/, `$1${buildHeader(flowId)}`);
    }

    if (!hasFooter) {
      patched = patched.replace(/<\/section>\s*$/, `${buildFooter()}\n</section>`);
    }

    return patched;
  });
}

const wizardJs = `
/* --- SIMPLE CARD WIZARD: data-wizard / data-wizard-step --- */
(function () {
  function updateWizard(wizard, stepIndex) {
    const steps = Array.from(wizard.querySelectorAll('[data-wizard-step]'));
    if (!steps.length) return;

    const safeIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
    wizard.dataset.wizardCurrent = String(safeIndex);

    steps.forEach((step, index) => {
      step.classList.toggle('hidden', index !== safeIndex);
    });

    const activeStep = steps[safeIndex];
    const title = activeStep.dataset.stepTitle || \`Βήμα \${safeIndex + 1}\`;

    const wizardTitle = wizard.querySelector('[data-wizard-title]');
    if (wizardTitle) {
      wizardTitle.textContent = \`Βήμα \${safeIndex + 1}/\${steps.length} · \${title}\`;
    }

    const prevBtn = wizard.querySelector('[data-wizard-prev]');
    const nextBtn = wizard.querySelector('[data-wizard-next]');

    if (prevBtn) {
      prevBtn.disabled = safeIndex === 0;
    }

    if (nextBtn) {
      nextBtn.textContent = safeIndex === steps.length - 1 ? 'Ολοκλήρωση' : 'Επόμενο';
    }
  }

  document.addEventListener('click', function (event) {
    const prevBtn = event.target.closest('[data-wizard-prev]');
    const nextBtn = event.target.closest('[data-wizard-next]');

    if (!prevBtn && !nextBtn) return;

    const wizard = event.target.closest('[data-wizard]');
    if (!wizard) return;

    event.preventDefault();

    const current = Number(wizard.dataset.wizardCurrent || 0);

    if (prevBtn) updateWizard(wizard, current - 1);
    if (nextBtn) updateWizard(wizard, current + 1);
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-wizard]').forEach((wizard) => {
      updateWizard(wizard, Number(wizard.dataset.wizardCurrent || 0));
    });
  });
})();
`;

function patchJs(js) {
  if (js.includes("SIMPLE CARD WIZARD") || js.includes("function updateWizard(wizard, stepIndex)")) {
    return js;
  }
  return `${js.trim()}\n\n${wizardJs}\n`;
}

try {
  writeBackup(indexPath);
  writeBackup(jsPath);

  const html = read(indexPath);
  const patchedHtml = patchIndex(html);
  fs.writeFileSync(indexPath, patchedHtml);

  const js = read(jsPath);
  const patchedJs = patchJs(js);
  fs.writeFileSync(jsPath, patchedJs);

  console.log("OK: Wizard headers/footers copied to all data-wizard sections.");
  console.log("OK: Wizard JS exists in assets/js/main.js.");
  console.log("Backups created with .bak-wizard suffix.");
} catch (error) {
  console.error("ERROR:", error.message);
  process.exit(1);
}
