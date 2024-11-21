/*
 * Copyright 2024 leeyeh
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CoverageSummary } from "istanbul-lib-coverage";
import { Context, ReportBase, ReportNode } from "istanbul-lib-report";

import { ISonarCoverageReporterOptions } from "./sonarCoverageReporterOptionsInterface";

export class SonarCoverageReporter extends ReportBase {
  private readonly __enforceThreshold: boolean;
  private readonly __threshold: number;
  private readonly __verbose: boolean;

  public constructor(options?: ISonarCoverageReporterOptions) {
    super();

    this.__threshold = options?.threshold ?? 40;
    this.__enforceThreshold = options?.enforceThreshold ?? true;
    this.__verbose = options?.verbose ?? true;
  }

  public onStart(node: ReportNode, context: Context): void {
    const summary = node.getCoverageSummary(false);
    const cw = context.writer.writeFile(null);

    const coverage = this.__calculateCoverage(summary);
    const color = this.__getColorForCoverage(coverage);

    cw.println(cw.colorize(`Sonar coverage: ${coverage}%`, color));

    const failed = this.__enforceThreshold && coverage < this.__threshold;
    if (failed) {
      cw.println(
        cw.colorize(
          `Test failed as the coverage < ${this.__threshold}%`,
          color,
        ),
      );
    } else {
      cw.println(Array.from({ length: 80 }).fill("=").join(""));
    }
    cw.close();
    if (failed) {
      // eslint-disable-next-line no-process-exit, unicorn/no-process-exit
      process.exit(1);
    }
  }

  private __calculateCoverage(summary: CoverageSummary): number {
    // Algorithm was found here https://github.com/Waidd/sonarcov-watchdog/blob/3907a8e597fd9d3058beb4366d937f990b0d9b2b/src/index.js#L40-L57

    const linesFound = summary.lines.total;
    const linesHit = summary.lines.covered;
    const branchesFound = summary.branches.total;
    const branchesHit = summary.branches.covered;

    if (this.__verbose) {
      // eslint-disable-next-line no-console
      console.table({
        Line: {
          Total: linesFound,
          Uncovered: linesFound - linesHit,
          Coverage: Math.round((linesHit / linesFound) * 1000) / 10,
        },
        Condition: {
          Total: branchesFound,
          Uncovered: branchesFound - branchesHit,
          Coverage: Math.round((branchesHit / branchesFound) * 1000) / 10,
        },
      });
    }

    let coverage =
      ((branchesHit + linesHit) / (branchesFound + linesFound)) * 100;

    coverage = Math.round(coverage * 10) / 10;

    return coverage;
  }

  private __getColorForCoverage(coverage: number): "low" | "high" | "medium" {
    if (coverage < this.__threshold) {
      return "low";
    }

    return "high";
  }
}
