'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useNavigationGuard } from '@/lib/navigation-guard';
import { getLogoutRedirectUrl } from '@/lib/route-guard';
import { ROUTES } from '@/lib/constants';
import type { BaseComponentProps } from '@/types';

interface NavigationProps extends BaseComponentProps {
  variant?: 'default' | 'transparent' | 'solid';
  showLogo?: boolean;
  showUserMenu?: boolean;
}

export function Navigation({ 
  variant = 'default',
  showLogo = true,
  showUserMenu = true,
  className 
}: NavigationProps) {
  const { isLoading, isAuthenticated, session, shouldHideNavigation } = useNavigationGuard();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 路由变化时关闭菜单
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      const logoutUrl = getLogoutRedirectUrl();
      await signOut({ callbackUrl: logoutUrl });
    } catch (error) {
      console.error('Sign out error:', error);
      // 降级处理：直接跳转到首页
      router.push(ROUTES.HOME);
    }
  };

  const getNavVariantClasses = () => {
    const baseClasses = "fixed top-0 left-0 right-0 z-50 transition-all duration-300";
    
    switch (variant) {
      case 'transparent':
        return cn(
          baseClasses,
          isScrolled 
            ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm" 
            : "bg-transparent"
        );
      case 'solid':
        return cn(baseClasses, "bg-white border-b border-gray-200 shadow-sm");
      default:
        return cn(
          baseClasses,
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
            : "bg-white/10 backdrop-blur-md border-b border-white/20"
        );
    }
  };

  const getTextClasses = (isActiveLink = false) => {
    const isLightBg = variant === 'solid' || (variant === 'default' && isScrolled);
    
    if (isActiveLink) {
      return isLightBg ? "text-blue-600" : "text-white";
    }
    
    return isLightBg 
      ? "text-gray-600 hover:text-gray-900" 
      : "text-white/70 hover:text-white";
  };

  const navigationItems = [
    { href: ROUTES.HOME, label: '首页' },
    { href: ROUTES.ABOUT, label: '关于' },
  ];

  const userMenuItems = [
    { href: '/profile', label: '个人资料', icon: 'user' },
    { href: '/settings', label: '设置', icon: 'settings' },
  ];

  // 如果在登录页面，返回 null 但确保所有 hooks 都已调用
  if (shouldHideNavigation) {
    return null;
  }

  return (
    <nav className={cn(getNavVariantClasses(), className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          {showLogo && (
            <Link href={ROUTES.HOME} className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className={cn(
                "font-semibold text-lg transition-colors",
                getTextClasses()
              )}>
                生成站
              </span>
            </Link>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors relative group",
                  getTextClasses(isActive(item.href))
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-current rounded-full"></span>
                )}
              </Link>
            ))}
            
            {isAuthenticated && session && (
              <Link
                href={ROUTES.DASHBOARD}
                className={cn(
                  "text-sm font-medium transition-colors relative group",
                  getTextClasses(isActive(ROUTES.DASHBOARD))
                )}
              >
                仪表盘
                {isActive(ROUTES.DASHBOARD) && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-current rounded-full"></span>
                )}
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50"></div>
            ) : isAuthenticated && session ? (
              showUserMenu && (
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={cn(
                      "flex items-center space-x-2 transition-colors group",
                      getTextClasses()
                    )}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                      {session.user?.image ? (
                        <img 
                          src={session.user.image} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-white text-xs font-medium">
                          {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {session.user?.name || '用户'}
                    </span>
                    <svg 
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isUserMenuOpen && "rotate-180"
                      )} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 animate-slide-in-from-top">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.user?.name || '用户'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                      
                      <div className="py-1">
                        {userMenuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <span className="mr-3">
                              {item.icon === 'user' && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                              {item.icon === 'settings' && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href={ROUTES.LOGIN}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    getTextClasses()
                  )}
                >
                  登录
                </Link>
                <Link
                  href={ROUTES.LOGIN}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  开始使用
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                getTextClasses()
              )}
              aria-label="切换菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-current border-opacity-20 animate-slide-in-from-top">
            <div className="flex flex-col space-y-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors py-2",
                    getTextClasses(isActive(item.href))
                  )}
                >
                  {item.label}
                </Link>
              ))}
              
              {isAuthenticated && session ? (
                <>
                  <Link
                    href={ROUTES.DASHBOARD}
                    className={cn(
                      "text-sm font-medium transition-colors py-2",
                      getTextClasses(isActive(ROUTES.DASHBOARD))
                    )}
                  >
                    仪表盘
                  </Link>
                  
                  <div className="border-t border-current border-opacity-20 pt-4 mt-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                        {session.user?.image ? (
                          <img 
                            src={session.user.image} 
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className={cn("text-sm font-medium", getTextClasses())}>
                          {session.user?.name || '用户'}
                        </p>
                        <p className={cn("text-xs opacity-70", getTextClasses())}>
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                    
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block text-sm font-medium transition-colors py-2",
                          getTextClasses()
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                    
                    <button
                      onClick={handleSignOut}
                      className="block text-left text-sm font-medium text-red-500 hover:text-red-600 transition-colors py-2 mt-2"
                    >
                      退出登录
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-t border-current border-opacity-20 pt-4 mt-4 space-y-4">
                  <Link
                    href={ROUTES.LOGIN}
                    className={cn(
                      "block text-sm font-medium transition-colors py-2",
                      getTextClasses()
                    )}
                  >
                    登录
                  </Link>
                  <Link
                    href={ROUTES.LOGIN}
                    className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm"
                  >
                    开始使用
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}