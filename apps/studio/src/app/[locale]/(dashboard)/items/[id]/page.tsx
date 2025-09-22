import { ItemView } from '@/components/items/ItemView';

interface ItemViewPageProps {
    params: {
        id: string;
    };
}

export default function ItemViewPage({ params }: ItemViewPageProps) {
    const itemId = parseInt(params.id);

    return <ItemView itemId={itemId} />;
}