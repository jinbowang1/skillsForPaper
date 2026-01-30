import {
  DefaultResourceLoader,
  type Skill,
  type ResourceDiagnostic,
} from "@mariozechner/pi-coding-agent";
import { loadSkillPaths } from "./config.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { logger } from "./logger.js";

/**
 * Create a ResourceLoader that:
 * 1. Loads skills from all directories listed in skill-paths.json
 * 2. Local ./skills/ directory has highest priority (overrides same-name skills)
 * 3. Injects the custom system prompt with MEMORY.md
 */
export function createResourceLoader(cwd: string, agentDir?: string) {
  const skillDirs = loadSkillPaths();
  logger.info(`Skill directories resolved: ${JSON.stringify(skillDirs)}`);

  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    additionalSkillPaths: skillDirs,
    systemPrompt: buildSystemPrompt(),
    skillsOverride: (base) => {
      // Deduplicate: when multiple dirs have same-name skill,
      // keep the first one encountered (skillDirs order matters,
      // and local ./skills/ is listed first in skill-paths.json)
      const seen = new Map<string, Skill>();
      const diagnostics: ResourceDiagnostic[] = [...base.diagnostics];

      for (const skill of base.skills) {
        if (!seen.has(skill.name)) {
          seen.set(skill.name, skill);
        } else {
          const existing = seen.get(skill.name)!;
          diagnostics.push({
            type: "collision",
            message: `Skill "${skill.name}" from ${skill.source} shadowed by ${existing.source}`,
            path: skill.filePath,
          });
          logger.debug(
            `Skill "${skill.name}" from ${skill.source} shadowed by ${existing.source}`
          );
        }
      }

      const skills = Array.from(seen.values());
      logger.info(`Total skills loaded: ${skills.length}`);
      return { skills, diagnostics };
    },
  });

  return loader;
}
