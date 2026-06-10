'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface EffectInstance {
  id: number;
  skillId: number;
  orderIdx: number;
  targetTypeId: number;
  targetTypeSlug: string | null;
  mappings: EffectMapping[];
}

interface EffectMapping {
  id: number;
  effectInstanceId: number;
  effectId: number;
  value: number;
  level: number;
  tickMs: number;
  durationMs: number;
  attributeId: number | null;
  formulaSlug: string | null;
  attributeSlug: string | null;
}

interface EffectInstancesEditorProps {
  skillId: number;
}

export function EffectInstancesEditor({ skillId }: EffectInstancesEditorProps) {
  const t = useTranslations('skills');
  const commonT = useTranslations('common');
  const { toast } = useToast();

  const [expandedInstances, setExpandedInstances] = useState<Set<number>>(new Set());
  const [newMappingFor, setNewMappingFor] = useState<number | null>(null);
  const [authLevel, setAuthLevel] = useState<number>(1);

  const { data: instances, refetch } = trpc.skills.getEffectInstances.useQuery(skillId);
  const { data: targetTypes } = trpc.skills.getTargetTypes.useQuery();
  const { data: formulas } = trpc.skills.getDamageFormulas.useQuery();
  const { data: attributes } = trpc.skills.getEntityAttributes.useQuery();

  const createInstanceMutation = trpc.skills.createEffectInstance.useMutation({
    onSuccess: () => { refetch(); },
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const updateInstanceMutation = trpc.skills.updateEffectInstance.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const deleteInstanceMutation = trpc.skills.deleteEffectInstance.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const upsertMappingMutation = trpc.skills.upsertEffectMapping.useMutation({
    onSuccess: () => { refetch(); setNewMappingFor(null); },
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const deleteMappingMutation = trpc.skills.deleteEffectMapping.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const toggleExpand = (instanceId: number) => {
    setExpandedInstances((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  };

  const handleAddInstance = () => {
    const nextOrder = (instances ?? []).length > 0
      ? Math.max(...(instances ?? []).map((i) => i.orderIdx)) + 1
      : 1;
    createInstanceMutation.mutate({ skillId, orderIdx: nextOrder, targetTypeId: 1 });
  };

  const handleUpdateTarget = (instanceId: number, targetTypeId: number) => {
    updateInstanceMutation.mutate({ id: instanceId, targetTypeId });
  };

  const handleUpdateOrder = (instanceId: number, orderIdx: number) => {
    updateInstanceMutation.mutate({ id: instanceId, orderIdx });
  };

  const handleAddMapping = (effectInstanceId: number) => {
    if (!formulas || formulas.length === 0) return;
    upsertMappingMutation.mutate({
      effectInstanceId,
      effectId: formulas[0].id,
      value: 0,
      level: authLevel,
      tickMs: 0,
      durationMs: 0,
    });
  };

  const handleMappingChange = (
    mapping: EffectMapping,
    field: 'effectId' | 'value' | 'level' | 'tickMs' | 'durationMs' | 'attributeId',
    rawValue: string,
  ) => {
    if (rawValue === '') return;
    const numValue = parseFloat(rawValue);
    if (isNaN(numValue)) return;

    upsertMappingMutation.mutate({
      effectInstanceId: mapping.effectInstanceId,
      effectId: field === 'effectId' ? numValue : mapping.effectId,
      value: field === 'value' ? numValue : Number(mapping.value),
      level: field === 'level' ? Math.max(1, numValue) : mapping.level,
      tickMs: field === 'tickMs' ? numValue : mapping.tickMs,
      durationMs: field === 'durationMs' ? numValue : mapping.durationMs,
      attributeId: field === 'attributeId'
        ? (numValue > 0 ? numValue : null)
        : mapping.attributeId,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('effectInstancesTitle')}</CardTitle>
            <CardDescription>{t('effectInstancesDesc')}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddInstance} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('addEffectInstance')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!instances || instances.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noEffectInstances')}</p>
        ) : (
          instances.map((inst) => {
            const isExpanded = expandedInstances.has(inst.id);
            const levels = inst.mappings.map((m) => m.level).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

            return (
              <div key={inst.id} className="rounded-lg border">
                {/* Instance header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-t-lg">
                  <button
                    type="button"
                    onClick={() => toggleExpand(inst.id)}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t('effectInstance')} #{inst.orderIdx}</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-xs text-muted-foreground">{t('order')}:</label>
                    <Input
                      value={inst.orderIdx}
                      onChange={(e) => handleUpdateOrder(inst.id, parseInt(e.target.value) || inst.orderIdx)}
                      type="number"
                      className="h-7 w-14 text-xs"
                    />
                    <label className="text-xs text-muted-foreground ml-2">{t('target')}:</label>
                    <Select
                      value={String(inst.targetTypeId)}
                      onValueChange={(v) => handleUpdateTarget(inst.id, parseInt(v))}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(targetTypes ?? []).map((tt) => (
                          <SelectItem key={tt.id} value={String(tt.id)}>
                            {tt.slug}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 ml-1"
                      onClick={() => deleteInstanceMutation.mutate({ id: inst.id })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: mappings table */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 space-y-3">
                    {inst.mappings.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">{t('noMappingsYet')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="px-2 py-1.5 text-left font-medium text-xs w-14">{t('level')}</th>
                              <th className="px-2 py-1.5 text-left font-medium text-xs">{t('formula')}</th>
                              <th className="px-2 py-1.5 text-left font-medium text-xs">{t('value')}</th>
                              <th className="px-2 py-1.5 text-left font-medium text-xs">{t('tickMs')}</th>
                              <th className="px-2 py-1.5 text-left font-medium text-xs">{t('durationMs')}</th>
                              <th className="px-2 py-1.5 text-left font-medium text-xs">{t('attribute')}</th>
                              <th className="px-1 py-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {inst.mappings.sort((a, b) => a.level - b.level || a.effectId - b.effectId).map((mapping) => (
                              <tr key={mapping.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-2 py-1">
                                  <Input
                                    value={mapping.level}
                                    onChange={(e) => handleMappingChange(mapping, 'level', e.target.value)}
                                    type="number"
                                    className="h-7 w-14 text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Select
                                    value={String(mapping.effectId)}
                                    onValueChange={(v) => handleMappingChange(mapping, 'effectId', v)}
                                  >
                                    <SelectTrigger className="h-7 w-28 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(formulas ?? []).map((f) => (
                                        <SelectItem key={f.id} value={String(f.id)}>
                                          {f.slug}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    value={mapping.value}
                                    onChange={(e) => handleMappingChange(mapping, 'value', e.target.value)}
                                    type="number"
                                    step="any"
                                    className="h-7 w-20 text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    value={mapping.tickMs}
                                    onChange={(e) => handleMappingChange(mapping, 'tickMs', e.target.value)}
                                    type="number"
                                    className="h-7 w-20 text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Input
                                    value={mapping.durationMs}
                                    onChange={(e) => handleMappingChange(mapping, 'durationMs', e.target.value)}
                                    type="number"
                                    className="h-7 w-20 text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <Select
                                    value={mapping.attributeId ? String(mapping.attributeId) : ''}
                                    onValueChange={(v) => handleMappingChange(mapping, 'attributeId', v ? v : '0')}
                                  >
                                    <SelectTrigger className="h-7 w-32 text-xs">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">-</SelectItem>
                                      {(attributes ?? []).map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>
                                          {a.slug}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-1 py-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => deleteMappingMutation.mutate({ id: mapping.id })}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add mapping row */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newMappingFor === inst.id ? authLevel : ''}
                        onChange={(e) => setAuthLevel(parseInt(e.target.value) || 1)}
                        type="number"
                        placeholder={t('level')}
                        className="h-7 w-14 text-xs"
                        onFocus={() => setNewMappingFor(inst.id)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleAddMapping(inst.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t('addMapping')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
