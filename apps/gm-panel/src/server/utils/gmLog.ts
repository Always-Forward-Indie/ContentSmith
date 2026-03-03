import { db } from '../db';
import { gmActionLog } from '../schema';

export async function logGmAction(params: {
  actionType: string;
  targetType: string;
  targetId?: number | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  gmUserId?: number | null;
}) {
  try {
    await db.insert(gmActionLog).values({
      gmUserId: params.gmUserId ?? null,
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    });
  } catch {
    // Логирование не должно ронять основной запрос
  }
}
