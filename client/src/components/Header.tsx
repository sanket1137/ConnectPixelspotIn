import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logo from "@assets/Untitled design_1761331115867.png";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'agency') return '/agency';
    if (user.role === 'screen_owner') return '/owner';
    return '/advertiser';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0 flex items-center gap-2">
            <img src={logo} alt="Pixelspot" className="h-8 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/advertiser/discover" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Find Screens
            </Link>
            <Link href="/city/bengaluru" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Cities
            </Link>
            <Link href="/about-us" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link href="/contact-us" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href={getDashboardLink()}>
                <Button size="sm" className="rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl font-medium text-gray-700 hover:text-blue-600">
                    Login
                  </Button>
                </Link>
                <Link href="/register?role=advertiser">
                  <Button size="sm" className="rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
