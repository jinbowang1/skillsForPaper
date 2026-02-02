import { loadSkillPaths } from "./app-config.js";
import { buildSystemPrompt } from "./app-system-prompt.js";
import { logger } from "./app-logger.js";

/**
 * Create a ResourceLoader that:
 * 1. Loads skills from the bundled skills directory
 * 2. Injects the custom system prompt with MEMORY.md
 *
 * Accepts the pi-coding-agent exports as parameters to avoid
 * a static require of the ESM-only package at module scope.
 */
export function createResourceLoader(
  cwd: string,
  agentDir: string | undefined,
  piAgent: {
    DefaultResourceLoader: any;
  }
) {
  const { DefaultResourceLoader } = piAgent;
  const skillDirs = loadSkillPaths();
  logger.info(`Skill directories resolved: ${JSON.stringify(skillDirs)}`);

  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    additionalSkillPaths: skillDirs,
    appendSystemPrompt: buildSystemPrompt(),
    skillsOverride: (base: any) => {
      // Deduplicate: when multiple dirs have same-name skill,
      // keep the first one encountered (skillDirs order matters)
      const seen = new Map<string, any>();
      const diagnostics: any[] = [...base.diagnostics];

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
