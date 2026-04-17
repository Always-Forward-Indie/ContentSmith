import { pgEnum } from 'drizzle-orm/pg-core';

// Enum types based on the SQL schema
export const nodeTypeEnum = pgEnum('node_type', ['line', 'choice_hub', 'action', 'jump', 'end']);
export const questStateEnum = pgEnum('quest_state', ['offered', 'active', 'completed', 'turned_in', 'failed']);
export const questStepTypeEnum = pgEnum('quest_step_type', ['collect', 'kill', 'talk', 'reach', 'custom']);
export const effectModifierTypeEnum = pgEnum('effect_modifier_type', ['flat', 'percent', 'percent_all']);
export const statusEffectCategoryEnum = pgEnum('status_effect_category', ['buff', 'debuff', 'dot', 'hot', 'cc']);