import { ItemTypesList } from "@/components/items/ItemTypesList";
import { useTranslations } from "next-intl";

export default function ItemTypesPage() {
    const t = useTranslations('itemTypes');

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">
                    {t('description')}
                </p>
            </div>
            <ItemTypesList />
        </div>
    );
}