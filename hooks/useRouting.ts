/**
 * Хук для hash-based роутинга
 */

import { useState, useEffect, useCallback } from 'react';

export interface RouteState {
  isLandingOpen: boolean;
  isCreativeLandingOpen: boolean;
  isUltraLandingOpen: boolean;
  isAdminOpen: boolean;
  isOfferOpen: boolean;
  isPrivacyOpen: boolean;
  isRequisitesOpen: boolean;
  prototypeHash: string | null;
  adminInitialAgentId: string | undefined;
}

export interface UseRoutingReturn {
  routeState: RouteState;
  navigateTo: (route: string) => void;
  setRouteState: (state: Partial<RouteState>) => void;
}

/**
 * Хук для управления hash-based роутингом
 * 
 * Предоставляет методы для:
 * - Отслеживания текущего маршрута
 * - Навигации между страницами
 * - Управления состоянием роутинга
 */
export const useRouting = (
  currentUser: { username?: string } | null
): UseRoutingReturn => {
  const [routeState, setRouteStateInternal] = useState<RouteState>({
    isLandingOpen: false,
    isCreativeLandingOpen: false,
    isUltraLandingOpen: false,
    isAdminOpen: false,
    isOfferOpen: false,
    isPrivacyOpen: false,
    isRequisitesOpen: false,
    prototypeHash: null,
    adminInitialAgentId: undefined,
  });

  const setRouteState = useCallback((updates: Partial<RouteState>) => {
    setRouteStateInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const navigateTo = useCallback((route: string) => {
    window.location.hash = route;
  }, []);

  // Обработчик изменения hash
  const handleHashChange = useCallback(() => {
    const hash = window.location.hash;

    if (hash === '#/landing' || hash === '#/') {
      setRouteState({
        isLandingOpen: true,
        isCreativeLandingOpen: false,
        isUltraLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '') {
      // Если hash пустой и пользователь авторизован, не показываем лендинг
      setRouteState({
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
        isLandingOpen: !currentUser, // Показываем лендинг только если пользователь не авторизован
        isCreativeLandingOpen: false,
        isUltraLandingOpen: false,
      });
    } else if (hash === '#/promo') {
      setRouteState({
        isCreativeLandingOpen: true,
        isLandingOpen: false,
        isUltraLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/ultra') {
      setRouteState({
        isUltraLandingOpen: true,
        isLandingOpen: false,
        isCreativeLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/admin') {
      setRouteState({
        isAdminOpen: true,
        isLandingOpen: false,
        isCreativeLandingOpen: false,
        isUltraLandingOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/projects') {
      // Закрываем все специальные страницы и показываем основное приложение
      setRouteState({
        isAdminOpen: false,
        isLandingOpen: false,
        isCreativeLandingOpen: false,
        isUltraLandingOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/offer') {
      setRouteState({
        isOfferOpen: true,
        isLandingOpen: false,
        isUltraLandingOpen: false,
        isCreativeLandingOpen: false,
        isAdminOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/privacy') {
      setRouteState({
        isPrivacyOpen: true,
        isLandingOpen: false,
        isUltraLandingOpen: false,
        isCreativeLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/requisites') {
      setRouteState({
        isRequisitesOpen: true,
        isLandingOpen: false,
        isUltraLandingOpen: false,
        isCreativeLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash === '#/auth') {
      // Закрываем все страницы для показа AuthPage
      setRouteState({
        isLandingOpen: false,
        isUltraLandingOpen: false,
        isCreativeLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        prototypeHash: null,
        adminInitialAgentId: undefined,
      });
    } else if (hash.startsWith('#/prototype/')) {
      const hashValue = hash.replace('#/prototype/', '');
      setRouteState({
        prototypeHash: hashValue,
        isLandingOpen: false,
        isCreativeLandingOpen: false,
        isUltraLandingOpen: false,
        isAdminOpen: false,
        isOfferOpen: false,
        isPrivacyOpen: false,
        isRequisitesOpen: false,
        adminInitialAgentId: undefined,
      });
    }
  }, [currentUser, setRouteState]);

  // Слушаем изменения hash
  useEffect(() => {
    // Вызываем обработчик сразу при монтировании
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    // Также слушаем popstate для кнопок назад/вперед
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [handleHashChange]);

  // Отслеживаем изменения hash, когда событие hashchange не срабатывает
  useEffect(() => {
    let lastHash = window.location.hash;
    const checkHash = () => {
      const currentHash = window.location.hash;
      if (currentHash !== lastHash) {
        lastHash = currentHash;
        // Вызываем событие hashchange вручную
        window.dispatchEvent(new HashChangeEvent('hashchange', {
          oldURL: window.location.href.replace(window.location.hash, lastHash),
          newURL: window.location.href
        }));
      }
    };
    
    // Проверяем каждые 100мс для отслеживания программных изменений hash
    const interval = setInterval(checkHash, 100);
    
    return () => clearInterval(interval);
  }, []);

  return {
    routeState,
    navigateTo,
    setRouteState,
  };
};

