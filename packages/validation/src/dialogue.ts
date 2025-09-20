import { z } from 'zod';
import { ConditionGroupSchema } from './conditions';
import { ActionSchema } from './actions';

// Dialogue schemas
export const DialogueNodeTypeSchema = z.enum(['line', 'choice_hub', 'action', 'jump', 'end']);

const BaseDialogueNodeSchema = z.object({
  id: z.number().optional(),
  dialogueId: z.number(),
  type: DialogueNodeTypeSchema,
  speakerNpcId: z.number().nullable().optional(),
  clientNodeKey: z.string().nullable().optional(),
  conditionGroup: ConditionGroupSchema.nullable().optional(),
  actionGroup: z.array(ActionSchema).nullable().optional(),
  jumpTargetNodeId: z.number().nullable().optional(),
});

export const DialogueNodeSchema = BaseDialogueNodeSchema.refine((data) => {
  // Jump nodes must have a target
  if (data.type === 'jump') {
    return data.jumpTargetNodeId !== null && data.jumpTargetNodeId !== undefined;
  }
  return true;
}, {
  message: "Jump nodes must have a jump target",
  path: ["jumpTargetNodeId"]
});

// Export the base schema for cases where we need .omit() or .required()
export const DialogueNodeBaseSchema = BaseDialogueNodeSchema;

export const DialogueEdgeSchema = z.object({
  id: z.number().optional(),
  fromNodeId: z.number(),
  toNodeId: z.number(),
  orderIndex: z.number().min(0).default(0),
  clientChoiceKey: z.string().nullable().optional(),
  conditionGroup: ConditionGroupSchema.nullable().optional(),
  actionGroup: z.array(ActionSchema).nullable().optional(),
  hideIfLocked: z.boolean().default(false),
});

export const DialogueSchema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(255),
  version: z.number().min(1).default(1),
  startNodeId: z.number().nullable().optional(),
});

export const CreateDialogueSchema = DialogueSchema.omit({ id: true });
export const UpdateDialogueSchema = DialogueSchema.partial().required({ id: true });

export type DialogueNodeType = z.infer<typeof DialogueNodeTypeSchema>;
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;
export type DialogueEdge = z.infer<typeof DialogueEdgeSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type CreateDialogue = z.infer<typeof CreateDialogueSchema>;
export type UpdateDialogue = z.infer<typeof UpdateDialogueSchema>;