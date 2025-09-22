import { useTranslations } from 'next-intl';

export function useItemsNavigation() {
  const t = useTranslations('items');

  const getPageTitle = (route: string, itemName?: string) => {
    switch (route) {
      case 'list':
        return t('title');
      case 'view':
        return itemName ? `${t('view')}: ${itemName}` : t('view');
      case 'create':
        return t('createItem');
      case 'edit':
        return itemName ? `${t('edit')}: ${itemName}` : t('editItem');
      default:
        return t('title');
    }
  };

  const getBreadcrumbs = (route: string, itemName?: string) => {
    const baseBreadcrumb = { label: t('title'), href: '/items' };
    
    switch (route) {
      case 'list':
        return [baseBreadcrumb];
      case 'view':
        return [
          baseBreadcrumb,
          { label: itemName || t('view'), href: '#' }
        ];
      case 'create':
        return [
          baseBreadcrumb,
          { label: t('createItem'), href: '#' }
        ];
      case 'edit':
        return [
          baseBreadcrumb,
          { label: itemName || t('editItem'), href: '#' }
        ];
      default:
        return [baseBreadcrumb];
    }
  };

  return {
    getPageTitle,
    getBreadcrumbs,
  };
}