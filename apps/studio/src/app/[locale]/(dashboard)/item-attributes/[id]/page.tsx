import { ItemAttributeView } from '@/components/items/ItemAttributeView';

interface ItemAttributePageProps {
    params: {
        id: string;
    };
}

export default function ItemAttributePage({ params }: ItemAttributePageProps) {
    const id = parseInt(params.id);

    if (isNaN(id)) {
        return (
            <div className="text-center py-8">
                <h2 className="text-lg font-medium">Invalid ID</h2>
                <p className="text-muted-foreground">The provided ID is not valid.</p>
            </div>
        );
    }

    return <ItemAttributeView id={id} />;
}