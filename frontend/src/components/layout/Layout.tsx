import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';

/**
 * Root layout component that wires together:
 * - Fixed corner logo (top-left, consistent across all pages)
 * - Responsive header with navigation
 * - Page outlet for routing
 * - Footer with contact info and social links
 *
 * This ensures consistent branding and layout across all pages
 */
export const Layout = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          min-h-screen bg-dental-50
          ${className}
        `}
        {...props}
      >
        <header>
          <Header />
        </header>

        <main className="pt-16">
          <Outlet />
        </main>

        <footer>
          <Footer />
        </footer>
      </div>
    );
  }
);

Layout.displayName = 'Layout';