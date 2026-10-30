import type { TemplateDefinition } from './workbench/configuration-types.js';
/** Canonical content for the temporary frontend configuration, excluding version metadata. */
export function templateContentKey(definition: TemplateDefinition): string {
  return JSON.stringify({
    name: definition.name.trim(),
    description: definition.description,
    steps: definition.steps.map((step) => ({
      id: step.id,
      name: step.name.trim(),
      goal: step.goal.trim(),
      instructions: step.instructions,
      outputs: step.outputs.map((x) => x.trim()).filter(Boolean),
      checks: step.checks.map((x) => x.trim()).filter(Boolean),
      required: step.required,
      mode: step.mode,
      requiresCode: step.requiresCode,
    })),
    suggestedCriteria: definition.suggestedCriteria,
  });
}
