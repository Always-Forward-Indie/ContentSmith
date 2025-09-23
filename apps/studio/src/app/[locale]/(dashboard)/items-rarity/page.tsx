import { ItemsRarityList } from "@/components/items/ItemsRarityList";
import { useTranslations } from "next-intl";

export default function ItemsRarityPage() {
    const t = useTranslations('itemsRarity');

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
            <ItemsRarityList />
        </div>
    );
}