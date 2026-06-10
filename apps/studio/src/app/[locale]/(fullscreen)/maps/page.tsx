import { WorldMapEditor } from '@/components/map/WorldMapEditor';

export default function WorldMapPage({ searchParams }: { searchParams: { focus?: string } }) {
    return <WorldMapEditor initialFocus={searchParams.focus} />;
}
