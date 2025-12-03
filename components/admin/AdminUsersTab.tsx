import React from 'react';
import { Loader2 } from 'lucide-react';
import { ApiAdminUser } from '../../services/api';
import { formatDate } from './utils';

interface AdminUsersTabProps {
  users: ApiAdminUser[];
  isLoadingUsers: boolean;
  totalUsers: number;
  totalProjects: number;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  isLoadingUsers,
  totalUsers,
  totalProjects,
}) => {
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
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 sm:gap-4">
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
                  <div>
                    {user.isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30 font-medium">
                        ✓ Оплачена
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30 font-medium">
                        ✗ Не оплачена
                      </span>
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
