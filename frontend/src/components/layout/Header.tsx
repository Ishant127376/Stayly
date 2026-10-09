"use client";

import { Globe2, Heart } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SearchBar } from "@/components/search/SearchBar";
import { getCurrentUser, logout } from "@/lib/api";
import type { SearchFilters, User } from "@/types/listing";

type HeaderProps = {
  filters: SearchFilters;
  onSearch: SearchBarProps["onSearch"];
};

type SearchBarProps = ComponentProps<typeof SearchBar>;

export function Header({ filters, onSearch }: HeaderProps) {
  const router = useRouter();
  const pathname = "/";
  const [user, setUser] = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => undefined);
  }, []);

  const loginHref = "/login";

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    setAuthError("");
    try {
      await logout();
      setUser(null);
      router.replace("/");
      router.refresh();
    } catch {
      setAuthError("We could not sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Stayly home">
          <span className="brand-mark">S</span>
          <span>stayly</span>
        </Link>
        <div className="header-search"><SearchBar filters={filters} onSearch={onSearch} compact /></div>
        <nav className="header-actions" aria-label="Primary navigation">
          <HeaderLinks user={user} loginHref={loginHref} />
          <button className="icon-button" type="button" aria-label="Choose language"><Globe2 size={19} /></button>
          {user ? <div className="account-controls"><span className="account-name">{user.name}</span><button className="signout-button" type="button" onClick={handleLogout} disabled={signingOut}>{signingOut ? "Signing out…" : "Log out"}</button></div> : <div className="account-controls account-controls--signed-out"><Link href={loginHref}>Log in</Link><Link className="signup-link" href={`/signup?next=${encodeURIComponent(pathname || "/")}`}>Sign up</Link></div>}
        </nav>
      </div>
      <div className="mobile-search"><SearchBar filters={filters} onSearch={onSearch} /></div>
      <nav className="mobile-links" aria-label="Mobile navigation">
        <HeaderLinks user={user} loginHref={loginHref} />
        {user ? <button className="signout-button" type="button" onClick={handleLogout} disabled={signingOut}>{signingOut ? "Signing out…" : "Log out"}</button> : <Link className="signup-link" href={`/signup?next=${encodeURIComponent(pathname || "/")}`}>Sign up</Link>}
      </nav>
      {authError && <p className="header-auth-error" role="status">{authError}</p>}
    </header>
  );
}

function HeaderLinks({ user, loginHref }: { user: User | null; loginHref: string }) {
  return <div className="header-links">
    <Link href="/wishlist">Wishlist</Link>
    <Link href="/trips">Trips</Link>
    {user && ["host", "both"].includes(user.role) ? <Link href="/host">Host space</Link> : <Link href="/host">Become a host</Link>}
    {!user && <Link className="mobile-login-link" href={loginHref}>Log in</Link>}
  </div>;
}

export function WishlistIcon({ active = false }: { active?: boolean }) {
  return <Heart size={20} fill={active ? "currentColor" : "none"} strokeWidth={active ? 2.4 : 1.9} />;
}
