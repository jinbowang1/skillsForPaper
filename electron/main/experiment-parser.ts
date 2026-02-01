/**
 * Parse experiment metrics from bash tool output
 */

export interface ExperimentMetrics {
  epoch?: { current: number; total: number };
  loss?: number;
  accuracy?: number;
  lr?: string;
  elapsed?: string;
  status: "running" | "done" | "error";
}

const EPOCH_RE = /[Ee]poch\s+(\d+)\s*[\/\\]\s*(\d+)/;
const LOSS_RE = /[Ll]oss[:\s]+(\d+\.?\d*)/;
const ACCURACY_RE = /[Aa]cc(?:uracy)?[:\s]+(\d+\.?\d*)%?/;
const LR_RE = /[Ll](?:earning_?)?[Rr](?:ate)?[:\s]+([\d.e\-]+)/;
const ELAPSED_RE = /(?:elapsed|time|用时)[:\s]+([\d:]+(?:\.\d+)?)/i;

export function parseExperimentOutput(text: string): ExperimentMetrics | null {
  const epochMatch = text.match(EPOCH_RE);
  if (!epochMatch) return null;

  const metrics: ExperimentMetrics = {
    status: "running",
    epoch: {
      current: parseInt(epochMatch[1]),
      total: parseInt(epochMatch[2]),
    },
  };

  const lossMatch = text.match(LOSS_RE);
  if (lossMatch) metrics.loss = parseFloat(lossMatch[1]);

  const accMatch = text.match(ACCURACY_RE);
  if (accMatch) {
    const val = parseFloat(accMatch[1]);
    metrics.accuracy = val > 1 ? val : val * 100;
  }

  const lrMatch = text.match(LR_RE);
  if (lrMatch) metrics.lr = lrMatch[1];

  const elapsedMatch = text.match(ELAPSED_RE);
  if (elapsedMatch) metrics.elapsed = elapsedMatch[1];

  if (metrics.epoch && metrics.epoch.current >= metrics.epoch.total) {
    metrics.status = "done";
  }

  return metrics;
}
