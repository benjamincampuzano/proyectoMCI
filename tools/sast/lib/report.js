'use strict';

/**
 * Generadores de informe: consola (legible), JSON y SARIF ( interoperable
 * con GitHub Code Scanning / Azure DevOps).
 */

const { SEVERITY } = require('./rules');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const SEVERITY_COLOR = {
  critical: COLORS.red + COLORS.bold,
  high: COLORS.red,
  medium: COLORS.yellow,
  low: COLORS.blue,
  info: COLORS.dim,
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

function useColor() {
  return process.stdout.isTTY && !process.env.NO_COLOR;
}

function paint(text, color) {
  if (!useColor()) return text;
  return `${color}${text}${COLORS.reset}`;
}

function pad(text, width) {
  const str = String(text);
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}

function formatConsole(result, options = {}) {
  const lines = [];
  const { stats, findings, unparsedFiles = [] } = result;
  const bySeverity = countBySeverity(findings);

  lines.push('');
  lines.push(paint('╭─ SAST · análisis estático de JavaScript ─────────────────────────╮', COLORS.cyan));
  lines.push(`│ Proyecto : ${options.repoName || '(raíz)'}`);
  lines.push(`│ Objetivo : ${options.targets.join(', ')}`);
  lines.push(
    `│ Ficheros : ${stats.parsed} analizados · ${stats.unparsed} sin parsear · ${stats.lines} líneas`
  );
  lines.push(
    `│ Hallazgos: ${findings.length} (${SEVERITY_ORDER.filter((s) => bySeverity[s]).map((s) => `${bySeverity[s]} ${s}`).join(' · ') || '0'})`
  );
  lines.push(paint('╰──────────────────────────────────────────────────────────────╯', COLORS.cyan));
  lines.push('');

  if (!findings.length) {
    lines.push(paint('  ✔ No se detectaron patrones inseguros con las reglas activas.', COLORS.green));
    lines.push('');
  }

  let currentFile = null;
  for (const finding of sortedFindings(findings)) {
    if (finding.file !== currentFile) {
      currentFile = finding.file;
      lines.push('');
      lines.push(paint(`▸ ${currentFile}`, COLORS.bold + COLORS.magenta));
    }
    const color = SEVERITY_COLOR[finding.severity] || '';
    lines.push(
      `  ${paint(pad(finding.severityLabel, 8), color)}${paint(pad(`L${finding.line}:${finding.column}`, 10), COLORS.dim)} ${paint(
        finding.ruleId,
        COLORS.bold
      )} ${finding.message}`
    );
    if (finding.taintPath && finding.taintPath.length) {
      lines.push(`           ${paint('flujo:', COLORS.dim)} ${finding.taintPath.join(' → ')}`);
    }
    if (finding.snippet) {
      for (const snippetLine of finding.snippet.split('\n')) {
        lines.push(`           ${paint('│', COLORS.dim)} ${paint(snippetLine, COLORS.dim)}`);
      }
    }
    lines.push(`           ${paint('CWE:', COLORS.dim)} ${finding.cwe}  ${paint('→', COLORS.dim)} ${finding.fix}`);
  }

  if (unparsedFiles.length) {
    lines.push('');
    lines.push(paint(`  Ficheros no analizados (${unparsedFiles.length}):`, COLORS.yellow));
    for (const file of unparsedFiles.slice(0, 20)) {
      lines.push(`    - ${file.file}: ${file.error}`);
    }
    if (unparsedFiles.length > 20) {
      lines.push(`    … y ${unparsedFiles.length - 20} más`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function countBySeverity(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
  }
  return counts;
}

function sortedFindings(findings) {
  return [...findings].sort((a, b) => {
    const sev = SEVERITY[b.severity].rank - SEVERITY[a.severity].rank;
    if (sev !== 0) return sev;
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    return a.line - b.line;
  });
}

function formatJson(result, options = {}) {
  return JSON.stringify(
    {
      tool: { name: 'sast', version: '1.0.0' },
      project: options.repoName,
      generatedAt: new Date().toISOString(),
      targets: options.targets,
      stats: {
        filesScanned: result.stats.parsed,
        filesUnparsed: result.stats.unparsed,
        linesScanned: result.stats.lines,
        totalFindings: result.findings.length,
        bySeverity: countBySeverity(result.findings),
      },
      unparsedFiles: result.unparsedFiles || [],
      findings: sortedFindings(result.findings).map((f) => ({
        ruleId: f.ruleId,
        severity: f.severity,
        cwe: f.cwe,
        title: f.title,
        message: f.message,
        file: f.file,
        line: f.line,
        column: f.column,
        snippet: f.snippet,
        taintPath: f.taintPath,
        confidence: f.confidence,
        remediation: f.fix,
      })),
    },
    null,
    2
  );
}

function formatSarif(result, options = {}) {
  const sarifLevel = { critical: 'error', high: 'error', medium: 'warning', low: 'note', info: 'note' };
  const rules = new Map();

  for (const finding of result.findings) {
    if (rules.has(finding.ruleId)) continue;
    rules.set(finding.ruleId, {
      id: finding.ruleId,
      name: finding.ruleId,
      shortDescription: { text: finding.title },
      fullDescription: { text: finding.message },
      help: { text: finding.fix },
      properties: { tags: ['security', finding.cwe] },
      defaultConfiguration: { level: sarifLevel[finding.severity] || 'note' },
    });
  }

  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'SAST-JS',
              version: '1.0.0',
              informationUri: 'https://owasp.org/www-project-top-ten/',
              rules: [...rules.values()],
            },
          },
          results: sortedFindings(result.findings).map((f) => ({
            ruleId: f.ruleId,
            level: sarifLevel[f.severity] || 'note',
            message: { text: f.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: f.file },
                  region: { startLine: Math.max(1, f.line), startColumn: Math.max(1, f.column) },
                },
              },
            ],
          })),
        },
      ],
    },
    null,
    2
  );
}

module.exports = { formatConsole, formatJson, formatSarif, countBySeverity, sortedFindings };
