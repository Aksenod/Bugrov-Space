import React, { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { ApiAdminUser, api } from '../../services/api';
import { formatDate } from './utils';

interface AdminUsersTabProps {
  users: ApiAdminUser[];
  isLoadingUsers: boolean;
  totalUsers: number;
  totalProjects: number;
  onUsersReload?: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  isLoadingUsers,
  totalUsers,
  totalProjects,
  onUsersReload,
}) => {
  const [fixingSubscriptions, setFixingSubscriptions] = useState<Set<string>>(new Set());

  const handleFixSubscription = async (username: string) => {
    if (fixingSubscriptions.has(username)) return;

    setFixingSubscriptions(prev => new Set(prev).add(username));
    try {
      const result = await api.fixUserSubscription(username);
      console.log('[AdminUsersTab] Subscription fixed:', result);
      if (result.success) {
        alert(`Подписка для пользователя ${username} успешно активирована!`);
        if (onUsersReload) {
          onUsersReload();
        }
      }
    } catch (error: any) {
      console.error('[AdminUsersTab] Failed to fix subscription:', error);
      const errorMessage = error?.message || 'Неизвестная ошибка';
      if (errorMessage.includes('No successful payments')) {
        alert(`У пользователя ${username} нет успешных платежей для активации подписки.`);
      } else {
        alert(`Ошибка при активации подписки: ${errorMessage}`);
      }
    } finally {
      setFixingSubscriptions(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base sm:text-lg font-bold text-white">Пользователи</h2>
        {(totalUsers > 0 || totalProjects > 0) && (
          <span className="text-xs sm:text-sm text-white/60">
            ({totalUsers} {totalUsers === 1 ? 'пользователь' : totalUsers < 5 ? 'пользователя' : 'пользователей'}, {totalProjects} {totalProjects === 1 ? 'проект' : totalProjects < 5 ? 'проекта' : 'проектов'})
          </span>
        )}
      </div>

      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-white/60 text-sm">
          <p>Пользователи не найдены</p>
          <p className="text-xs text-white/40 mt-2">
            В базе данных пока нет зарегистрированных пользователей
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white/5 rounded-lg border border-white/10 p-3 sm:p-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 sm:gap-4">
                <div>
                  <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider mb-1">
                    Логин
                  </div>
                  <div className="text-sm sm:text-base text-white font-medium">
                    {user.username}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider mb-1">
                    Пароль
                  </div>
                  <div className="text-sm sm:text-base text-white/80">
                    ••••••
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider mb-1">
                    Дата регистрации
                  </div>
                  <div className="text-sm sm:text-base text-white/80">
                    {formatDate(user.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider mb-1">
                    Проектов
                  </div>
                  <div className="text-sm sm:text-base text-white font-medium">
                    {user.projectsCount}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider mb-1">
                    Подписка
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30 font-medium">
                        ✓ Оплачена
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30 font-medium">
                        ✗ Не оплачена
                      </span>
                    )}
                    {!user.isPaid && (
                      <button
                        onClick={() => handleFixSubscription(user.username)}
                        disabled={fixingSubscriptions.has(user.username)}
                        className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Активировать подписку (если есть успешный платеж)"
                      >
                        {fixingSubscriptions.has(user.username) ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider mb-1">
                    Действует до
                  </div>
                  <div className="text-sm sm:text-base text-white/80">
                    {user.subscriptionExpiresAt ? formatDate(user.subscriptionExpiresAt) : '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
