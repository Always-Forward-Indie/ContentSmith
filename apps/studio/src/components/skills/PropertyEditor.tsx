'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Save } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface PropertyEditorProps {
  skillId: number;
}

export function PropertyEditor({ skillId }: PropertyEditorProps) {
  const t = useTranslations('skills');
  const commonT = useTranslations('common');
  const { toast } = useToast();

  const { data: allProperties } = trpc.skills.getProperties.useQuery();
  const { data: mappings, refetch } = trpc.skills.getPropertyMappings.useQuery(skillId);

  const upsertMutation = trpc.skills.upsertPropertyMapping.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const deleteMutation = trpc.skills.deletePropertyMapping.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast({ title: commonT('error'), description: err.message, variant: 'error' }),
  });

  const levels = (mappings ?? []).map((m) => m.skillLevel).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  const getValue = (level: number, propertyId: number): string => {
    const m = (mappings ?? []).find((x) => x.skillLevel === level && x.propertyId === propertyId);
    return m !== undefined ? String(m.propertyValue) : '';
  };

  const handleValueChange = (level: number, propertyId: number, rawValue: string) => {
    if (rawValue === '') {
      const m = (mappings ?? []).find((x) => x.skillLevel === level && x.propertyId === propertyId);
      if (m) deleteMutation.mutate({ id: m.id });
      return;
    }
    const value = parseFloat(rawValue);
    if (isNaN(value)) return;
    upsertMutation.mutate({ skillId, skillLevel: level, propertyId, propertyValue: value });
  };

  const handleAddLevel = () => {
    const nextLevel = levels.length > 0 ? Math.max(...levels) + 1 : 1;
    upsertMutation.mutate({ skillId, skillLevel: nextLevel, propertyId: (allProperties ?? [])[0]?.id ?? 1, propertyValue: 0 }, { onSuccess: () => refetch() });
  };

  const handleRemoveLevel = (level: number) => {
    const toDelete = (mappings ?? []).filter((m) => m.skillLevel === level);
    toDelete.forEach((m) => deleteMutation.mutate({ id: m.id }));
  };

  const hasAnyLevel = levels.length > 0;

  if (!allProperties || allProperties.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('propertyEditorTitle')}</CardTitle>
            <CardDescription>{t('propertyEditorDesc')}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddLevel} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('addLevel')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnyLevel ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noLevelsYet')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-xs w-16">{t('level')}</th>
                  {allProperties.map((prop) => (
                    <th key={prop.id} className="px-3 py-2 text-left font-medium text-xs whitespace-nowrap">
                      {prop.name}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{level}</td>
                    {allProperties.map((prop) => (
                      <td key={prop.id} className="px-1.5 py-1">
                        <Input
                          value={getValue(level, prop.id)}
                          onChange={(e) => handleValueChange(level, prop.id, e.target.value)}
                          onBlur={(e) => handleValueChange(level, prop.id, e.target.value)}
                          type="number"
                          step="any"
                          className="h-7 w-20 text-xs px-1.5"
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleRemoveLevel(level)}
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
      </CardContent>
    </Card>
  );
}
