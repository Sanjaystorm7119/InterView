"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SidebarOptions } from "@/constants/uiConstants";
import { LogOut, Menu, X, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";

export default function AppSideBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("access_token"));
  }, []);

  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications(token);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const nav = (
    <>
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">HireEva</h1>
          <p className="text-xs text-slate-400 mt-1">AI Recruitment</p>
        </div>
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) markAllRead(); }}
            className="relative p-1.5 text-slate-400 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute left-0 top-10 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                <span className="text-xs font-semibold text-slate-300">Notifications</span>
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-slate-400 hover:text-white">Clear all</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No notifications yet</p>
                ) : (
                  notifications.map((n: AppNotification) => (
                    <Link
                      key={n.id}
                      href={`/scheduled-interview/${n.interview_id}/details`}
                      onClick={() => setNotifOpen(false)}
                      className="block px-3 py-2.5 hover:bg-slate-700 border-b border-slate-700/50 last:border-0"
                    >
                      <p className="text-xs text-slate-200 font-medium truncate">
                        {n.candidate_name} completed an interview
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{n.job_position}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(n.timestamp).toLocaleTimeString()}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {SidebarOptions.map((item) => {
          const active = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-sm">
            {user?.firstname?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#0F172A] flex flex-col transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
