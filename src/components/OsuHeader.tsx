import { useNavigate, useLocation } from 'react-router-dom';

const OsuHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/', label: 'Home' },
    { path: '/rankings', label: 'Rankings' },
    { path: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-[0_2px_10px_hsl(var(--primary)/0.35)]">
      <div className="flex items-center justify-between px-8 h-14">
        <span className="font-heading text-xl font-bold text-primary-foreground tracking-wide">
          osu! better rankings
        </span>
        <nav className="flex gap-6">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`text-sm font-semibold pb-0.5 border-b-2 transition-colors cursor-pointer ${
                location.pathname === link.path
                  ? 'text-primary-foreground border-primary-foreground'
                  : 'text-primary-foreground/80 border-transparent hover:text-primary-foreground hover:border-primary-foreground'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default OsuHeader;
