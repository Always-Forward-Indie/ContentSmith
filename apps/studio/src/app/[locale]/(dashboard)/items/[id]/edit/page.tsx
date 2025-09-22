import { ItemForm } from '@/components/items/ItemForm';

interface EditItemPageProps {
    params: {
        id: string;
    };
}

export default function EditItemPage({ params }: EditItemPageProps) {
    const itemId = parseInt(params.id);

    return <ItemForm itemId={itemId} />;
}